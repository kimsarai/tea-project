from datetime import datetime, timedelta, timezone
from typing import Union, List
import uuid

import jwt
from fastapi import Depends, FastAPI, HTTPException, status, APIRouter, File, UploadFile, Form
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
    UserDetailsCreate, UserDetailsUpdate, UserDetailsResponse,
    CardInfoCreate, CardInfoUpdate, CardInfoResponse,
    UserFullProfile
)
from db.schema import User, Purchase, Product, UserDetails, CardInfo

# to get a string like this run:
# openssl rand -hex 32
SECRET_KEY = "2d11f91e1d8ec9013741042f116d06f58a6e2aef8618dec56b966940aadf7d30"
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


# ユーザーの完全なプロフィール取得
@router.get("/users/me/profile/", response_model=UserFullProfile)
async def get_user_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    # ユーザー詳細情報を取得
    user_details_statement = select(UserDetails).where(UserDetails.user_id == current_user.id)
    user_details = db.exec(user_details_statement).first()
    
    # カード情報を取得
    card_info_statement = select(CardInfo).where(CardInfo.user_id == current_user.id)
    card_info = db.exec(card_info_statement).first()
    
    user_details_response = None
    card_info_response = None
    
    if user_details:
        user_details_response = UserDetailsResponse(
            id=user_details.id,
            user_id=user_details.user_id,
            first_name=user_details.first_name,
            last_name=user_details.last_name,
            phone_number=user_details.phone_number,
            address=user_details.address,
            postal_code=user_details.postal_code,
            city=user_details.city,
            prefecture=user_details.prefecture,
            created_at=user_details.created_at,
            updated_at=user_details.updated_at
        )
    
    if card_info:
        card_info_response = CardInfoResponse(
            card_holder_name=card_info.card_holder_name,
            card_number_masked=mask_card_number(card_info.card_number),
            card_expiry_month=card_info.card_expiry_month,
            card_expiry_year=card_info.card_expiry_year
        )
    
    return UserFullProfile(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        user_details=user_details_response,
        card_info=card_info_response
    )


