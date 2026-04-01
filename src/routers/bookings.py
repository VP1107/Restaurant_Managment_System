from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta

from src.db import get_async_session
from src.models import Booking, BookingStatus, User, UserRole
from src.services import required_role
from src.schemas import BookingRead, BookingStatusUpdate, BookingCreate

router = APIRouter(prefix="/bookings", tags=["bookings"])

@router.get("/all", response_model=list[BookingRead])
async def read_bookings(db:AsyncSession = Depends(get_async_session), user: User = Depends(required_role(required_roles=[UserRole.ADMIN, UserRole.OWNER]))):
    result = await db.execute(select(Booking))
    bookings_db = result.scalars().all()
    return bookings_db

@router.get("/my-booking", response_model=BookingRead)
async def read_my_booking(db:AsyncSession = Depends(get_async_session), user: User = Depends(required_role(required_roles=[UserRole.USER, UserRole.ADMIN, UserRole.OWNER]))):
    result = await db.execute(
    select(Booking).filter(
        Booking.user_id == user.id,
        Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED])
        )
    )
    booking_db = result.scalar_one_or_none()
    if not booking_db:
        raise HTTPException(status_code=404, detail="No active booking found")    
    return booking_db

@router.post("/create", response_model=BookingRead)
async def create_booking( booking: BookingCreate ,db:AsyncSession = Depends(get_async_session), user: User = Depends(required_role(required_roles=[UserRole.USER, UserRole.ADMIN, UserRole.OWNER]))):
    # This check was removed but should still exist
    result = await db.execute(
        select(Booking).filter(
            Booking.user_id == user.id,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED])
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="User already has an active booking")

    new_booking = Booking(
        user_id=user.id,
        start_time=booking.start_time,
        end_time=booking.start_time + timedelta(hours=1),
        status=BookingStatus.PENDING
    )
    db.add(new_booking)
    await db.flush()

    result = await db.execute(
        select(Booking).where(
        Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        Booking.start_time < new_booking.end_time,
        Booking.end_time > new_booking.start_time,
        Booking.id != new_booking.id
        )
    )
    conflict = result.scalar_one_or_none()
    if conflict:
        raise HTTPException(status_code=400, detail="Booking conflicts with an existing booking")
    
    await db.commit()
    await db.refresh(new_booking)
    return new_booking

@router.patch("/cancel", response_model=BookingRead)
async def cancel_booking(db: AsyncSession = Depends(get_async_session), user: User = Depends(required_role(required_roles=[UserRole.USER, UserRole.ADMIN, UserRole.OWNER]))):
    result = await db.execute(
        select(Booking).filter(
            Booking.user_id == user.id,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED])
        )
    )
    booking_db = result.scalar_one_or_none()
    if not booking_db:
        raise HTTPException(status_code=404, detail="No active booking found")
    
    booking_db.status = BookingStatus.CANCELLED
    await db.commit()
    await db.refresh(booking_db)
    return booking_db

@router.patch("/", response_model=BookingRead)
async def update_booking(booking: BookingStatusUpdate, db:AsyncSession = Depends(get_async_session), user: User = Depends(required_role(required_roles=[UserRole.ADMIN, UserRole.OWNER]))):
    result = await db.execute(select(Booking).where(Booking.id == booking.id))
    booking_db = result.scalar_one_or_none()
    if not booking_db:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    valid_transitions = {
        BookingStatus.PENDING: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
        BookingStatus.CONFIRMED: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
        BookingStatus.COMPLETED: [],   # terminal state
        BookingStatus.CANCELLED: [],   # terminal state
    }

    if booking.status not in valid_transitions[booking_db.status]:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot transition from {booking_db.status} to {booking.status}"
        )
    
    booking_db.status = booking.status
    await db.commit()
    await db.refresh(booking_db)
    return booking_db
