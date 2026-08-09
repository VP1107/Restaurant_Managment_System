"""Tests for the double-booking prevention logic in src.routers.bookings.create_booking.

create_booking() is called directly (rather than through the HTTP layer) with an
in-memory SQLite session and a persisted User, exercising the exact overlap query
used in production:

    Booking.start_time < end_time AND Booking.end_time > start_time

against tables whose `same_type_tables` capacity is fixed, so we can assert on
acceptance/rejection deterministically.
"""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from src.models import BookingStatus, TableType
from src.routers.bookings import create_booking
from src.schemas import BookingCreate


def _future_start(hours_from_now: int) -> datetime:
    """A timezone-aware datetime safely in the future, on the hour."""
    return (datetime.now(timezone.utc) + timedelta(days=1, hours=hours_from_now)).replace(
        minute=0, second=0, microsecond=0
    )


@pytest.mark.asyncio
async def test_create_booking_succeeds_when_table_available(
    db_session, restaurant, two_seater_table, make_persisted_user
):
    user = await make_persisted_user()
    booking_in = BookingCreate(
        start_time=_future_start(2),
        table_type=TableType.TWO_SEATER,
        restaurant_id=restaurant.id,
    )

    created = await create_booking(booking=booking_in, db=db_session, user=user)

    assert created.id is not None
    assert created.status == BookingStatus.PENDING
    assert created.restaurant_id == restaurant.id
    assert created.table_type == TableType.TWO_SEATER
    assert created.end_time == created.start_time + timedelta(hours=1)


@pytest.mark.asyncio
async def test_overlapping_booking_is_rejected(
    db_session, restaurant, two_seater_table, make_persisted_user
):
    user_a = await make_persisted_user()
    user_b = await make_persisted_user()

    start = _future_start(3)
    await create_booking(
        booking=BookingCreate(
            start_time=start,
            table_type=TableType.TWO_SEATER,
            restaurant_id=restaurant.id,
        ),
        db=db_session,
        user=user_a,
    )

    # Overlaps the first booking by 30 minutes; only one table of this type exists.
    overlapping_start = start + timedelta(minutes=30)
    with pytest.raises(HTTPException) as exc_info:
        await create_booking(
            booking=BookingCreate(
                start_time=overlapping_start,
                table_type=TableType.TWO_SEATER,
                restaurant_id=restaurant.id,
            ),
            db=db_session,
            user=user_b,
        )

    assert exc_info.value.status_code == 400
    assert "No tables" in exc_info.value.detail


@pytest.mark.asyncio
async def test_adjacent_non_overlapping_booking_is_allowed(
    db_session, restaurant, two_seater_table, make_persisted_user
):
    user_a = await make_persisted_user()
    user_b = await make_persisted_user()

    start = _future_start(4)
    first = await create_booking(
        booking=BookingCreate(
            start_time=start,
            table_type=TableType.TWO_SEATER,
            restaurant_id=restaurant.id,
        ),
        db=db_session,
        user=user_a,
    )

    # Starts exactly when the first booking ends -> no overlap, should be allowed
    # even though the table's capacity is exhausted for any overlapping slot.
    adjacent_start = first.end_time.replace(tzinfo=timezone.utc)
    second = await create_booking(
        booking=BookingCreate(
            start_time=adjacent_start,
            table_type=TableType.TWO_SEATER,
            restaurant_id=restaurant.id,
        ),
        db=db_session,
        user=user_b,
    )

    assert second.status == BookingStatus.PENDING
    assert second.start_time == first.end_time
