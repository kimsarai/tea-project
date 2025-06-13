from datetime import date
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import String, LargeBinary, Column, Integer, Boolean
import base64

#database 

class User(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    is_active: bool = Field(default=True)


class Product (SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    product_name: str = Field(sa_type=String(100), max_length=100)
    price: float = Field()
    stock: int = Field()
    gram_weight: int = Field()
    image_data: str = Column(None, LargeBinary(length=(2**32)-1), nullable=False)

    feature: list["Feature"] = Relationship(back_populates="product")
    
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


