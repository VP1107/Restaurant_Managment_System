import enum

from sqlalchemy import Boolean, Column, Integer, DateTime, ForeignKey, Uuid, Enum
from sqlalchemy.orm import DeclarativeBase, relationship
from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from datetime import datetime, timedelta

class Base(DeclarativeBase):
    pass

class UserRole(enum.Enum):
    ADMIN = "admin"
    USER = "user"
    OWNER = "owner"

class BookingStatus(enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class User(Base, SQLAlchemyBaseUserTableUUID):
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    
    bookings = relationship("Booking", back_populates="user", foreign_keys="Booking.user_id")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Uuid, ForeignKey("user.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.PENDING, nullable=False)

    user = relationship("User", back_populates="bookings", foreign_keys=[user_id])