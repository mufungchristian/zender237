# Zender237 — Money Transfer & Diaspora Services Platform

**Mali · Guinea · Cameroon**

A full-stack web application for money transfers, deposits, withdrawals, loans, and diaspora services across West and Central Africa. Built with React + Vite (frontend), Node.js + Express + TypeScript (backend), PostgreSQL (database), and Firebase (push notifications + file storage).

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Quick Start (Demo Mode)](#quick-start-demo-mode)
5. [Production Setup (PostgreSQL)](#production-setup-postgresql)
6. [Default Credentials](#default-credentials)
7. [Architecture](#architecture)
8. [API Reference](#api-reference)
9. [Deploy to Render](#deploy-to-render)
10. [Screenshots](#screenshots)
11. [Troubleshooting](#troubleshooting)

---

## Features

### Customer App
- **Home dashboard** — dark balance card, GOLD/SILVER/BRONZE tier badge, three colored action buttons (Deposit green / Transfer amber / Withdraw red), today's exchange rates, recent transactions with status icons
- **Deposit** — send money to a payment number, upload proof of payment, track status through approval workflow
- **Transfer** — send money between Mali, Guinea, and Cameroon with automatic currency conversion and fee calculation
- **Withdraw** — request a cash withdrawal to a receiver number
- **Finance & Loans** — borrow money (tier-based interest: GOLD 5% / SILVER 10% / BRONZE 15%) and borrow flight tickets (GOLD members get 1 month free accommodation). ID document upload required. Requests redirect to admin-configurable WhatsApp contact for finalization
- **KmerDiaspora** — 4 services matching the static demo: Need a position (job/position abroad), Need a driver (trusted driver request), Quests (browse community quests/errands), Active Quests (track accepted/posted quests). Each opens a form or browser; submissions redirect to WhatsApp with prefilled message
- **Chat** — real in-app chat interface with admin/customer messaging (message list, input box, auto-poll every 4 seconds), plus FAQ accordion (4 Q&As in EN/FR) and WhatsApp as a secondary contact option
- **Profile** — view/edit personal info, change password, language toggle (EN/FR), dark/light mode toggle, admin dashboard link
- **Transactions** — full transaction history with type filters, transaction detail with status history and proof upload
- **Country code dropdown** — login and register pages include a country code selector for the 3 supported countries: Mali (+223), Guinea (+224), Cameroon (+237)
- **WhatsApp OTP verification** — new accounts verify their WhatsApp number with a 6-digit code. The code is generated server-side and relayed to the admin/staff in-app (with a WhatsApp deep link). Demo mode returns the code directly for testing
- **Dark / Light mode** — toggle on all sections (home, chat, diaspora, finance, profile, admin)
- **Bilingual** — English / French (Français) toggle on every page
- **Bottom navigation** — 5 tabs matching the static demo: Home, Finance, KmerDiaspora, Chat, Profile

### Admin / Staff Panel
- **Dashboard** — KPI stats (total users, transactions, pending, completed, volume, borrow requests), recent transactions table, recent borrow requests table
- **Transactions** — filter by status, view details, approve / reject / complete / cancel with admin notes
- **Borrow requests** — filter by status, view ID images, approve / reject / complete
- **Chat** — two-pane chat console: conversation list (with unread badges) on the left, message thread + reply input on the right. Auto-polls every 5 seconds
- **Payment numbers** — CRUD for mobile money numbers (Orange Money, Moov Money, MTN, etc.) with daily limits
- **Rates & Tariffs** — manage exchange rates (XOF/XAF/GNF) and fee tariffs
- **Users** — CRUD for users (create, edit role/tier/balance, deactivate)
- **Audit log** — read-only log of all admin actions
- **Settings** — configure admin WhatsApp number (used for all redirects), toggle maintenance mode
- **Responsive design** — sidebar collapses into a hamburger-menu drawer on narrow screens; tables scroll horizontally; works on mobile, tablet, and desktop
- **Dark / Light mode + EN/FR** — theme and language toggles in the admin top bar

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (with in-memory fallback for demo mode) |
| Auth | JWT + bcrypt (backend-managed; Firebase Auth NOT used) |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| File Storage | Firebase Storage (with data-URL fallback for demo mode) |
| Validation | Zod |
| File Uploads | Multer |
| Hosting | Render (web service + static site) |

---

## Project Structure

```
zender237-app/
├── backend/                    # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── config/             # Firebase Admin init + config loader
│   │   ├── db/                 # In-memory store, PostgreSQL store, schema
│   │   ├── middleware/         # Auth (JWT), error handling, validation
│   │   ├── routes/             # Auth, users, transactions, borrow, numbers,
│   │   │                       # rates, uploads, admin, settings, config
│   │   ├── services/           # Workflow engine (status transitions)
│   │   ├── types/              # Domain types
│   │   └── server.ts           # Express app entry point
│   ├── db/schema.sql           # PostgreSQL schema
│   ├── dist/                   # Compiled JS (auto-generated)
│   ├── .env                    # Environment variables (Firebase + DB)
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/         # BrandHeader, BottomNav, UI helpers
│   │   ├── context/            # Theme, I18n, Auth contexts
│   │   ├── pages/
│   │   │   ├── customer/       # Login, Home, Finance, Diaspora, FAQ,
│   │   │   │                   # Chat, Profile, Transactions, Detail
│   │   │   └── admin/          # AdminLogin, Layout, Dashboard,
│   │   │                       # Transactions, Borrows, Numbers, Rates,
│   │   │                       # Users, Audit, Settings
│   │   ├── api/client.ts       # Axios API client
│   │   ├── types.ts            # Frontend types
│   │   ├── styles/global.css   # Global styles + dark mode
│   │   ├── App.tsx             # Router + route guards
│   │   └── main.tsx            # React entry point
│   ├── dist/                   # Production build (auto-generated)
│   ├── .env                    # VITE_API_URL
│   ├── package.json
│   └── vite.config.ts
├── screenshots/                # UI screenshots of each section
├── .env.example                # Environment variable template
├── render.yaml                 # Render deployment blueprint
└── README.md                   # This file
```

---

## Quick Start (Demo Mode)

The app runs in **demo mode** without any database — it uses an in-memory store with seeded data. This is the fastest way to try it locally.

### Prerequisites
- Node.js 18+ and npm
- Git

### 1. Start the Backend

```bash
cd backend
npm install
npm run build
npm start
```

The backend starts on **http://localhost:8090**. You should see:

```
[firebase] Admin SDK initialized (FCM + Storage)
[store] Using in-memory store (demo mode)
Zender237 backend listening on :8090
Mode: development | Store: memory | Firebase: on
```

> **Note:** If Firebase credentials are missing or the Storage bucket doesn't exist, the app degrades gracefully — uploads return data URLs and push notifications are skipped. The app remains fully functional.

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on **http://localhost:5173** and proxies `/api` requests to the backend automatically.

### 3. Open the App

- **Customer app:** http://localhost:5173
- **Admin panel:** http://localhost:5173/admin/login

---

## Production Setup (PostgreSQL)

To use a real PostgreSQL database instead of in-memory mode:

### 1. Create the database and run migrations

```bash
cd backend
# Set DATABASE_URL in .env
DATABASE_URL=postgresql://user:password@host:5432/zender237

# Run schema migration
npm run migrate

# Seed default data (users, payment numbers, rates, sample transactions)
npm run seed
```

### 2. Restart the backend

The backend detects `DATABASE_URL` automatically and switches from in-memory to PostgreSQL mode. You should see:

```
[store] Using PostgreSQL store
Zender237 backend listening on :8090
Mode: production | Store: postgres | Firebase: on
```

---

## Default Credentials

The app is seeded with three demo accounts (available in both demo mode and after running `npm run seed`):

| Role | Phone | Password | Notes |
|------|-------|----------|-------|
| Customer | `+22370000000` | `demo1234` | GOLD tier, Mali (ML) |
| Admin | `+237700000001` | `admin123` | Full admin access |
| Partner | `+237700000002` | `partner123` | Staff role, Cameroon (CM) |

**Admin WhatsApp contact:** `+237700000001` (used for all WhatsApp redirects — borrow, chat, diaspora. Editable in Admin → Settings).

**Customer login:** http://localhost:5173/login
**Admin/Staff login:** http://localhost:5173/admin/login

> **Note on login form:** the login and register pages include a country code dropdown (Mali +223, Guinea +224, Cameroon +237). Select the matching country code, then enter the local phone number without the country code (e.g. select +223 and type `70000000`). Demo credential chips fill these automatically.

---

## Architecture

### Authentication (Backend-Managed)

Authentication is handled entirely by the backend using **JWT + bcrypt** — Firebase Auth is NOT used. This approach was chosen for simplicity and full control over the auth flow.

- Passwords are hashed with bcrypt (10 rounds)
- JWT tokens are signed with `JWT_SECRET` and expire after 7 days
- Tokens are sent in the `Authorization: Bearer <token>` header
- Role-based access control: `user`, `staff`, `admin`

### Firebase Integration

Firebase is used for **two purposes only**:
1. **FCM (Cloud Messaging)** — push notifications when transaction/borrow status changes
2. **Storage** — receipt and proof-of-payment image uploads

The Firebase **Web SDK config** (apiKey, authDomain, etc.) is exposed to the frontend via the `GET /api/config` endpoint.

### Graceful Degradation

The app is designed to work without external dependencies:

| Dependency Missing | Behavior |
|-------------------|----------|
| `DATABASE_URL` empty | Uses in-memory store with seeded demo data |
| Firebase credentials missing | Push notifications skipped, uploads return data URLs |
| Firebase Storage bucket missing | Uploads fall back to base64 data URLs |

This means the app is **fully functional in demo mode** — you can test all features without a database or Firebase Storage bucket.

### Transaction Workflow

Transactions follow a status workflow:

```
draft → pending → awaiting_payment → awaiting_proof → under_review → approved → completed
                                                                                    ↘ rejected
                                                                                    ↘ cancelled
```

Admins/staff can transition statuses via `PATCH /api/transactions/:id/status`.

### Tier System

| Tier | Interest Rate | Max Duration | Special Benefit |
|------|--------------|--------------|-----------------|
| BRONZE | 15% | 6 months | — |
| SILVER | 10% | 12 months | — |
| GOLD | 5% | 24 months | 1 month free accommodation (flight tickets) |

### WhatsApp Redirect

Borrow money, borrow flight ticket, chat, and diaspora contact all redirect to an **admin-configurable WhatsApp number**. The admin can change this number in **Admin → Settings → WhatsApp contact**. The default is `+237700000001`.

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login (phone + password) |
| POST | `/api/auth/register` | Register new customer |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/device-token` | Register FCM device token |
| POST | `/api/auth/password` | Change password |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transactions/deposit` | Create deposit |
| POST | `/api/transactions/transfer` | Create transfer |
| POST | `/api/transactions/withdraw` | Create withdrawal |
| GET | `/api/transactions` | List transactions |
| GET | `/api/transactions/:id` | Transaction detail |
| POST | `/api/transactions/:id/proof` | Upload proof of payment |
| PATCH | `/api/transactions/:id/status` | Update status (staff/admin) |

### Borrow
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/borrow/money` | Request to borrow money |
| POST | `/api/borrow/flight-ticket` | Request flight ticket |
| GET | `/api/borrow` | List borrow requests |
| GET | `/api/borrow/:id` | Borrow detail |
| PATCH | `/api/borrow/:id/status` | Update borrow status (staff/admin) |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/numbers` | List payment numbers |
| GET | `/api/rates` | List exchange rates |
| POST | `/api/uploads` | Upload file (returns URL) |
| GET | `/api/notifications` | List notifications |
| GET | `/api/config` | Firebase web config (public) |
| GET | `/api/admin/dashboard` | Admin dashboard stats |
| GET | `/api/admin/users` | List all users |
| GET | `/api/settings` | Get app settings |
| PUT | `/api/settings` | Update settings (admin) |

---

## Deploy to Render

> 📖 **A complete step-by-step walkthrough is in [`RENDER_DEPLOYMENT_GUIDE.md`](./RENDER_DEPLOYMENT_GUIDE.md).** It covers every click, every input, troubleshooting, and post-deployment production tips. Read that guide before deploying.

This project includes a `render.yaml` blueprint for one-click deployment. It defines three resources:

| Resource | Type | Purpose |
|----------|------|---------|
| `zender237-db` | PostgreSQL | Managed database (auto-linked to backend) |
| `zender237-backend` | Node web service | Express API on port 8090 |
| `zender237-frontend` | Static site | React build served via CDN |

### Quick Steps

1. **Unzip** `zender237-app.zip` and **push the `zender237-app/` folder to a GitHub repo** (set the repo to Private — it contains Firebase keys in `backend/.env`).

2. **Create a Blueprint on Render:**
   - Go to https://dashboard.render.com → **New** → **Blueprint**
   - Authorize Render to access your GitHub repos, then select `zender237-app`
   - Render detects `render.yaml` and shows the three resources it will create.

3. **Enter the four Firebase secret variables** (Render prompts for them because they're marked `sync: false`):
   - `FIREBASE_PROJECT_ID` = `zender237-309ae`
   - `FIREBASE_CLIENT_EMAIL` = `firebase-adminsdk-fbsvc@zender237-309ae.iam.gserviceaccount.com`
   - `FIREBASE_PRIVATE_KEY` = the full key from `backend/.env` (keep the `\n` escapes as literal text, **no surrounding quotes**)
   - `FIREBASE_STORAGE_BUCKET` = `zender237-309ae.firebasestorage.app`

   All other variables (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `NODE_ENV`, `ADMIN_WHATSAPP`, `VITE_API_URL`) are filled in automatically by the blueprint.

4. **Click Apply** — Render builds and deploys all three resources. The backend auto-runs `npm run migrate` (creates 13 tables) and `npm run seed` (inserts demo users + data) on first deploy.

5. **Verify** — open `https://zender237-backend.onrender.com/health` (should show `"store":"postgres"`) and `https://zender237-frontend.onrender.com` (the login page).

> ⚠️ **Critical:** the frontend `VITE_API_URL` is set to `https://zender237-backend.onrender.com/api` (with the `/api` suffix). Omitting `/api` causes 404 errors on every API call. The blueprint already has this correct.

> ⏳ **Free tier:** the backend sleeps after 15 min of inactivity and takes ~30–60s to wake. The free PostgreSQL database is deleted after 90 days — upgrade before then for production.

### Manual Deployment (without blueprint)

If you prefer to set up services manually:

1. **Database:** Create a PostgreSQL database on Render. Note the internal connection string.

2. **Backend:**
   - Create a new Web Service → Node.js
   - Root directory: `backend`
   - Build: `npm install && npm run build`
   - Start: `npm run migrate && npm start`
   - Set all environment variables from `.env.example`

3. **Frontend:**
   - Create a new Static Site
   - Root directory: `frontend`
   - Build: `npm install && npm run build`
   - Publish directory: `dist`
   - Set `VITE_API_URL` to the backend URL
   - Add a rewrite rule: `/*` → `/index.html` (for SPA routing)

---

## Screenshots

All screenshots are in the `screenshots/` directory:

| File | Description |
|------|-------------|
| `01_login.png` | Customer login page |
| `02_home.png` | Home dashboard (light mode) |
| `03_finance.png` | Finance & Loans (borrow money + flight ticket) |
| `04_diaspora.png` | KmerDiaspora services |
| `05_faq.png` | FAQ accordion |
| `06_chat.png` | Chat (WhatsApp redirect) |
| `07_profile.png` | Profile page |
| `08_transactions.png` | Transactions list |
| `09_darkmode_home.png` | Home in dark mode |
| `10_darkmode_diaspora.png` | KmerDiaspora in dark mode |
| `11_darkmode_faq.png` | FAQ in dark mode |
| `12_admin_login.png` | Admin/Staff login |
| `13_admin_dashboard.png` | Admin dashboard with KPIs |
| `14_admin_transactions.png` | Admin transactions management |
| `15_admin_borrows.png` | Admin borrow requests |
| `16_admin_numbers.png` | Admin payment numbers CRUD |
| `17_admin_rates.png` | Admin rates & tariffs |
| `18_admin_users.png` | Admin user management |
| `19_admin_audit.png` | Admin audit log |
| `20_admin_settings.png` | Admin settings (WhatsApp + maintenance) |

---

## Troubleshooting

### Backend won't start
- Check that port 8090 is not in use: `lsof -i :8090`
- Ensure `.env` exists in the `backend/` directory (copy from `.env.example`)
- Check logs: `cat /tmp/backend.log`

### Frontend can't connect to backend
- Ensure backend is running on port 8090
- Check `vite.config.ts` proxy settings
- In production, ensure `VITE_API_URL` is set correctly

### Firebase Storage upload fails
- The Firebase Storage bucket may not exist yet. The app falls back to data URLs automatically.
- To use Firebase Storage: go to Firebase Console → Storage → Get Started → create the bucket.

### Database connection fails
- Verify `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- For Render: use the **internal** connection string (not external)
- Run `npm run migrate` to create tables

### "Transaction not found" after restart
- In demo (in-memory) mode, data is lost on restart. Use PostgreSQL mode for persistent data.

---

## License

Proprietary — © Zender237. All rights reserved.
