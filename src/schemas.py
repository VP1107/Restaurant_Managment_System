from fastapi_users import schemas
from pydantic import BaseModel, ConfigDict, Field
import uuid
from datetime import datetime

from src.models import UserRole, BookingStatus

class UserRead(schemas.BaseUser[uuid.UUID]):
    role: UserRole

class UserCreate(schemas.BaseUserCreate):
    pass

class UserUpdate(schemas.BaseUserUpdate):
    role: UserRole | None = None

class BookingCreate(BaseModel):
    start_time: datetime

    model_config = ConfigDict(from_attributes=True)

class BookingUpdate(BaseModel): 
    start_time: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

class BookingStatusUpdate(BaseModel):
    id: int
    status: BookingStatus

    model_config = ConfigDict(from_attributes=True)

class BookingRead(BaseModel):
    id: int
    user_id: uuid.UUID
    start_time: datetime
    end_time: datetime
    status: BookingStatus

    model_config = ConfigDict(from_attributes=True)