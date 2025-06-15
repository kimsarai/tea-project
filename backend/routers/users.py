from datetime import datetime, timedelta, timezone
from typing import Union, List
from sqlalchemy.orm import joinedload
import uuid

import jwt
from fastapi import Depends, FastAPI, HTTPException, status, APIRouter
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlmodel import Session, select
import base64

from db.database import get_session
from db.models import (
    UserCreate, UserBase, User, Token, TokenData, 
    PurchaseCreate, PurchaseResponse, PurchaseWithProduct, PurchaseWithPayment,
    CardInfoCreate, CardInfoUpdate, CardInfoResponse,
)
from db.schema import User, Purchase, Product, CardInfo

# to get a string like this run:
# openssl rand -hex 32
SECRET_KEY = "89f3499f9ef4f4621f53bbe53ffc8c32d49feae2aba9eb4ac6c68d56ce650082"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI()
router = APIRouter()


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def get_user(db, username: str):
    statement = select(User).where(User.username == username)
    result = db.exec(statement)
    return result.first()


def authenticate_user(db, username: str, password: str):
    user = get_user(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except InvalidTokenError:
        raise credentials_exception
    user = get_user(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def mask_card_number(card_number: str) -> str:
    """カード番号をマスクする"""
    if len(card_number) < 4:
        return "****"
    return "**** **** **** " + card_number[-4:]


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_session)
) -> Token:
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")


@router.get("/users/me/", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.post("/users/me/card/", response_model=CardInfoResponse)
async def create_card_info(
    card_data: CardInfoCreate,  
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    card = CardInfo(
        user_id = current_user.id,
        **card_data.dict()
    )
    
    db.add(card)
    db.commit()
    db.refresh(card)

    card_number_masked = f"{card.card_number[:4]} {'*' * 4} {'*' * 4} {card.card_number[-4:]}"

    ## card_numberをマスクした情報をresponseに送る
    return CardInfoResponse(
        card_holder_name=card.card_holder_name,
        card_number_masked=card_number_masked,
        card_expiry_month=card.card_expiry_month,
        card_expiry_year=card.card_expiry_year
    )


# 購入履歴を取得するエンドポイント（詳細な商品情報付き）

@router.get("/users/me/purchases/", response_model=List[PurchaseWithProduct])
async def read_user_purchases(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    # Purchaseモデルにproductのrelationshipが定義されている場合
    statement = (
        select(Purchase)
        .options(joinedload(Purchase.product))  # eager loading
        .where(Purchase.user_id == current_user.id)
        .order_by(Purchase.purchase_date.desc())
    )
    
    purchases = db.exec(statement).all()
    
    return purchases


# 商品購入エンドポイント（カード情報込み）
@router.post("/users/me/purchase/", response_model=PurchaseResponse)
async def purchase_product(
    purchase_data: PurchaseCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
) -> PurchaseResponse:
    # 商品の存在確認と在庫確認
    product = db.exec(select(Product).where(Product.id == purchase_data.product_id)).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product.stock < purchase_data.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
    # カード情報の確認
    if not db.exec(select(CardInfo).where(CardInfo.user_id == current_user.id)).first():
        raise HTTPException(status_code=400, detail="Please register your card information first")
    
    # Purchase作成
    purchase = Purchase(
        user_id=current_user.id,
        product_id=purchase_data.product_id,
        quantity=purchase_data.quantity,
        purchase_price=product.price * purchase_data.quantity,
        payment_status="completed",
        transaction_id=str(uuid.uuid4())
    )
    
    # 在庫更新
    product.stock -= purchase_data.quantity
    
    # 保存
    db.add(purchase)
    db.commit()
    db.refresh(purchase)
    
    # レスポンス作成
    response = PurchaseResponse.from_orm(purchase)
    response.product_name = product.product_name
    
    return response

@router.post("/users/", response_model=User)
async def create_user(user: UserCreate, db: Session = Depends(get_session)):
    # ユーザが既に存在するか確認
    existing_user = get_user(db, user.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # パスワードをハッシュ化
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user