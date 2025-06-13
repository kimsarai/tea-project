from fastapi import FastAPI
from routers import items, users
from db.database import  create_and_alter_db


app = FastAPI(root_path="/api")

@app.on_event("startup")
def on_startup():
    create_and_alter_db()


app.include_router(items.router)
app.include_router(users.router)
