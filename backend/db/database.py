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
    SQLModel.metadata.create_all(engine)

    with engine.connect() as connection:
        # 1) product.image_dataをLONGBLOBに変更（エラー処理つき）
        try:
            connection.execute(text("ALTER TABLE product MODIFY COLUMN image_data LONGBLOB;"))
            print("product.image_data column modified.")
        except Exception as e:
            print(f"Failed to modify product.image_data: {e}")

        # 2) purchase.payment_statusカラムの存在を確認
        result = connection.execute(text("""
            SELECT COUNT(*) 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'purchase' 
              AND COLUMN_NAME = 'payment_status';
        """))
        count = result.scalar()
        if count == 0:
            # カラムが無ければ追加
            try:
                connection.execute(text(
                    "ALTER TABLE purchase ADD COLUMN payment_status VARCHAR(50) NOT NULL DEFAULT 'pending';"
                ))
                print("purchase.payment_status column added.")
            except Exception as e:
                print(f"Failed to add purchase.payment_status column: {e}")
        else:
            print("purchase.payment_status column already exists.")



