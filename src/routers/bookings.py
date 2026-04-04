from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, timezone

from src.db import get_async_session
from src.models import Booking, BookingStatus, Restaurant, User, UserRole, Table
from src.services import required_role
from src.schemas import BookingRead, BookingStatusUpdate, BookingCreate

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _now_utc() -> datetime:
    """Return the current time as a timezone-naive UTC datetime.

    SQLite stores datetimes without timezone info, so we keep everything
    timezone-naive UTC internally and only deal with timezones at the
    API boundary (in the schema validator).
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _to_naive_utc(dt: datetime) -> datetime:
    """Strip tzinfo from a datetime that has already been normalised to UTC
    by the Pydantic schema validator.  Safe because the validator guarantees
    the value is UTC before it reaches the router.
    """
    return dt.replace(tzinfo=None)


@router.get("/all", response_model=list[BookingRead])
async def read_bookings(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(required_role(required_roles=[UserRole.ADMIN, UserRole.OWNER])),
):
    # OWNER sees all bookings; ADMIN only sees bookings for their restaurant.
    if user.role == UserRole.OWNER:
        result = await db.execute(select(Booking))
    else:
        result = await db.execute(
            select(Booking)
            .join(Restaurant, Booking.restaurant_id == Restaurant.id)
            .where(Restaurant.admin_id == user.id)
        )
    return result.scalars().all()


@router.get("/my-booking", response_model=BookingRead)
async def read_my_booking(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(
        required_role(required_roles=[UserRole.USER, UserRole.ADMIN, UserRole.OWNER])
    ),
):
    result = await db.execute(
        select(Booking).filter(
            Booking.user_id == user.id,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        )
    )
    booking_db = result.scalar_one_or_none()
    if not booking_db:
        raise HTTPException(status_code=404, detail="No active booking found")
    return booking_db


@router.post("/create", response_model=BookingRead)
async def create_booking(
    booking: BookingCreate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(
        required_role(required_roles=[UserRole.USER, UserRole.ADMIN, UserRole.OWNER])
    ),
):

    start_time = _to_naive_utc(booking.start_time)
    end_time = start_time + timedelta(hours=1)

    if start_time <= _now_utc():
        raise HTTPException(
            status_code=400,
            detail="Booking start time must be in the future.",
        )

    result = await db.execute(
        select(Booking).filter(
            Booking.user_id == user.id,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400, detail="User already has an active booking."
        )

    result = await db.execute(
        select(Restaurant).where(Restaurant.id == booking.restaurant_id)
    )
    restaurant = result.scalar_one_or_none()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found.")


    booking_start_time = start_time.time()
    booking_end_time = end_time.time()

    if booking_start_time < restaurant.opening_time:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Booking start time {booking_start_time.strftime('%H:%M')} is before "
                f"restaurant opening time {restaurant.opening_time.strftime('%H:%M')}."
            ),
        )
    if booking_end_time > restaurant.closing_time:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Booking end time {booking_end_time.strftime('%H:%M')} is after "
                f"restaurant closing time {restaurant.closing_time.strftime('%H:%M')}."
            ),
        )

    result = await db.execute(
        select(Table).where(
            Table.capacity == booking.table_type,
            Table.restaurant_id == booking.restaurant_id,
        ).limit(1)
    )
    table = result.scalar_one_or_none()
    if not table:
        raise HTTPException(
            status_code=400,
            detail="No table available for the requested capacity.",
        )

    total_capacity = table.same_type_tables

    result = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.restaurant_id == booking.restaurant_id,
            Booking.table_type == booking.table_type,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
            Booking.start_time < end_time,
            Booking.end_time > start_time,
        )
    )
    overlapping_count = result.scalar()

    if overlapping_count >= total_capacity:
        raise HTTPException(
            status_code=400,
            detail=(
                "No tables of the requested type are available at "
                f"{start_time.strftime('%Y-%m-%d %H:%M')} UTC."
            ),
        )

    new_booking = Booking(
        user_id=user.id,
        restaurant_id=booking.restaurant_id,
        table_type=booking.table_type,
        start_time=start_time,
        end_time=end_time,
        status=BookingStatus.PENDING,
    )
    db.add(new_booking)
    await db.commit()
    await db.refresh(new_booking)
    return new_booking


@router.post("/check-capacity")
async def check_capacity(
    booking: BookingCreate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(
        required_role(required_roles=[UserRole.USER, UserRole.ADMIN, UserRole.OWNER])
    ),
):
    start_time = _to_naive_utc(booking.start_time)
    end_time = start_time + timedelta(hours=1)

    if start_time <= _now_utc():
        return {
            "available": False,
            "reason": "Booking start time must be in the future.",
            "remaining_tables": 0,
        }

    result = await db.execute(
        select(Restaurant).where(Restaurant.id == booking.restaurant_id)
    )
    restaurant = result.scalar_one_or_none()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found.")

    if (
        start_time.time() < restaurant.opening_time
        or end_time.time() > restaurant.closing_time
    ):
        return {
            "available": False,
            "reason": "Restaurant is closed during the requested time.",
            "remaining_tables": 0,
        }

    result = await db.execute(
        select(Table).where(
            Table.capacity == booking.table_type,
            Table.restaurant_id == booking.restaurant_id,
        ).limit(1)
    )
    table = result.scalar_one_or_none()
    if not table:
        return {
            "available": False,
            "reason": "No table available for the requested capacity.",
            "remaining_tables": 0,
        }

    total_capacity = table.same_type_tables

    result = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.restaurant_id == booking.restaurant_id,
            Booking.table_type == booking.table_type,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
            Booking.start_time < end_time,
            Booking.end_time > start_time,
        )
    )
    overlapping_count = result.scalar()

    if overlapping_count >= total_capacity:
        return {
            "available": False,
            "reason": (
                "No tables of the requested type are available at "
                f"{start_time.strftime('%Y-%m-%d %H:%M')} UTC."
            ),
            "remaining_tables": 0,
        }

    return {
        "available": True,
        "reason": "Capacity available.",
        "remaining_tables": total_capacity - overlapping_count,
    }


@router.patch("/cancel", response_model=BookingRead)
async def cancel_booking(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(
        required_role(required_roles=[UserRole.USER, UserRole.ADMIN, UserRole.OWNER])
    ),
):
    result = await db.execute(
        select(Booking).filter(
            Booking.user_id == user.id,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        )
    )
    booking_db = result.scalar_one_or_none()
    if not booking_db:
        raise HTTPException(status_code=404, detail="No active booking found.")

    booking_db.status = BookingStatus.CANCELLED
    await db.commit()
    await db.refresh(booking_db)
    return booking_db


@router.patch("/", response_model=BookingRead)
async def update_booking(
    booking: BookingStatusUpdate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(
        required_role(required_roles=[UserRole.ADMIN, UserRole.OWNER])
    ),
):
    result = await db.execute(select(Booking).where(Booking.id == booking.id))
    booking_db = result.scalar_one_or_none()
    if not booking_db:
        raise HTTPException(status_code=404, detail="Booking not found.")

    if user.role == UserRole.ADMIN:
        restaurant_res = await db.execute(
            select(Restaurant).where(Restaurant.id == booking_db.restaurant_id)
        )
        restaurant = restaurant_res.scalar_one_or_none()
        if not restaurant or restaurant.admin_id != user.id:
            raise HTTPException(
                status_code=403, detail="Not authorized to update this booking."
            )

    valid_transitions = {
        BookingStatus.PENDING: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
        BookingStatus.CONFIRMED: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
        BookingStatus.COMPLETED: [],
        BookingStatus.CANCELLED: [],
    }

    if booking.status not in valid_transitions[booking_db.status]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {booking_db.status} to {booking.status}.",
        )

    booking_db.status = booking.status
    await db.commit()
    await db.refresh(booking_db)
    return booking_db