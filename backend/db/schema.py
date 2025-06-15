from datetime import date, datetime
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import String, LargeBinary, Column, Integer, Boolean, DateTime
import base64

#database 

class User(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    is_active: bool = Field(default=True)
    
    # 購入履歴との関係
    purchases: list["Purchase"] = Relationship(back_populates="user")
    # カード情報との関係
    card_info: "CardInfo" = Relationship(back_populates="user")



class CardInfo(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    
    # カード情報（実際の実装では暗号化して保存することを強く推奨）
    card_number: str = Field()  # 実際の実装では暗号化必須
    card_holder_name: str = Field()
    card_expiry_month: int = Field()
    card_expiry_year: int = Field()
    card_cvv: str = Field()  # 実際の実装では暗号化必須
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # リレーションシップ
    user: User = Relationship(back_populates="card_info")


class Product (SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    product_name: str = Field(sa_type=String(100), max_length=100)
    price: float = Field()
    stock: int = Field()
    gram_weight: int = Field()
    image_data: str = Column(None, LargeBinary(length=(2**32)-1), nullable=False)

    feature: list["Feature"] = Relationship(back_populates="product")
    # 購入履歴との関係
    purchases: list["Purchase"] = Relationship(back_populates="product")
    
class Feature (SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    product_id: int = Field(default=None, foreign_key="product.id")
    product: Product | None = Relationship(back_populates="feature")
    
    fruity: int = Field()
    floral: int = Field()
    astringency: int = Field()
    sweetness: int = Field()
    refreshing: int = Field()
    aromatic: int = Field()
    rich: int = Field()
    smoky: int = Field()
    creamy: int = Field()


class Purchase(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    product_id: int = Field(foreign_key="product.id")
    quantity: int = Field(default=1)
    purchase_price: float = Field()  # 購入時の価格を記録
    purchase_date: datetime = Field(default_factory=datetime.utcnow)
    
    # 支払い情報
    payment_status: str = Field(default="pending")  # pending, completed, failed
    transaction_id: str | None = Field(default=None)
    
    # リレーションシップ
    user: User = Relationship(back_populates="purchases")
    product: Product = Relationship(back_populates="purchases")