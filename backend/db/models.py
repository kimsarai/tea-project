from datetime import date
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
    sweetness: int 
    bitterness: int 
    fruity: int 
    tannic: int 
    acidity: int 
    richness: int 
    
    floral: int

    region: str 
    process: str 

class FeatureResponse(SQLModel):
    id: int 
    product_id: int 
    sweetness: int 
    bitterness: int 
    fruity: int 
    tannic: int 
    acidity: int 
    richness: int 


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


class Token(SQLModel):
    access_token: str
    token_type: str


class TokenData(SQLModel):
    username: str | None = None
