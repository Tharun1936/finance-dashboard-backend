# Zorvyn — Finance Dashboard Backend API

> **Submission for:** Backend Engineering Internship — Online Assessment  
> **Stack:** Node.js · Express v5 · MongoDB Atlas · Mongoose · JWT  
> **Author note:** All core requirements are implemented. Optional enhancements (soft delete, pagination, search, logout blacklist) are also included and documented below.

---

## Quick Links

| What you're looking for | Where to find it |
|-------------------------|-----------------|
| How to run the project | [Getting Started](#getting-started) |
| All API endpoints | [API Reference](#api-reference) |
| Role & permission matrix | [Roles & Permissions](#roles--permissions) |
| Data model definitions | [Data Models](#data-models) |
| How errors are handled | [Validation & Error Handling](#validation--error-handling) |
| Design rationale | [Design Decisions & Tradeoffs](#design-decisions--tradeoffs) |
| What optional features were added | [Optional Enhancements Implemented](#optional-enhancements-implemented) |

---

## Requirements Coverage

This section maps every stated requirement to where it is implemented.

| Requirement | Status | Location |
|-------------|--------|----------|
| User creation & management | ✅ Done | `controllers/usercontroller.js`, `routes/users.js` |
| Role assignment (viewer / analyst / admin) | ✅ Done | `models/user.js`, `middleware/rolecheck.js` |
| User status (active / inactive) | ✅ Done | `models/user.js`, `PATCH /api/users/:id/status` |
| Role-based access control | ✅ Done | `middleware/rolecheck.js`, all route files |
| Financial record CRUD | ✅ Done | `controllers/recordcontroller.js`, `routes/records.js` |
| Record fields: amount, type, category, date, description | ✅ Done | `models/financialrecord.js` |
| Filtering by date, category, type | ✅ Done | `GET /api/records` with query params |
| Dashboard: total income / expenses / balance | ✅ Done | `services/dashboardservice.js` |
| Dashboard: category-wise totals | ✅ Done | `GET /api/dashboard/category-breakdown` |
| Dashboard: recent activity | ✅ Done | `getDashboardData()` in dashboard service |
| Dashboard: monthly & weekly trends | ✅ Done | `GET /api/dashboard/trends`, dashboard service |
| Access control enforcement | ✅ Done | `middleware/auth.js`, `middleware/rolecheck.js` |
| Input validation | ✅ Done | `express-validator` in all routes, `utils/validation.js` |
| Meaningful error responses | ✅ Done | Consistent `{ success, message, errors }` shape |
| Correct HTTP status codes | ✅ Done | 200, 201, 400, 401, 403, 404, 409, 500 |
| Data persistence (MongoDB) | ✅ Done | `config/db.js`, Mongoose models |
| JWT Authentication | ✅ Done | `controllers/authcontroller.js`, `middleware/auth.js` |
| Pagination | ✅ Done | All list endpoints |
| Search support | ✅ Done | `GET /api/records?search=` |
| Soft delete | ✅ Done | `isDeleted` flag + Mongoose pre-find hook |
| Logout / token invalidation | ✅ Done | `models/blacklistmodel.js`, `POST /api/auth/logout` |

---

## Project Structure

The codebase follows a layered architecture with clear separation of concerns:

```
finance-dashboard-backend/
├── server.js                      # Entry point: DB connect → start server
├── .env                           # Environment config (not committed)
├── package.json
└── src/
    ├── app.js                     # Express setup, route mounting, error handlers
    │
    ├── config/
    │   └── db.js                  # MongoDB connection with error handling
    │
    ├── models/                    # Mongoose schemas — data shape + validation
    │   ├── user.js                # User: role, status, bcrypt hooks, toJSON transform
    │   ├── financialrecord.js     # Record: soft delete, indexes, pre-find filter
    │   └── blacklistmodel.js     # Invalidated JWT tokens (logout support)
    │
    ├── controllers/               # Request/response handlers — no raw DB logic here
    │   ├── authcontroller.js      # register, login, logout, getMe
    │   ├── usercontroller.js      # Admin CRUD: list, get, role, status, delete
    │   ├── recordcontroller.js    # Record CRUD + soft/hard delete + restore
    │   └── dashboardcontroller.js # Summary, category breakdown, trends
    │
    ├── services/                  # Business logic layer — complex aggregations
    │   └── dashboardservice.js    # MongoDB pipelines: totals, trends, categories
    │
    ├── routes/                    # Route definitions with validation rules
    │   ├── auth.js                # /api/auth/*
    │   ├── users.js               # /api/users/*  (admin only)
    │   ├── records.js             # /api/records/*
    │   └── dashboard.js           # /api/dashboard/*
    │
    ├── middleware/
    │   ├── auth.js                # JWT verify + blacklist check + status check
    │   └── rolecheck.js           # requireViewer / requireAnalyst / requireAdmin
    │
    └── utils/
        └── validation.js          # Converts express-validator errors → clean JSON
```

**Architecture principle:** Routes → Controllers → Services → Models. Each layer only communicates with the layer immediately below it.

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### Setup

```bash
# Install dependencies
cd finance-dashboard-backend
npm install

# Development (hot reload)
npm run dev

# Production
npm start
```

Server starts at `http://localhost:5000`

### Verify the server

```
GET /api/health
```

```json
{
  "success": true,
  "message": "Finance Dashboard API is running",
  "timestamp": "2026-04-03T05:30:00.000Z"
}
```

---

## Environment Variables

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/<dbname>
JWT_SECRET=<long-random-secret>
```

---

## Roles & Permissions

Three roles with clearly enforced boundaries:

| Permission                         | Viewer     | Analyst       | Admin  |
|------------------------------------|------------|---------------|--------|
| Register / Login                   | ✅         | ✅            | ✅     |
| View own financial records         | ✅         | ✅            | ✅     |
| View all records (global scope)    | ❌         | ✅            | ✅     |
| Create financial records           | ❌         | ✅            | ✅     |
| Update records                     | ❌         | ✅ (own only) | ✅     |
| Soft delete records                | ❌         | ✅ (own only) | ✅     |
| Hard delete records (permanent)    | ❌         | ❌            | ✅     |
| Restore soft-deleted records       | ❌         | ❌            | ✅     |
| Dashboard summary                  | ✅ (scoped)| ✅ (global)   | ✅     |
| Category breakdown & trend data    | ❌         | ✅            | ✅     |
| Manage users (CRUD)                | ❌         | ❌            | ✅     |
| Assign or change roles             | ❌         | ❌            | ✅     |
| Activate / deactivate accounts     | ❌         | ❌            | ✅     |

**How enforcement works:**
- `middleware/auth.js` verifies the JWT and loads the user on every protected request
- `middleware/rolecheck.js` provides `requireViewer`, `requireAnalyst`, `requireAdmin` guards applied at the route level
- Inside controllers, scope filtering is applied per-role (e.g. viewers only query `createdBy: req.user._id`)

---

## API Reference

All protected routes require:
```
Authorization: Bearer <jwt_token>
```

---

### Authentication — `/api/auth`

| Method | Endpoint        | Auth | Description                      |
|--------|-----------------|------|----------------------------------|
| POST   | `/register`     | No   | Create account (defaults to viewer) |
| POST   | `/login`        | No   | Authenticate, receive JWT        |
| POST   | `/logout`       | Yes  | Invalidate token (JWT blacklist) |
| GET    | `/me`           | Yes  | Get current user profile         |

**Register body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "secret123",
  "role": "viewer"
}
```

**Login body:**
```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

**Successful login response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "username": "john_doe", "role": "viewer", "status": "active" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### User Management — `/api/users`

> **Admin role required for all endpoints.**

| Method | Endpoint              | Description                          |
|--------|-----------------------|--------------------------------------|
| GET    | `/`                   | List users — paginated + filterable  |
| GET    | `/:id`                | Get a specific user                  |
| PATCH  | `/:id/role`           | Change a user's role                 |
| PATCH  | `/:id/status`         | Activate or deactivate a user        |
| DELETE | `/:id`                | Permanently delete a user            |

**Query params for `GET /api/users`:**

| Param    | Type   | Description                         |
|----------|--------|-------------------------------------|
| `page`   | Number | Page number (default: 1)            |
| `limit`  | Number | Results per page (max: 100)         |
| `role`   | String | Filter: `viewer`, `analyst`, `admin`|
| `status` | String | Filter: `active`, `inactive`        |
| `search` | String | Match against username or email     |

> **Note:** Admins cannot change their own role or status, and cannot delete themselves. These are enforced in the controller.

---

### Financial Records — `/api/records`

| Method | Endpoint          | Roles                        | Description                      |
|--------|-------------------|------------------------------|----------------------------------|
| GET    | `/`               | Viewer+                      | List records (paginated, filtered)|
| GET    | `/:id`            | Viewer+                      | Get a single record by ID        |
| POST   | `/`               | Analyst, Admin               | Create a new record              |
| PUT    | `/:id`            | Analyst (own), Admin (any)   | Update an existing record        |
| DELETE | `/:id`            | Analyst (soft), Admin (hard) | Delete a record                  |
| GET    | `/deleted`        | Admin only                   | View soft-deleted records        |
| PATCH  | `/:id/restore`    | Admin only                   | Restore a soft-deleted record    |

**Create / update body:**
```json
{
  "amount": 1500.00,
  "type": "income",
  "category": "Salary",
  "date": "2026-04-01",
  "description": "Monthly salary for April",
  "tags": ["salary", "monthly"]
}
```

**Filter params for `GET /api/records`:**

| Param       | Example                   | Description                        |
|-------------|---------------------------|------------------------------------|
| `type`      | `?type=expense`           | `income` or `expense`              |
| `category`  | `?category=salary`        | Partial, case-insensitive match    |
| `startDate` | `?startDate=2026-01-01`   | ISO 8601                           |
| `endDate`   | `?endDate=2026-03-31`     | ISO 8601                           |
| `search`    | `?search=rent`            | Searches category and description  |
| `sortBy`    | `?sortBy=amount`          | `date`, `amount`, `category`       |
| `sortOrder` | `?sortOrder=asc`          | `asc` or `desc`                    |
| `page`      | `?page=2`                 | Pagination                         |
| `limit`     | `?limit=10`               | Results per page (max: 100)        |

---

### Dashboard Analytics — `/api/dashboard`

| Method | Endpoint                | Roles          | Description                         |
|--------|-------------------------|----------------|-------------------------------------|
| GET    | `/summary`              | Viewer+        | Totals, balance, recent activity, trends |
| GET    | `/category-breakdown`   | Analyst, Admin | Income/expense totals per category  |
| GET    | `/trends`               | Analyst, Admin | Monthly or weekly trend data        |

**`GET /api/dashboard/summary?period=month`**  
`period` accepts: `week` · `month` · `year` · `all`

> Viewers receive data scoped to their own records. Analysts and admins receive global data across all users.

**Response shape:**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "totals": {
      "income": 5000,
      "incomeCount": 3,
      "expenses": 2000,
      "expenseCount": 5,
      "balance": 3000,
      "totalTransactions": 8
    },
    "categoryBreakdown": [ { "_id": { "category": "Salary", "type": "income" }, "total": 5000, "count": 3 } ],
    "recentActivity": [ ... ],
    "monthlyTrends": [ { "_id": { "year": 2026, "month": 4 }, "income": 5000, "expenses": 2000, "count": 8 } ],
    "weeklyTrends": [ ... ]
  }
}
```

**`GET /api/dashboard/trends?granularity=monthly`**  
`granularity` accepts: `monthly` · `weekly`

---

## Data Models

### User

```js
{
  username : String,   // required, unique, 3–30 chars
  email    : String,   // required, unique, validated, lowercased
  password : String,   // required, bcrypt-hashed, select: false (never returned)
  role     : Enum,     // 'viewer' | 'analyst' | 'admin' — default: 'viewer'
  status   : Enum,     // 'active' | 'inactive' — default: 'active'
  createdAt: Date,     // auto
  updatedAt: Date      // auto
}
```

Notable implementation details:
- Password is hashed via a `pre('save')` Mongoose hook using bcrypt (12 salt rounds)
- `select: false` on the password field means it's excluded from all query results by default
- A `toJSON` transform strips the password field before any response serialization

### FinancialRecord

```js
{
  amount     : Number,    // required, min: 0.01
  type       : Enum,      // 'income' | 'expense'
  category   : String,    // required, max 100 chars
  date       : Date,      // defaults to Date.now
  description: String,    // optional, max 500 chars
  tags       : [String],  // optional labels array
  isDeleted  : Boolean,   // soft delete flag, default: false
  deletedAt  : Date,      // set when soft-deleted
  createdBy  : ObjectId,  // ref: User
  createdAt  : Date,      // auto
  updatedAt  : Date       // auto
}
```

Notable implementation details:
- Compound indexes on `{ createdBy, date }` and `{ type, category }` for efficient filtering
- A Mongoose `pre(/^find/)` hook automatically excludes soft-deleted records from all queries — callers don't need to manually add `isDeleted: false`

---

## Validation & Error Handling

All inputs are validated using `express-validator` before reaching any controller. The `utils/validation.js` middleware intercepts errors and formats them consistently.

**Validation error response shape:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "amount", "message": "Amount must be a positive number" },
    { "field": "type",   "message": "Type must be income or expense" }
  ]
}
```

**HTTP status code usage:**

| Code | When it is used |
|------|-----------------|
| `200` | Successful read or update |
| `201` | Successful resource creation |
| `400` | Validation errors or bad input |
| `401` | Missing, expired, or blacklisted token |
| `403` | Valid token, insufficient role / inactive account |
| `404` | Resource not found |
| `409` | Conflict — duplicate email or username |
| `500` | Unexpected server error |

**Other error handling details:**
- Expired JWT (`TokenExpiredError`) and invalid JWT (`JsonWebTokenError`) return distinct 401 messages
- Inactive users are blocked at the auth middleware level with a clear 403 message
- Admins are prevented from modifying their own role, status, or deleting themselves (enforced in usercontroller)
- Global error handler in `app.js` catches any unhandled errors and returns a 500 with consistent formatting

---

## Optional Enhancements Implemented

The following optional features from the assessment were all implemented:

| Optional Feature | Implementation |
|------------------|---------------|
| **JWT Authentication** | `POST /api/auth/login` returns a signed JWT; all protected routes verify it via `middleware/auth.js` |
| **Logout / token invalidation** | Logged-out tokens are stored in a MongoDB `blacklistTokens` collection and rejected on every subsequent request |
| **Pagination** | All list endpoints (`/api/records`, `/api/users`) support `page` and `limit` query parameters |
| **Search support** | `GET /api/records?search=` performs partial matching across `category` and `description` fields |
| **Soft delete** | Records are soft-deleted by setting `isDeleted: true` and `deletedAt: <timestamp>`; a Mongoose pre-find hook hides them automatically |
| **Restore deleted records** | `PATCH /api/records/:id/restore` allows admins to bring back soft-deleted records |
| **Sorting** | Records support `sortBy` and `sortOrder` query params |

---

## Design Decisions & Tradeoffs

### Architecture: Layered MVC
The project follows a clean layered architecture: Routes → Controllers → Services → Models. This ensures:
- Routes only contain validation middleware
- Controllers only handle HTTP input/output
- Services contain all complex aggregation logic
- Models define schema and data-level hooks

This separation makes each layer independently testable and maintainable.

### JWT + MongoDB Blacklist for Logout
JWTs are stateless — once issued, they can't be "cancelled" without tracking them. A blacklist in MongoDB solves this cleanly at this scale.

**Tradeoff:** Every authenticated request makes one additional DB lookup. For high-traffic production systems, a Redis blacklist would be more efficient. For this assessment scope, MongoDB keeps the stack simple.

### Soft Delete with Auto-Filter Hook
Rather than deleting records permanently, analysts soft-delete them by setting `isDeleted: true`. A Mongoose `pre(/^find/)` hook applies `{ isDeleted: false }` to every find query automatically, so no caller needs to remember to add the filter.

**Tradeoff:** The hook intercepts all finds, which requires careful opt-out when the admin explicitly queries deleted records. This is handled by using a direct aggregation pipeline (`FinancialRecord.aggregate`) in the deleted records endpoint which bypasses query hooks.

### Role-Scoped Data at the Controller Level
Data scoping (viewers see only their own records) is enforced in the controller by conditionally building the query filter, not purely at the route level. This is intentional — it makes the access-control logic visible and auditable in one place (the controller) rather than split across route guards and query logic.

### Assumptions Made

1. New registrations always default to `viewer`. Role elevation must be done by an admin.
2. Analysts can only soft-delete their own records. Admins can hard-delete any record.
3. Admins see globally scoped dashboard data; viewers see only their own.
4. The `mongodb` npm package listed in the original `package.json` is unused — all database interaction goes through Mongoose.
5. Rate limiting and request logging are not implemented in this version — they are straightforward additions for a production deployment.
