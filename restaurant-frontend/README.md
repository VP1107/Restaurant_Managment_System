# Réserve — Frontend

A React frontend for the Restaurant Booking API. Built with Vite and React Router, styled with a refined dark aesthetic using Cormorant Garamond and Jost typefaces.

---

## Tech Stack

- **React 18** with hooks
- **React Router v6** — client-side routing with role-based guards
- **Vite** — dev server with API proxy
- Vanilla CSS — no UI framework, fully custom design system
- No external component libraries

---

## Project Structure

```
restaurant-frontend/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx               # Entry point
    ├── App.jsx                # Router + protected route wrapper
    ├── index.css              # Full design system (variables, components)
    ├── context/
    │   └── AuthContext.jsx    # Auth state, login/register/logout
    ├── utils/
    │   └── api.js             # All API calls (auth, users, restaurants, tables, bookings)
    ├── components/
    │   └── Nav.jsx            # Top navigation bar
    └── pages/
        ├── AuthPage.jsx       # Login / Register
        ├── RestaurantsPage.jsx# Browse all restaurants
        ├── BookingPage.jsx    # Create a booking with live capacity check
        ├── MyBookingPage.jsx  # View and cancel active booking
        ├── AdminPage.jsx      # Manage bookings, tables, restaurants
        └── UsersPage.jsx      # Manage users (owner only)
```

---

## Setup & Running

**1. Install dependencies:**

```bash
npm install
```

**2. Make sure the backend is running on port 8000:**

```bash
# In your backend directory
uvicorn main:app --reload
```

**3. Start the dev server:**

```bash
npm run dev
```

The app runs at `http://localhost:5173`. All `/api/*` requests are proxied to `http://localhost:8000`.

**4. Build for production:**

```bash
npm run build
```

---

## API Proxy

Vite is configured to proxy all requests from `/api` to `http://localhost:8000`:

```js
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

For production deployment, configure your web server (nginx, etc.) to proxy `/api` to the backend, or update the `BASE` constant in `src/utils/api.js` to point to the full backend URL.

---

## Pages & Routes

| Route | Page | Access |
|---|---|---|
| `/auth` | Login / Register | Public (redirects if logged in) |
| `/restaurants` | Browse restaurants | Any logged-in user |
| `/book/:restaurantId` | Make a reservation | Any logged-in user |
| `/my-booking` | View / cancel your booking | Any logged-in user |
| `/admin` | Manage bookings, tables, restaurants | Admin, Owner |
| `/users` | Manage users and roles | Owner only |

---

## Pages Overview

### Auth (`/auth`)

Two-tab card for sign-in and registration. On successful login the JWT token is stored in `localStorage` and the user is redirected to `/restaurants`.

### Restaurants (`/restaurants`)

Displays all restaurants as cards. Each card shows the restaurant name, location, opening hours, and a summary of available table sizes. Clicking "Reserve a Table" navigates to the booking page.

### Book a Table (`/book/:restaurantId`)

The booking form has three inputs:

- **Date & Time** — `datetime-local` input, minimum set to now + 5 minutes
- **Table Size** — 2, 4, or 6 seater
- **Live capacity check** — fires automatically 500ms after you stop changing the date/time or table size. Shows remaining tables with a visual bar. Disables the submit button if the slot is fully booked.

Datetimes are sent to the API with the browser's local UTC offset appended (e.g. `2026-04-10T19:30:00+05:30`), satisfying the backend's timezone-aware requirement.

### My Booking (`/my-booking`)

Shows the user's current active booking (pending or confirmed) with:

- Full date/time formatted in the user's local timezone
- Start and end times
- Restaurant ID and table size
- Status badge
- Cancel button (only shown for pending/confirmed bookings)

### Admin Panel (`/admin`)

Three-tab interface:

**Bookings tab** — Table of all bookings (filtered to the admin's restaurant for the `admin` role, all bookings for `owner`). Inline action buttons for valid status transitions:

```
pending  → confirmed / cancelled
confirmed → completed / cancelled
```

**Tables tab** — Select a restaurant, view its tables, add new tables by capacity, or remove existing ones.

**Restaurants tab** *(owner only)* — Create new restaurants with name, location, opening/closing times, and an optional admin UUID. Delete existing restaurants.

### Users (`/users`)

Table of all registered users. For each non-owner user the owner can:

- Change the role via an inline dropdown (`user` / `admin`)
- Delete the account (blocked by the API if the user manages a restaurant)

---

## Auth Flow

1. `POST /auth/register` → registers a new user (role defaults to `user`)
2. `POST /auth/jwt/login` → returns `access_token`
3. Token is stored in `localStorage` as `token`
4. Every API request includes `Authorization: Bearer <token>`
5. On app load, if a token exists, `GET /users/me` is called to restore the session
6. `POST /auth/jwt/logout` + token removal on sign out

---

## Role-Based UI

The navigation and routes adapt based on `user.role`:

| Element | user | admin | owner |
|---|---|---|---|
| Restaurants link | ✓ | ✓ | ✓ |
| My Booking link | ✓ | ✓ | ✓ |
| Admin / Manage link | — | ✓ | ✓ |
| Users link | — | — | ✓ |
| Restaurants tab in Admin | — | — | ✓ |

Attempting to navigate to a restricted route redirects to `/restaurants`.

---

## Design System

All styles live in `src/index.css` using CSS custom properties:

```css
--bg, --bg2, --bg3       /* Background layers */
--gold, --gold-dim       /* Primary accent */
--cream                  /* Primary text */
--muted                  /* Secondary text */
--border, --border-hi    /* Borders */
--danger, --success      /* Status colors */

--font-display: 'Cormorant Garamond'   /* Headings */
--font-body:    'Jost'                 /* UI text */
--font-mono:    'DM Mono'              /* IDs, times, codes */
```

Reusable classes include `.btn`, `.card`, `.badge`, `.alert`, `.input`, `.select`, `.modal`, `.loading`, and `.empty` with variants for each.