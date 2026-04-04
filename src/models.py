import enum

from sqlalchemy import Column, Integer, Time, ForeignKey, String, Uuid, Enum
from sqlalchemy.orm import DeclarativeBase, relationship
from fastapi_users.db import SQLAlchemyBaseUserTableUUID


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

class TableType(enum.Enum):
    TWO_SEATER = 2
    FOUR_SEATER = 4
    SIX_SEATER = 6


# Table Models
class User(Base, SQLAlchemyBaseUserTableUUID):
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    
    bookings = relationship("Booking", back_populates="user", foreign_keys="Booking.user_id", cascade="all, delete-orphan")
    restaurants = relationship("Restaurant", back_populates="admin", foreign_keys="Restaurant.admin_id")


class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    opening_time = Column(Time, nullable=False)
    closing_time = Column(Time, nullable=False)
    admin_id = Column(Uuid, ForeignKey("user.id"), nullable=True)

    admin = relationship("User", back_populates="restaurants", foreign_keys=[admin_id])
    tables = relationship("Table", back_populates="restaurant", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="restaurant", cascade="all, delete-orphan")


class Table(Base):
    __tablename__ = "tables"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    capacity = Column(Enum(TableType), nullable=False)
    same_type_tables = Column(Integer, default=0)

    restaurant = relationship("Restaurant", back_populates="tables", foreign_keys=[restaurant_id])


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Uuid, ForeignKey("user.id"), nullable=False)
    table_type = Column(Enum(TableType), nullable=False)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.PENDING, nullable=False)

    user = relationship("User", back_populates="bookings", foreign_keys=[user_id])
    restaurant = relationship("Restaurant", back_populates="bookings", foreign_keys=[restaurant_id])