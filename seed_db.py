import asyncio
import os
import uuid
import random
from datetime import time

os.environ.setdefault("SECRET_KEY", "dummy_secret_key_for_seed")

from src.db import async_session_maker, engine
from src.models import User, Restaurant, Table, UserRole, TableType, Base
from fastapi_users.password import PasswordHelper

async def seed():
    # Make sure tables are created
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_maker() as session:
        ph = PasswordHelper()
        
        # Create users
        user_uuid = uuid.uuid4()
        admin_uuid = uuid.uuid4()
        owner_uuid = uuid.uuid4()
        
        user1 = User(
            id=user_uuid,
            email="user@demo.com",
            hashed_password=ph.hash("password"),
            is_active=True,
            is_superuser=False,
            is_verified=True,
            role=UserRole.USER
        )
        admin1 = User(
            id=admin_uuid,
            email="admin@demo.com",
            hashed_password=ph.hash("password"),
            is_active=True,
            is_superuser=False,
            is_verified=True,
            role=UserRole.ADMIN
        )
        owner1 = User(
            id=owner_uuid,
            email="owner@demo.com",
            hashed_password=ph.hash("password"),
            is_active=True,
            is_superuser=False,
            is_verified=True,
            role=UserRole.OWNER
        )
        
        session.add_all([user1, admin1, owner1])
        await session.commit()
        
        print(f"Created Users: {user1.email}, {admin1.email}, {owner1.email}")
        print("Passwords for all are 'password'")
        
        # Create 5 restaurants
        restaurants = []
        for i in range(5):
            r = Restaurant(
                name=f"Demo Restaurant {i+1}",
                location=f"Location {i+1}",
                opening_time=time(10, 0),
                closing_time=time(22, 0),
                admin_id=admin_uuid
            )
            session.add(r)
            restaurants.append(r)
        
        await session.commit()
        
        # We need to refresh them to get their IDs
        for r in restaurants:
            await session.refresh(r)
            print(f"Created Restaurant: {r.name} (ID: {r.id})")
            
            # Add 15-20 tables
            num_tables = random.randint(15, 20)
            
            for _ in range(num_tables):
                capacity = random.choice(list(TableType))
                t = Table(
                    restaurant_id=r.id,
                    capacity=capacity,
                    same_type_tables=1 
                )
                session.add(t)
            
            print(f"  Added {num_tables} tables.")
            
        await session.commit()
        print("Database seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed())
