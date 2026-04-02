from fastapi import FastAPI,Depends
from contextlib import asynccontextmanager

from src.models import UserRole
from src.routers import users, bookings, restaurants, tables
from src.schemas import UserCreate, UserRead
from src.db import create_db_and_tables
from src.auth import auth_backend, fastapi_users
from src.services import required_role

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    yield


app = FastAPI(lifespan=lifespan)

app.include_router(users.router)
app.include_router(bookings.router)
app.include_router(restaurants.router)
app.include_router(tables.router)

app.include_router(fastapi_users.get_auth_router(auth_backend), prefix="/auth/jwt", tags=["auth"])
app.include_router(fastapi_users.get_register_router(UserRead, UserCreate), prefix="/auth", tags=["auth"])
app.include_router(fastapi_users.get_reset_password_router(), dependencies=[Depends(required_role(required_roles=[UserRole.USER, UserRole.OWNER, UserRole.ADMIN]))], prefix="/auth", tags=["auth"])
app.include_router(fastapi_users.get_verify_router(UserRead), prefix="/auth", tags=["auth"])