# ユーザー詳細情報の作成・更新
@router.post("/users/me/details/", response_model=UserDetailsResponse)
async def create_or_update_user_details(
    user_details: UserDetailsCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    # 既存の詳細情報があるか確認
    statement = select(UserDetails).where(UserDetails.user_id == current_user.id)
    existing_details = db.exec(statement).first()
    
    if existing_details:
        # 更新
        existing_details.first_name = user_details.first_name
        existing_details.last_name = user_details.last_name
        existing_details.phone_number = user_details.phone_number
        existing_details.address = user_details.address
        existing_details.postal_code = user_details.postal_code
        existing_details.city = user_details.city
        existing_details.prefecture = user_details.prefecture
        existing_details.updated_at = datetime.utcnow()
        
        db.add(existing_details)
        db.commit()
        db.refresh(existing_details)
        return existing_details
    else:
        # 新規作成
        new_details = UserDetails(
            user_id=current_user.id,
            **user_details.dict()
        )
        db.add(new_details)
        db.commit()
        db.refresh(new_details)
        return new_details


# カード情報の追加・更新
@router.post("/users/me/card/", response_model=CardInfoResponse)
async def create_card_info(
    card_info: CardInfoCreate,  # ← ここを修正
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
) -> CardInfoResponse:
    card = CardInfo(
        user_id=current_user.id,
        card_number=card_info.card_number,
        card_holder_name=card_info.card_holder_name,
        card_expiry_month=card_info.card_expiry_month,
        card_expiry_year=card_info.card_expiry_year,
        card_cvv=card_info.card_cvv
    )

    db.add(card)
    db.commit()
    db.refresh(card)

    return CardInfoResponse(
        card_holder_name=card.card_holder_name,
        card_number_masked=mask_card_number(card.card_number),
        card_expiry_month=card.card_expiry_month,
        card_expiry_year=card.card_expiry_year
    )



# 購入履歴を取得するエンドポイント（詳細な商品情報付き）
@router.get("/users/me/purchases/", response_model=List[PurchaseWithProduct])
async def read_user_purchases(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    # ユーザーの購入履歴を商品情報と一緒に取得
    statement = (
        select(Purchase, Product)
        .join(Product, Purchase.product_id == Product.id)
        .where(Purchase.user_id == current_user.id)
        .order_by(Purchase.purchase_date.desc())
    )
    
    results = db.exec(statement).all()
    
    purchases_with_products = []
    for purchase, product in results:
        purchase_with_product = PurchaseWithProduct(
            id=purchase.id,
            user_id=purchase.user_id,
            product_id=purchase.product_id,
            quantity=purchase.quantity,
            purchase_price=purchase.purchase_price,
            purchase_date=purchase.purchase_date,
            payment_status=purchase.payment_status,
            product={
                "id": product.id,
                "product_name": product.product_name,
                "price": product.price,
                "stock": product.stock,
                "gram_weight": product.gram_weight,
                "image_data": product.image_data
            }
        )
        purchases_with_products.append(purchase_with_product)
    
    return purchases_with_products


# シンプルな購入履歴取得（商品名のみ）
@router.get("/users/me/items/")
async def read_own_items(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    # ユーザーの購入履歴を取得
    statement = (
        select(Purchase, Product.product_name)
        .join(Product, Purchase.product_id == Product.id)
        .where(Purchase.user_id == current_user.id)
    )
    
    results = db.exec(statement).all()
    
    items = []
    for purchase, product_name in results:
        items.append({
            "item_id": purchase.product_id,
            "product_name": product_name,
            "quantity": purchase.quantity,
            "purchase_date": purchase.purchase_date,
            "payment_status": purchase.payment_status,
            "owner": current_user.username
        })
    
    return items


# 商品購入エンドポイント（カード情報込み）
@router.post("/users/me/purchase/", response_model=PurchaseResponse)
async def purchase_product(
    purchase_data: PurchaseWithPayment,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session)
):
    # 商品の存在確認と在庫確認
    statement = select(Product).where(Product.id == purchase_data.product_id)
    product = db.exec(statement).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product.stock < purchase_data.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
    # カード情報の処理
    if purchase_data.use_saved_card:
        # 保存されたカード情報を使用
        card_statement = select(CardInfo).where(CardInfo.user_id == current_user.id)
        card_info = db.exec(card_statement).first()
        
        if not card_info:
            raise HTTPException(status_code=400, detail="No saved card information found")
    else:
        # 新しいカード情報を使用（必要に応じて保存）
        if not purchase_data.card_info:
            raise HTTPException(status_code=400, detail="Card information required")
        
        # カード情報を保存または更新
        card_statement = select(CardInfo).where(CardInfo.user_id == current_user.id)
        existing_card = db.exec(card_statement).first()
        
        if existing_card:
            # 既存のカード情報を更新
            existing_card.card_number = purchase_data.card_info.card_number
            existing_card.card_holder_name = purchase_data.card_info.card_holder_name
            existing_card.card_expiry_month = purchase_data.card_info.card_expiry_month
            existing_card.card_expiry_year = purchase_data.card_info.card_expiry_year
            existing_card.card_cvv = purchase_data.card_info.card_cvv
            existing_card.updated_at = datetime.utcnow()
            db.add(existing_card)
        else:
            # 新しいカード情報を作成
            new_card = CardInfo(
                user_id=current_user.id,
                card_number=purchase_data.card_info.card_number,
                card_holder_name=purchase_data.card_info.card_holder_name,
                card_expiry_month=purchase_data.card_info.card_expiry_month,
                card_expiry_year=purchase_data.card_info.card_expiry_year,
                card_cvv=purchase_data.card_info.card_cvv
            )
            db.add(new_card)
    
    # ここで実際の決済処理を行う（外部決済サービスとの連携など）
    # 今回はシミュレーション
    transaction_id = str(uuid.uuid4())
    payment_status = "completed"  # 実際の決済結果に基づく
    
    # 購入記録を作成
    purchase = Purchase(
        user_id=current_user.id,
        product_id=purchase_data.product_id,
        quantity=purchase_data.quantity,
        purchase_price=product.price,  # 購入時の価格を記録
        purchase_date=datetime.utcnow(),
        payment_status=payment_status,
        transaction_id=transaction_id
    )
    
    # 在庫を減らす
    product.stock -= purchase_data.quantity
    
    # データベースに保存
    db.add(purchase)
    db.add(product)  # 在庫更新のため
    db.commit()
    db.refresh(purchase)
    
    return PurchaseResponse(
        id=purchase.id,
        user_id=purchase.user_id,
        product_id=purchase.product_id,
        quantity=purchase.quantity,
        purchase_price=purchase.purchase_price,
        purchase_date=purchase.purchase_date,
        payment_status=purchase.payment_status,
        transaction_id=purchase.transaction_id,
        product_name=product.product_name
    )


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