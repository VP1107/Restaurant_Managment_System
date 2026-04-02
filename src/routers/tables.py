from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from src.db import get_async_session
from src.models import User, UserRole
from src.services import required_role
from src.schemas import UserRead, UserUpdate

router = APIRouter(prefix="/tables", tags=["tables"])