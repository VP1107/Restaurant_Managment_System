from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from src.db import get_async_session
from src.models import User, UserRole, Restaurant
from src.services import required_role
from src.schemas import UserRead, UserUpdate


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def read_current_user(db:AsyncSession = Depends(get_async_session), 
    current_user: User = Depends(required_role(required_roles=[UserRole.USER, UserRole.OWNER, UserRole.ADMIN]))):

    return current_user

@router.get("/all", response_model=list[UserRead])
async def read_users(db:AsyncSession = Depends(get_async_session), 
    user: User = Depends(required_role(required_roles=[UserRole.OWNER]))
    ):
    
    result = await db.execute(select(User))
    user_db = result.scalars().all()
    return user_db

@router.get("/{user_id}", response_model=UserRead)
async def read_user(user_id: uuid.UUID, 
    db:AsyncSession = Depends(get_async_session), 
    user: User = Depends(required_role(required_roles=[UserRole.OWNER]))
    ):
    
    result = await db.execute(select(User).filter(User.id == user_id))
    user_db = result.scalar_one_or_none()
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")
    return user_db


@router.patch("/change-role/{user_id}", response_model=UserRead)
async def change_user_role(user_id: uuid.UUID, 
    user_update: UserUpdate, db:AsyncSession = Depends(get_async_session), 
    user: User = Depends(required_role(required_roles=[UserRole.OWNER]))
    ):
    
    result = await db.execute(select(User).filter(User.id == user_id))
    user_db = result.scalar_one_or_none()
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")
    if user_db.role == UserRole.OWNER:
        raise HTTPException(status_code=400, detail="Cannot change the role of an owner")
    
    if user_update.role is not None:
        user_db.role = user_update.role
    db.add(user_db)
    await db.commit()
    await db.refresh(user_db)
    return user_db

@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(required_role(required_roles=[UserRole.OWNER]))
    ):
    
    result = await db.execute(select(User).where(User.id == user_id))
    user_db = result.scalar_one_or_none()
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")
    if user_db.role == UserRole.OWNER:
        raise HTTPException(status_code=400, detail="Cannot delete an owner")
        
    restaurant_check = await db.execute(select(Restaurant).where(Restaurant.admin_id == user_id))
    if restaurant_check.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Cannot delete an admin user who is currently managing a restaurant")
        
    await db.delete(user_db)
    await db.commit()