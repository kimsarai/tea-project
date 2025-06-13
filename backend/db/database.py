from sqlmodel import create_engine, Session, SQLModel
from sqlalchemy import text
import os

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL, echo=True)

def get_session():
    with Session(engine) as session:
        yield session

# def create_db():
#     SQLModel.metadata.create_all(engine)

def create_and_alter_db():
    # テーブル作成
    SQLModel.metadata.create_all(engine)
    
    # ALTER TABLEの実行
    with engine.connect() as connection:
        alter_command = "ALTER TABLE product MODIFY COLUMN image_data LONGBLOB;"
        connection.execute(text(alter_command))
        print("Column modified successfully.")


