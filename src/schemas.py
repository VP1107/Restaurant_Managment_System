from fastapi_users import schemas
from pydantic import BaseModel, ConfigDict, Field
import uuid
from datetime import datetime

from src.models import UserRole, BookingStatus, TableType

# Schemas for User
class UserRead(schemas.BaseUser[uuid.UUID]):
    role: UserRole

class UserCreate(schemas.BaseUserCreate):
    pass

class UserUpdate(schemas.BaseUserUpdate):
    role: UserRole | None = None


# Schemas for Restaurants
class RestaurantRead(BaseModel):
    id: int
    name: str
    location: str
    opening_time: datetime
    closing_time: datetime
    admin_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)

class RestaurantCreate(BaseModel):
    name: str
    location: str
    opening_time: datetime
    closing_time: datetime
    admin_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)

class RestaurantUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    opening_time: datetime | None = None
    closing_time: datetime | None = None
    admin_id: uuid.UUID | None = None

    model_config = ConfigDict(from_attributes=True)


# Schemas for Tables
class TableRead(BaseModel):
    id: int
    restaurant_id: int
    capacity: TableType
    same_type_tables: int

    model_config = ConfigDict(from_attributes=True)

class TableCreate(BaseModel):
    restaurant_id: int
    capacity: TableType

    model_config = ConfigDict(from_attributes=True)


# Schemas for Booking
class BookingRead(BaseModel):
    id: int
    user_id: uuid.UUID
    table_type: TableType
    restaurant_id: int
    start_time: datetime
    end_time: datetime
    status: BookingStatus

    model_config = ConfigDict(from_attributes=True)

class BookingCreate(BaseModel):
    start_time: datetime
    table_type: TableType
    restaurant_id: int

    model_config = ConfigDict(from_attributes=True)

class BookingUpdate(BaseModel): 
    start_time: datetime | None = None
    table_type: TableType | None = None

    model_config = ConfigDict(from_attributes=True)

class BookingStatusUpdate(BaseModel):
    id: int
    status: BookingStatus

    model_config = ConfigDict(from_attributes=True)


