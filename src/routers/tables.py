from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_async_session
from src.models import Restaurant, User, UserRole, Table
from src.services import required_role
from src.schemas import TableRead, TableCreate

router = APIRouter(prefix="/tables", tags=["tables"])


@router.get("/", response_model=list[TableRead])
async def get_tables(
    restaurant_id: int, session: AsyncSession = Depends(get_async_session)
):
    result = await session.execute(
        select(Table).where(Table.restaurant_id == restaurant_id)
    )
    return result.scalars().all()


@router.get("/{table_id}", response_model=TableRead)
async def get_table(
    table_id: int, session: AsyncSession = Depends(get_async_session)
):
    result = await session.execute(select(Table).where(Table.id == table_id))
    table = result.scalar_one_or_none()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return table


@router.post("/", response_model=TableRead)
async def create_table(
    table: TableCreate,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(
        required_role(required_roles=[UserRole.OWNER, UserRole.ADMIN])
    ),
):
    result = await session.execute(
        select(Restaurant).where(Restaurant.id == table.restaurant_id)
    )
    restaurant = result.scalar_one_or_none()

    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    if user.role == UserRole.ADMIN:
        if restaurant.admin_id != user.id:
            raise HTTPException(
                status_code=403,
                detail="Admin privileges required for this restaurant",
            )

    result = await session.execute(
        select(func.count(Table.id)).where(
            Table.restaurant_id == table.restaurant_id,
            Table.capacity == table.capacity,
        )
    )
    current_count = result.scalar() or 0
    new_count = current_count + 1

    await session.execute(
        update(Table)
        .where(
            Table.restaurant_id == table.restaurant_id,
            Table.capacity == table.capacity,
        )
        .values(same_type_tables=new_count)
    )

    new_table = Table(**table.model_dump(), same_type_tables=new_count)
    session.add(new_table)
    await session.commit()
    await session.refresh(new_table)
    return new_table


@router.delete("/{table_id}")
async def delete_table(
    table_id: int,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(
        required_role(required_roles=[UserRole.OWNER, UserRole.ADMIN])
    ),
):
    result = await session.execute(select(Table).where(Table.id == table_id))
    existing_table = result.scalar_one_or_none()
    if not existing_table:
        raise HTTPException(status_code=404, detail="Table not found")

    if user.role == UserRole.ADMIN:
        restaurant_res = await session.execute(
            select(Restaurant).where(Restaurant.id == existing_table.restaurant_id)
        )
        restaurant = restaurant_res.scalar_one_or_none()
        if not restaurant or restaurant.admin_id != user.id:
            raise HTTPException(
                status_code=403,
                detail="Admin privileges required for this restaurant",
            )

    await session.execute(
        update(Table)
        .where(
            Table.restaurant_id == existing_table.restaurant_id,
            Table.capacity == existing_table.capacity,
            Table.id != existing_table.id,
        )
        .values(same_type_tables=Table.same_type_tables - 1)
    )

    await session.delete(existing_table)
    await session.commit()
    return {"detail": "Table deleted successfully"}