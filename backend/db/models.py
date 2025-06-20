from datetime import date, datetime
from sqlmodel import SQLModel

class ProductCreate(SQLModel):
    product_name: str 
    price: float 
    stock: int 
    gram_weight: int
    image_data: str

class ProductResponse(SQLModel):
    id: int 
    product_name: str 
    price: float 
    stock: int 
    gram_weight: int
    image_data: str

class FeatureCreate(SQLModel):
    product_id: int 
    fruity: int
    floral: int
    astringency: int
    sweetness: int 
    refreshing: int
    aromatic: int
    rich: int
    smoky: int
    creamy: int


class FeatureResponse(SQLModel):
    id: int 
    product_id: int 
    fruity: int
    floral: int
    astringency: int
    sweetness: int 
    refreshing: int
    aromatic: int
    rich: int
    smoky: int
    creamy: int


# user
class UserBase(SQLModel):
    email: str
    username: str


class UserCreate(UserBase):
    password: str
    

class User(UserBase):
    id: int
    is_active: bool
    hashed_password: str

    class Config:
        orm_mode = True

# カード情報
class CardInfo(SQLModel):
    user_id: int
    card_number: str
    card_holder_name: str
    card_expiry_month: int
    card_expiry_year: int
    card_cvv: str


class CardInfoCreate(SQLModel):
    card_number: str
    card_holder_name: str
    card_expiry_month: int
    card_expiry_year: int
    card_cvv: str

class CardInfoUpdate(SQLModel):
    card_number: str | None = None
    card_holder_name: str | None = None
    card_expiry_month: int | None = None
    card_expiry_year: int | None = None
    card_cvv: str | None = None


# マスクされたカード情報（セキュリティのため）
class CardInfoResponse(SQLModel):
    card_holder_name: str
    card_number_masked: str  # **** **** **** 1234
    card_expiry_month: int
    card_expiry_year: int

class Token(SQLModel):
    access_token: str
    token_type: str


class TokenData(SQLModel):
    username: str | None = None


# Purchase関連のモデル
class PurchaseCreate(SQLModel):
    product_id: int
    quantity: int = 1


class PurchaseWithPayment(SQLModel):
    product_id: int
    quantity: int = 1
    # 支払い情報
    use_saved_card: bool = True
    card_info: CardInfoCreate | None = None  # 新しいカードを使用する場合


class PurchaseResponse(SQLModel):
    id: int
    user_id: int
    product_id: int
    quantity: int
    purchase_price: float
    purchase_date: datetime
    payment_status: str
    transaction_id: str | None = None
    
    # 商品情報を含む
    product_name: str | None = None
    
class PurchaseWithProduct(SQLModel):
    id: int
    user_id: int
    product_id: int
    quantity: int
    purchase_price: float
    purchase_date: datetime
    payment_status: str
    product: ProductResponse