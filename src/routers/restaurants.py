from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_async_session
from src.models import Restaurant, User, UserRole
from src.services import required_role
from src.schemas import RestaurantCreate, RestaurantRead, RestaurantUpdate

router = APIRouter(prefix="/restaurants", tags=["restaurants"])


@router.get("/", response_model=list[RestaurantRead])
async def get_restaurants(session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(select(Restaurant))
    return result.scalars().all()


@router.get("/{restaurant_id}", response_model=RestaurantRead)
async def get_restaurant(
    restaurant_id: int, session: AsyncSession = Depends(get_async_session)
):
    result = await session.execute(
        select(Restaurant).where(Restaurant.id == restaurant_id)
    )
    restaurant = result.scalar_one_or_none()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return restaurant


@router.post("/", response_model=RestaurantRead)
async def create_restaurant(
    restaurant: RestaurantCreate,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(required_role(required_roles=[UserRole.OWNER])),
):

    if restaurant.admin_id is not None:
        result = await session.execute(
            select(User).where(User.id == restaurant.admin_id)
        )
        admin_user = result.scalar_one_or_none()
        if not admin_user:
            raise HTTPException(status_code=404, detail="Admin user not found")
        if admin_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=400, detail="User must have ADMIN role"
            )

        existing_admin = await session.execute(
            select(Restaurant).where(Restaurant.admin_id == restaurant.admin_id)
        )
        if existing_admin.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail="Admin user is already assigned to another restaurant",
            )

    new_restaurant = Restaurant(**restaurant.model_dump())
    session.add(new_restaurant)
    await session.commit()
    await session.refresh(new_restaurant)
    return new_restaurant


@router.patch("/{restaurant_id}", response_model=RestaurantRead)
async def update_restaurant(
    restaurant_id: int,
    restaurant: RestaurantUpdate,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(required_role(required_roles=[UserRole.OWNER])),
):
    result = await session.execute(
        select(Restaurant).where(Restaurant.id == restaurant_id)
    )
    existing_restaurant = result.scalar_one_or_none()
    if not existing_restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    if (
        restaurant.admin_id is not None
        and restaurant.admin_id != existing_restaurant.admin_id
    ):
        result_user = await session.execute(
            select(User).where(User.id == restaurant.admin_id)
        )
        admin_user = result_user.scalar_one_or_none()
        if not admin_user:
            raise HTTPException(status_code=404, detail="Admin user not found")
        if admin_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=400, detail="User must have ADMIN role"
            )

        existing_admin = await session.execute(
            select(Restaurant).where(Restaurant.admin_id == restaurant.admin_id)
        )
        if existing_admin.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail="Admin user is already assigned to another restaurant",
            )

    for field, value in restaurant.model_dump(exclude_unset=True).items():
        setattr(existing_restaurant, field, value)

    await session.commit()
    await session.refresh(existing_restaurant)
    return existing_restaurant


@router.delete("/{restaurant_id}")
async def delete_restaurant(
    restaurant_id: int,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(required_role(required_roles=[UserRole.OWNER])),
):
    result = await session.execute(
        select(Restaurant).where(Restaurant.id == restaurant_id)
    )
    restaurant = result.scalar_one_or_none()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    await session.delete(restaurant)
    await session.commit()
    return {"detail": "Restaurant deleted successfully"}