# Restaurant Booking API

A FastAPI-based REST API for managing restaurant table bookings. Supports multiple user roles, restaurant and table management, real-time capacity checking, and timezone-aware booking scheduling.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [Running the Server](#running-the-server)
- [Database Seeding](#database-seeding)
- [Authentication](#authentication)
- [User Roles](#user-roles)
- [API Endpoints](#api-endpoints)
  - [Auth](#auth)
  - [Users](#users)
  - [Restaurants](#restaurants)
  - [Tables](#tables)
  - [Bookings](#bookings)
- [Booking Rules](#booking-rules)
- [Data Models](#data-models)

---

## Tech Stack

- **Python 3.14+**
- **FastAPI 0.135** — web framework
- **SQLAlchemy 2.0** (async) — ORM
- **aiosqlite** — async SQLite driver
- **fastapi-users 15** — authentication and user management
- **Pydantic v2** — request/response validation
- **PyJWT + cryptography** — JWT token signing
- **Uvicorn** — ASGI server

---

## Project Structure

```
.
├── src/
│   ├── routers/
│   │   ├── bookings.py       # Booking endpoints
│   │   ├── restaurants.py    # Restaurant endpoints
│   │   ├── tables.py         # Table endpoints
│   │   └── users.py          # User management endpoints
│   ├── app.py                # FastAPI app + router registration
│   ├── auth.py               # JWT auth backend (fastapi-users)
│   ├── db.py                 # Database engine and session
│   ├── models.py             # SQLAlchemy models
│   ├── schemas.py            # Pydantic schemas
│   └── services.py           # Role-checking dependency
├── main.py
├── pyproject.toml
└── uv.lock
```

---

## Setup

**1. Clone the repository and install dependencies using [uv](https://github.com/astral-sh/uv):**

```bash
uv sync
```

Or with pip:

```bash
pip install -r requirements.txt
```

**2. Create a `.env` file in the project root:**

```env
SECRET_KEY=your-long-random-secret-key-here
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | Secret used to sign JWT tokens and password-reset tokens. Must be a long, random string. The server will refuse to start if this is missing. |

---

## Running the Server

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

Interactive docs are at `http://localhost:8000/docs`.

---

## Database Seeding

A script to seed the database with demo data is provided. Run the following command from the project root:

```bash
python seed_db.py
```

This will create:
- Three demo users: `user@demo.com`, `admin@demo.com`, and `owner@demo.com` (passwords for all are set to `"password"`).
- 5 mock restaurants assigned to the admin user.
- 15-20 randomized tables for each restaurant.

---

## Authentication

The API uses **JWT Bearer token** authentication via fastapi-users.

**Register:**
```
POST /auth/register
```

**Login (get token):**
```
POST /auth/jwt/login
```

Include the token in subsequent requests:
```
Authorization: Bearer <token>
```

Tokens expire after **1 hour**.

---

## User Roles

There are three roles. A newly registered user gets the `USER` role by default. Only an `OWNER` can promote users.

| Role | Description |
|---|---|
| `USER` | Can create and cancel their own bookings |
| `ADMIN` | Manages tables and bookings for their assigned restaurant |
| `OWNER` | Full access — manages all restaurants, users, and bookings |

---

## API Endpoints

### Auth

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/auth/register` | Register a new user | No |
| `POST` | `/auth/jwt/login` | Log in and receive a JWT token | No |
| `POST` | `/auth/jwt/logout` | Log out | Yes |
| `POST` | `/auth/forgot-password` | Request a password reset email | No |
| `POST` | `/auth/reset-password` | Reset password with token | No |
| `POST` | `/auth/request-verify-token` | Request email verification | Yes |
| `POST` | `/auth/verify` | Verify email with token | No |

---

### Users

| Method | Path | Description | Role |
|---|---|---|---|
| `GET` | `/users/me` | Get current user profile | Any |
| `GET` | `/users/all` | List all users | OWNER |
| `GET` | `/users/{user_id}` | Get a specific user | OWNER |
| `PATCH` | `/users/change-role/{user_id}` | Change a user's role | OWNER |
| `DELETE` | `/users/{user_id}` | Delete a user | OWNER |

**Notes:**
- An OWNER's role cannot be changed or their account deleted.
- A user who is currently assigned as admin to a restaurant cannot be deleted until they are unassigned.

---

### Restaurants

| Method | Path | Description | Role |
|---|---|---|---|
| `GET` | `/restaurants/` | List all restaurants | Any |
| `GET` | `/restaurants/{id}` | Get a restaurant by ID | Any |
| `POST` | `/restaurants/` | Create a restaurant | OWNER |
| `PATCH` | `/restaurants/{id}` | Update a restaurant | OWNER |
| `DELETE` | `/restaurants/{id}` | Delete a restaurant | OWNER |

**Create/Update body:**
```json
{
  "name": "The Grand Table",
  "location": "Mumbai",
  "opening_time": "09:00:00",
  "closing_time": "23:00:00",
  "admin_id": "uuid-of-admin-user"
}
```

**Notes:**
- `admin_id` is optional. If provided, the user must exist and have the `ADMIN` role.
- Each admin user can only be assigned to one restaurant at a time.

---

### Tables

| Method | Path | Description | Role |
|---|---|---|---|
| `GET` | `/tables/` | List tables for a restaurant (`?restaurant_id=`) | Any |
| `GET` | `/tables/{id}` | Get a table by ID | Any |
| `POST` | `/tables/` | Add a table to a restaurant | OWNER, ADMIN |
| `DELETE` | `/tables/{id}` | Remove a table | OWNER, ADMIN |

**Create body:**
```json
{
  "restaurant_id": 1,
  "capacity": 4
}
```

**Supported capacities:** `2`, `4`, `6`

**Notes:**
- An ADMIN can only add/remove tables for their assigned restaurant.
- Adding a table of a given capacity automatically increments the count of available tables of that type, which is used for capacity checking.

---

### Bookings

| Method | Path | Description | Role |
|---|---|---|---|
| `GET` | `/bookings/all` | List all bookings | OWNER, ADMIN |
| `GET` | `/bookings/my-booking` | Get current user's active booking | Any |
| `POST` | `/bookings/create` | Create a new booking | Any |
| `POST` | `/bookings/check-capacity` | Check availability without booking | Any |
| `PATCH` | `/bookings/cancel` | Cancel your active booking | Any |
| `PATCH` | `/bookings/` | Update a booking's status | OWNER, ADMIN |

**Create/check-capacity body:**
```json
{
  "start_time": "2026-04-10T19:30:00+05:30",
  "table_type": 4,
  "restaurant_id": 1
}
```

**Update status body:**
```json
{
  "id": 42,
  "status": "confirmed"
}
```

**Notes:**
- An ADMIN sees only bookings for their assigned restaurant.
- An OWNER sees all bookings across all restaurants.

---

## Booking Rules

1. **Timezone-aware datetimes are required.** The `start_time` field must include timezone info (e.g. `2026-04-10T19:30:00+05:30` or `2026-04-10T14:00:00Z`). Naive datetimes are rejected with a `422` error. All times are stored internally as UTC.

2. **The slot must be in the future.** You cannot create or check capacity for a time that has already passed.

3. **Duration is fixed at 1 hour.** `end_time` is automatically set to `start_time + 1 hour`.

4. **Opening hours are respected.** Both `start_time` and `end_time` must fall within the restaurant's `opening_time` and `closing_time`.

5. **One active booking per user.** A user cannot create a new booking while they have a `PENDING` or `CONFIRMED` booking.

6. **Capacity is enforced per time slot.** The number of overlapping bookings for a given table type cannot exceed the total number of tables of that type in the restaurant.

7. **Status transitions are strictly controlled:**

```
PENDING → CONFIRMED or CANCELLED
CONFIRMED → COMPLETED or CANCELLED
COMPLETED → (no further transitions)
CANCELLED → (no further transitions)
```

---

## Data Models

### TableType (capacity)

| Value | Seats |
|---|---|
| `2` | 2-seater |
| `4` | 4-seater |
| `6` | 6-seater |

### BookingStatus

| Value | Meaning |
|---|---|
| `pending` | Awaiting confirmation from admin |
| `confirmed` | Confirmed by admin |
| `completed` | Visit completed |
| `cancelled` | Cancelled by user or admin |