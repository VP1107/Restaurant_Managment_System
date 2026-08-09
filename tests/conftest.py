import uuid
from datetime import time

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from src.models import Base, Restaurant, Table, TableType, User, UserRole


@pytest_asyncio.fixture
async def db_session():
    """In-memory SQLite database, isolated per test."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(engine, expire_on_commit=False)
    async with session_maker() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def restaurant(db_session: AsyncSession) -> Restaurant:
    """A restaurant that is open all day so booking-time-window checks
    never interfere with the conflict-detection tests."""
    new_restaurant = Restaurant(
        name="Test Bistro",
        location="Test City",
        opening_time=time(0, 0),
        closing_time=time(23, 59),
    )
    db_session.add(new_restaurant)
    await db_session.commit()
    await db_session.refresh(new_restaurant)
    return new_restaurant


@pytest_asyncio.fixture
async def two_seater_table(db_session: AsyncSession, restaurant: Restaurant) -> Table:
    """A single two-seater table, i.e. capacity of exactly one concurrent booking."""
    table = Table(
        restaurant_id=restaurant.id,
        capacity=TableType.TWO_SEATER,
        same_type_tables=1,
    )
    db_session.add(table)
    await db_session.commit()
    await db_session.refresh(table)
    return table


@pytest_asyncio.fixture
def make_persisted_user(db_session: AsyncSession):
    """Factory fixture returning a coroutine that creates+persists a User."""

    async def _make_persisted_user(role: UserRole = UserRole.USER) -> User:
        unique = uuid.uuid4().hex
        user = User(
            id=uuid.uuid4(),
            email=f"user-{unique}@example.com",
            hashed_password="not-a-real-hash",
            is_active=True,
            is_superuser=False,
            is_verified=True,
            role=role,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    return _make_persisted_user
