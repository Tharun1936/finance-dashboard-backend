# Finance Dashboard Backend API

> A backend API I built for managing financial records with user roles and a dashboard summary.
> Built using **Node.js**, **Express**, and **MongoDB Atlas**.

---

## What is this project?

This is a REST API backend for a finance dashboard system. Different users (viewers, analysts, admins) can interact with financial data based on what they're allowed to do.

Here's the basic idea of how it works:
- Users register and log in — they get a JWT token back
- That token is sent with every request so the server knows who you are
- Depending on your role, you can view, create, update, or delete financial records
- There's a dashboard that gives you summary stats like total income, expenses, and trends

---

## Tech Stack

| What | Tool |
|------|------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB Atlas (via Mongoose) |
| Authentication | JWT (JSON Web Tokens) |
| Password Hashing | bcryptjs |
| Input Validation | express-validator |
| Dev tool | nodemon (auto-restarts on save) |

---

## Folder Structure

I organized the project so each file has one clear job:

```
finance-dashboard-backend/
├── server.js              ← entry point, connects DB and starts server
├── .env                   ← secret keys (never commit this!)
├── package.json
└── src/
    ├── app.js             ← sets up Express, connects all routes
    ├── config/
    │   └── db.js          ← MongoDB connection logic
    ├── models/
    │   ├── user.js        ← what a user looks like in the DB
    │   ├── financialrecord.js  ← what a financial record looks like
    │   └── blacklistmodel.js  ← stores logged-out tokens
    ├── controllers/
    │   ├── authcontroller.js   ← handles register, login, logout
    │   ├── usercontroller.js   ← admin manages users here
    │   ├── recordcontroller.js ← CRUD for financial records
    │   └── dashboardcontroller.js ← handles summary/analytics
    ├── services/
    │   └── dashboardservice.js ← MongoDB aggregation logic for the dashboard
    ├── routes/
    │   ├── auth.js        ← /api/auth/* routes
    │   ├── users.js       ← /api/users/* routes
    │   ├── records.js     ← /api/records/* routes
    │   └── dashboard.js   ← /api/dashboard/* routes
    ├── middleware/
    │   ├── auth.js        ← checks if you're logged in (JWT verify)
    │   └── rolecheck.js   ← checks if you have the right role
    └── utils/
        └── validation.js  ← formats express-validator error messages
```

---

## How to Run This Locally

### Step 1 — Clone and install

```bash
git clone https://github.com/Tharun1936/finance-dashboard-backend.git
cd finance-dashboard-backend
npm install
```

### Step 2 — Set up environment variables

Create a `.env` file in the root folder:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/<dbname>
JWT_SECRET=make_this_a_long_random_string
```

> You'll need a free MongoDB Atlas account at [mongodb.com/atlas](https://www.mongodb.com/atlas)

### Step 3 — Start the server

```bash
npm run dev   # development mode with auto-reload
npm start     # production mode
```

### Step 4 — Test it's working

```
GET http://localhost:5000/api/health
```

You should see:
```json
{
  "success": true,
  "message": "Finance Dashboard API is running!",
  "time": "2026-04-03T..."
}
```

---

## User Roles

I defined 3 roles with different levels of access:

| What they can do | Viewer | Analyst | Admin |
|-----------------|--------|---------|-------|
| Register / Login | ✅ | ✅ | ✅ |
| View their own records | ✅ | ✅ | ✅ |
| View ALL records | ❌ | ✅ | ✅ |
| Create records | ❌ | ✅ | ✅ |
| Edit records | ❌ | ✅ (own only) | ✅ |
| Delete records (soft) | ❌ | ✅ (own only) | ✅ |
| Delete records (permanent) | ❌ | ❌ | ✅ |
| Restore deleted records | ❌ | ❌ | ✅ |
| See dashboard summary | ✅ (own data) | ✅ (all data) | ✅ |
| See category/trend charts | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |

**How it's enforced:**
- `middleware/auth.js` — verifies the JWT token on every protected request
- `middleware/rolecheck.js` — checks if the user's role is allowed for that route

---

## API Endpoints

All protected routes need this header:
```
Authorization: Bearer <your_token>
```

---

### Auth Routes `/api/auth`

| Method | Route | Auth needed? | What it does |
|--------|-------|-------------|-------------|
| POST | `/register` | No | Create a new account |
| POST | `/login` | No | Login and get token |
| POST | `/logout` | Yes | Invalidate your token |
| GET | `/me` | Yes | Get your own profile |

**Register request body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "secret123",
  "role": "viewer"
}
```

**Login request body:**
```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

**Login response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "username": "john_doe",
      "role": "viewer",
      "status": "active"
    },
    "token": "eyJhbGci..."
  }
}
```

---

### User Management Routes `/api/users`

> Only admins can use these

| Method | Route | What it does |
|--------|-------|-------------|
| GET | `/` | List all users (with filters + pagination) |
| GET | `/:id` | Get a specific user |
| PATCH | `/:id/role` | Change someone's role |
| PATCH | `/:id/status` | Activate or deactivate a user |
| DELETE | `/:id` | Delete a user permanently |

**GET /api/users — optional query params:**
- `?page=1&limit=10` — pagination
- `?role=analyst` — filter by role
- `?status=active` — filter by status
- `?search=john` — search by name or email

