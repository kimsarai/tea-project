from fastapi import FastAPI
from routers import items, users
from db.database import  create_and_alter_db
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost",
    "http://localhost:3000",  # React/Vueなどがこのポートで動いている場合
]


app = FastAPI(root_path="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # ["*"] で全許可も可能（開発用）
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_and_alter_db()


app.include_router(items.router)
app.include_router(users.router)
