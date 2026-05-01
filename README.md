# Krishi Credit

A full-stack village shop billing, customer ledger, and payment management system. Owners and staff manage customers, credit bills, payments, dues, notifications, reports, and audit history from a React dashboard backed by an Express/MongoDB API.

---

## Features

### Backend
- JWT authentication with access + refresh token rotation and per-device session management
- Role-based access control — **owner** and **staff** roles
- Customer management — create, search (name/phone/ID/Hindi), paginate, update, soft delete
- Billing — create bills with optional file upload (JPG/PNG/PDF), update, ledger balance recalculation
- Payments — record and update payments, balance recalculation
- Customer ledger — running balance per customer across bills and payments
- Dashboard summary — customer count, total due, today's sales, today's payments, recent activity
- Reports — filtered due/recovery/risk/inactive/frequent customer reports with CSV/PDF export
- Notifications — due-amount alerts with scheduled scan
- Audit logs — owner-only change history for customers, bills, payments, users
- Mobile sync — offline-first payload sync with duplicate/conflict detection
- Rate limiting, input sanitization, Zod validation, structured error responses

### Frontend
- React 18 + Vite + TailwindCSS
- English and Hindi (हिंदी) full UI translation via i18next
- Pages: Login, Dashboard, Customers, Customer Profile, Bill Entry, Payment Collection, Reports, Staff, Audit Logs, Settings
- Protected routes with role-based access
- Debounced customer search with inline add-customer modal on Bill Entry
- Responsive — desktop sidebar + mobile top nav

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, Axios, React Router, i18next |
| Backend | Node.js, Express, MongoDB, Mongoose, JWT, Bcrypt, Multer, Zod |
| Database | MongoDB (local or Atlas) |

---

## Project Structure

```
krishi/
├── backend/
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config/db.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── auditLogger.js
│   │   │   ├── errorHandler.js
│   │   │   ├── rateLimiters.js
│   │   │   ├── upload.js
│   │   │   └── validate.js
│   │   ├── models/
│   │   │   ├── AuditLog.js
│   │   │   ├── Bill.js
│   │   │   ├── BillFile.js
│   │   │   ├── Customer.js
│   │   │   ├── Notification.js
│   │   │   ├── Payment.js
│   │   │   ├── SyncLog.js
│   │   │   ├── User.js
│   │   │   └── UserSession.js
│   │   ├── routes/
│   │   │   ├── audit.routes.js
│   │   │   ├── auth.routes.js
│   │   │   ├── bills.routes.js
│   │   │   ├── customers.routes.js
│   │   │   ├── dashboard.routes.js
│   │   │   ├── mobile.routes.js
│   │   │   ├── notifications.routes.js
│   │   │   ├── payments.routes.js
│   │   │   ├── reports.routes.js
│   │   │   └── users.routes.js
│   │   ├── services/
│   │   │   ├── customerInsightsService.js
│   │   │   ├── ledgerService.js
│   │   │   ├── notificationScheduler.js
│   │   │   ├── notificationService.js
│   │   │   ├── sessionService.js
│   │   │   └── syncService.js
│   │   ├── scripts/seed.js
│   │   ├── utils/
│   │   └── validation/schemas.js
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/client.js
│   │   ├── components/
│   │   ├── context/AuthContext.jsx
│   │   ├── i18n/
│   │   ├── locales/en/ and hi/
│   │   ├── pages/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB (local) **or** a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/krishi-credit.git
cd krishi-credit
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set MONGO_URI and JWT_SECRET at minimum
npm run seed    # creates the owner user
npm run dev     # starts on http://localhost:5000
```

### 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env — set VITE_API_URL if backend runs on a different port
npm run dev     # starts on http://127.0.0.1:5173
```

---

## Environment Variables

### `backend/.env`

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/krishi_credit
JWT_SECRET=replace_with_a_long_random_secret_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_DAYS=30
JWT_EXPIRES_IN=7d
MAX_UPLOAD_MB=15

# Seed script credentials (used by npm run seed)
SEED_OWNER_NAME=Owner
SEED_OWNER_EMAIL=owner@example.com
SEED_OWNER_PASSWORD=owner12345
```

**MongoDB Atlas URI format:**
```env
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/krishi_credit?retryWrites=true&w=majority
```

### `frontend/.env`

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Default Login

After running `npm run seed` in the backend:

| Field | Value |
|---|---|
| Email | `owner@example.com` |
| Password | `owner12345` |

Change these via the Users page after first login.

---

## API Overview

Base path: `/api`

| Route group | Description |
|---|---|
| `POST /api/auth/login` | Login, returns access + refresh token |
| `GET /api/auth/me` | Get current user |
| `POST /api/auth/refresh-token` | Refresh access token |
| `POST /api/auth/logout` | Logout and revoke session |
| `GET /api/dashboard/summary` | Dashboard stats |
| `GET /api/customers` | List/search customers |
| `POST /api/customers` | Create customer |
| `GET /api/customers/:id` | Customer detail |
| `PATCH /api/customers/:id` | Update customer |
| `GET /api/customers/:id/transactions` | Customer ledger |
| `GET /api/bills` | List bills |
| `POST /api/bills` | Create bill (with optional file) |
| `GET /api/bills/:id/file` | Download bill file |
| `GET /api/payments` | List payments |
| `POST /api/payments` | Record payment |
| `GET /api/reports` | Generate report |
| `GET /api/notifications` | List notifications |
| `GET /api/audit-logs` | Audit log (owner only) |
| `GET /api/users` | List users (owner only) |
| `POST /api/users` | Create user (owner only) |
| `POST /api/mobile/sync` | Offline sync |
| `GET /api/health` | Health check |

All responses use a standard envelope:

```json
{
  "success": true,
  "message": "Readable message",
  "data": {},
  "errors": null
}
```

---

## Deployment

### Backend (Railway / Render / VPS)

1. Set all environment variables from `backend/.env.example` in your host's dashboard
2. Set `NODE_ENV=production`
3. Start command: `node src/server.js`
4. Run seed once after first deploy: `node src/scripts/seed.js`

### Frontend (Vercel / Netlify / static host)

1. Set `VITE_API_URL=https://your-backend-url/api`
2. Build command: `npm run build`
3. Output directory: `dist`
4. For SPA routing add a rewrite rule: `/* → /index.html`

---

## Notes

- Never commit `.env` files — they are in `.gitignore`
- `JWT_SECRET` should be at least 32 random characters in production
- Customer phone numbers are globally unique
- Bill files are stored in MongoDB (BillFile collection) — no disk storage needed
- If port 5000 is in use, change `PORT` in `backend/.env`
