from fastapi import FastAPI, Depends, HTTPException, APIRouter, File, UploadFile, Form
from sqlmodel import Session, select

from db.database import get_session
from db.models import ProductCreate, ProductResponse, FeatureCreate, FeatureResponse 
from db.schema import Product, Feature
import base64

router = APIRouter()

@router.get("/product", response_model=list[ProductResponse])
async def read_product(
    session: Session = Depends(get_session), 
    # offset: int = 0, limit: int = 10
):
    statement = select(Product)#.offset(offset).limit(limit)
    return session.exec(statement)

@router.post("/product", response_model=ProductResponse)
async def create_product(
    product_create: ProductCreate = Depends(),
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
) -> ProductResponse:
    file_data = await file.read()
    encoded_image_data = base64.b64encode(file_data).decode('utf-8')
    
    product_create.image_data = encoded_image_data
    
    product = Product.from_orm(product_create)
    session.add(product)
    session.commit()
    session.refresh(product)
    return ProductResponse.from_orm(product)
#-------------------------------------------------------------
# @router.get("/feature", response_model=list[FeatureResponse])
# async def read_feature(
#     session: Session = Depends(get_session), 
#     offset: int = 0, limit: int = 10
# ):
#     statement = select(Feature).offset(offset).limit(limit)
#     return session.exec(statement)

@router.get("/feature/{product_id}", response_model=FeatureResponse)
async def get_feature_by_product_id(
    product_id: int,
    session: Session = Depends(get_session)
):
    statement = select(Feature).where(Feature.product_id == product_id)
    feature = session.exec(statement).first()
    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")
    return feature

@router.post("/feature", response_model=FeatureResponse)
def create_Feature(
    feature_create: FeatureCreate,
    session: Session = Depends(get_session)
) -> Feature:
    feature = Feature.from_orm(feature_create)
    session.add(feature)
    session.commit()
    session.refresh(feature)
    return feature