---

### Financial Records Routes `/api/records`

| Method | Route | Who can use it | What it does |
|--------|-------|---------------|-------------|
| GET | `/` | Everyone | List records (with filters) |
| GET | `/:id` | Everyone | Get one record |
| POST | `/` | Analyst, Admin | Create a record |
| PUT | `/:id` | Analyst (own), Admin | Edit a record |
| DELETE | `/:id` | Analyst (soft), Admin (permanent) | Delete a record |
| GET | `/deleted` | Admin only | See all soft-deleted records |
| PATCH | `/:id/restore` | Admin only | Restore a deleted record |

**Create record request body:**
```json
{
  "amount": 1500.00,
  "type": "income",
  "category": "Salary",
  "date": "2026-04-01",
  "description": "April salary",
  "tags": ["salary", "monthly"]
}
```

**GET /api/records — optional filters:**
- `?type=expense` — income or expense
- `?category=food` — filter by category
- `?startDate=2026-01-01&endDate=2026-03-31` — date range
- `?search=rent` — search in category and description
- `?sortBy=amount&sortOrder=asc` — sort results
- `?page=1&limit=10` — pagination

---

### Dashboard Routes `/api/dashboard`

| Method | Route | Who can use | What it does |
|--------|-------|------------|-------------|
| GET | `/summary` | Everyone | Total income, expenses, balance, recent records |
| GET | `/category-breakdown` | Analyst, Admin | Totals grouped by category |
| GET | `/trends` | Analyst, Admin | Monthly or weekly trend data |

**GET /api/dashboard/summary?period=month**

`period` can be: `week`, `month`, `year`, or `all`

Example response:
```json
{
  "success": true,
  "data": {
    "period": "month",
    "totals": {
      "income": 5000,
      "expenses": 2000,
      "balance": 3000,
      "totalTransactions": 8
    },
    "categoryBreakdown": [ ... ],
    "recentActivity": [ ... ],
    "monthlyTrends": [ ... ],
    "weeklyTrends": [ ... ]
  }
}
```

> **Note:** Viewers only see their own data. Analysts and Admins see everyone's data.

---

## Database Models

### User
```
username  - String, required, unique
email     - String, required, unique
password  - String, bcrypt hashed, never returned in API responses
role      - "viewer" | "analyst" | "admin"  (default: viewer)
status    - "active" | "inactive"  (default: active)
createdAt - auto
updatedAt - auto
```

### Financial Record
```
amount      - Number, required, must be > 0
type        - "income" | "expense", required
category    - String, required
date        - Date (defaults to today)
description - String, optional
tags        - Array of strings, optional
isDeleted   - Boolean (for soft delete, default: false)
deletedAt   - Date (set when soft deleted)
createdBy   - Reference to User who created this
```

---

## Error Handling

All errors return in the same format so the frontend always knows what to expect:

```json
{
  "success": false,
  "message": "What went wrong",
  "errors": [
    { "field": "email", "message": "Please enter a valid email address" }
  ]
}
```

**HTTP status codes I used:**

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created successfully |
| 400 | Bad input / validation failed |
| 401 | Not logged in / bad token |
| 403 | Logged in but don't have permission |
| 404 | Resource not found |
| 409 | Already exists (duplicate email etc.) |
| 500 | Server error |

---

## Extra Features I Added

These weren't required but I added them to make the project more complete:

- **JWT Logout** — When you log out, the token is stored in a `BlacklistToken` collection so it can't be reused even before it expires
- **Soft Delete** — Records aren't permanently deleted right away. They get marked as `isDeleted: true` so admins can restore them if needed
- **Pagination** — Every list endpoint supports `?page=` and `?limit=` to avoid loading everything at once
- **Search** — Records can be searched by category or description using `?search=`
- **Sorting** — Records can be sorted by any field using `?sortBy=` and `?sortOrder=`
- **Role-scoped data** — Viewers only see their own records; analysts/admins see all records

---

## Design Decisions (and why I made them)

**Why MongoDB?**
Financial records can have different fields (some have tags, some don't, etc.). MongoDB handles this flexibility better than a relational DB for this use case. Also the aggregation pipeline makes the dashboard queries easy to write.

**Why JWT + Blacklist for logout?**
JWT tokens don't expire early on their own — once issued, they're valid till expiry. To properly support logout, I store them in a MongoDB blacklist and check it on every request. In a real production app with high traffic, Redis would be faster for this, but MongoDB is simpler for this project.

**Why soft delete?**
Permanently deleting financial records is risky — what if it was a mistake? Soft delete lets you mark records as deleted but restore them later. Only admins can permanently delete or restore.

**Why separate controllers, routes, services?**
I tried to follow a clean structure:
- Routes → only define paths + validation
- Controllers → handle the request and response
- Services → complex logic (like MongoDB aggregations for the dashboard)
- Models → describe what data looks like

This makes the code easier to understand and maintain.

---

## Assumptions I Made

1. New accounts always start as `viewer` — admins must manually promote them
2. Analysts can only edit/delete their own records; admins can touch any record
3. Viewers see dashboard data only for their own transactions
4. Rate limiting and logging are not implemented (would add them in a real production setup)
