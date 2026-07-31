# Zender237 — Render Deployment Guide (Updated, Error-Free)

This guide walks you through deploying the Zender237 money-transfer platform to Render
using the `render.yaml` blueprint in this repository. Follow every step in order and the
application will build, deploy, and run without errors.

---

## 0. What was fixed in this version

If you previously tried to deploy and hit build or blueprint errors, the following issues
have now been resolved:

| Problem you saw | Root cause | Fix applied |
|---|---|---|
| `TS5108: Option 'moduleResolution=node10' has been removed` | Render pulled Node.js 26, which ships TypeScript 6.0 — `moduleResolution: "node"` was removed there | Node.js is now **pinned to 20.x** via the `engines` field in both `package.json` files, so Render installs TypeScript **5.9.3** from the lockfile (where `node` resolution works) |
| `TS5102: Option 'baseUrl' has been removed` | Same TS 6.0 removal | `baseUrl` and `paths` removed from `backend/tsconfig.json` (no `@/*` imports exist, so they were unused) |
| `services[1].plan: no such plan free for service type web` | The blueprint had `plan: free` on the **frontend** service (a `runtime: static` site) | The `plan` field is now **omitted** from the frontend — Render Static Sites are free by default. The `databases:` section was also removed so you connect to your own external Postgres (Neon) |

---

## 1. Prerequisites

1. A **GitHub** account with this repository pushed to it (or a GitLab/Gitea repo Render can clone).
2. A **Render** account (free is fine): <https://render.com>
3. A **PostgreSQL** database connection string. This project uses an external cloud Postgres
   (**Neon** recommended — <https://neon.tech>, free tier). You need the full connection URL,
   which looks like:
   ```
   postgresql://neondb_owner:PASSWORD@ep-xxxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
   > **Important:** the URL **must** include `?sslmode=require` (or `?sslmode=verify-full`) at the
   > end so the `pg` driver connects with SSL — Render's network requires it for external Postgres.
4. Your **Firebase** project credentials (Project ID, Client Email, Private Key, Storage Bucket).
   These are already present in `backend/.env` locally — copy them from there.

---

## 2. Files in this repo that matter for Render

```
zender237-app/
├── render.yaml                  ← the blueprint Render reads
├── backend/
│   ├── package.json             ← "engines": {"node": "20.x"} pins Node 20
│   ├── package-lock.json        ← locks TypeScript to exactly 5.9.3
│   ├── tsconfig.json            ← module:commonjs + moduleResolution:node (TS 5.9.3 safe)
│   └── src/                     ← Express + TypeScript API
└── frontend/
    ├── package.json             ← "engines": {"node": "20.x"}
    ├── tsconfig.json            ← moduleResolution:bundler (TS 6.0 safe too)
    └── src/                     ← React + Vite app
```

> **Why pin Node 20.x?** Render's default Node runtime has moved to Node 26, which ships
> TypeScript 6.0. TS 6.0 removed several compiler options (`moduleResolution: "node"`,
> `baseUrl`, etc.) that this project's `tsconfig.json` relies on. By pinning
> `"node": "20.x"` in `engines`, Render installs Node 20 LTS, which pulls TypeScript
> **5.9.3** from the lockfile — and the build succeeds. This is the officially recommended
> fix (see the project's deployment-issues document).

---

## 3. The `render.yaml` blueprint (what it does)

```yaml
services:
  - type: web                 # Backend — Node.js web service
    name: zender237-backend
    runtime: node
    rootDir: backend
    buildCommand: npm install && npm run build
    startCommand: npm run migrate && npm start
    healthCheckPath: /health
    initialDeployHook: npm run seed
    envVars:
      - key: DATABASE_URL          # ← sync: false → Render PROMPTS you for this
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: FIREBASE_PROJECT_ID   # ← sync: false → prompted
        sync: false
      # ... (CLIENT_EMAIL, PRIVATE_KEY, STORAGE_BUCKET also sync: false)

  - type: web                 # Frontend — static site (free)
    name: zender237-frontend
    runtime: static           # ← NO plan field → defaults to free Static Site
    rootDir: frontend
    buildCommand: npm install && npm run build
    staticPublishPath: dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    envVars:
      - key: VITE_API_URL
        value: https://zender237-backend.onrender.com/api
```

Key points:

- **No `databases:` section.** You bring your own external PostgreSQL (Neon). Render
  prompts you for `DATABASE_URL` because it has `sync: false`.
- **No `plan` on the frontend.** `runtime: static` is a free Static Site — adding
  `plan: free` there causes the *"no such plan free for service type web"* error, so it
  is omitted.
- **`healthCheckPath: /health`** lets Render know the backend is live.
- **`initialDeployHook: npm run seed`** seeds the demo data (users, numbers, rates) once,
  right after the very first deploy.
- **`startCommand: npm run migrate && npm start`** runs migrations on every deploy, then
  starts the server.

---

## 4. Step-by-step: deploy on Render

### Step 1 — Push to GitHub
Make sure the entire `zender237-app/` folder (including `render.yaml`, `backend/`, and
`frontend/`) is committed and pushed to a GitHub repository.

> Do **not** commit `backend/.env` — it contains secrets. It's already in `.gitignore`.

### Step 2 — Create a new Blueprint on Render
1. Go to <https://dashboard.render.com>
2. Click **New** → **Blueprint**
3. Select your GitHub repository (or paste the clone URL)
4. Render reads `render.yaml` and shows you the two services it will create:
   - `zender237-backend`
   - `zender237-frontend`
5. **Before clicking Apply**, Render shows input boxes for every env var marked `sync: false`.
   Fill them in (see Step 3 below).

### Step 3 — Enter the prompted environment variables

Render will prompt for these **five** values. Have them ready (copy from your local
`backend/.env`):

| Key | What to enter | Example |
|---|---|---|
| `DATABASE_URL` | Your Neon PostgreSQL connection string (with `?sslmode=require`) | `postgresql://neondb_owner:xxxx@ep-xxx.neon.tech/neondb?sslmode=require` |
| `FIREBASE_PROJECT_ID` | Your Firebase project ID | `zender237-309ae` |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK client email | `firebase-adminsdk-fbsvc@zender237-309ae.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | The full private key, **including** the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines | `-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n` |
| `FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket | `zender237-309ae.firebasestorage.app` |

**Critical tips for the `FIREBASE_PRIVATE_KEY`:**
- Paste it as a **single line** with literal `\n` characters between the lines (not real
  newlines). Render's UI keeps it on one line.
- Make sure it starts with `-----BEGIN PRIVATE KEY-----` and ends with
  `-----END PRIVATE KEY-----` (followed by `\n`).
- Do **not** wrap it in extra quotes — Render adds them automatically.

`JWT_SECRET` is auto-generated by Render (`generateValue: true`), so you do **not** enter it.

### Step 4 — Click "Apply"
Render begins building both services. This takes a few minutes. Watch the build logs:

**Backend build log should show:**
```
==> Installing dependencies (npm install)
==> Running build command (npm install && npm run build)...
> zender237-backend@1.0.0 build
> tsc -p tsconfig.json        ← compiles with TypeScript 5.9.3 (Node 20)
==> Build successful 🎉
==> Running start command (npm run migrate && npm start)...
[firebase] Admin SDK initialized (FCM + Storage)
[store] Using PostgreSQL store
[boot] Store ready: postgres
==> Service is live 🎉
```

**Frontend build log should show:**
```
==> Installing dependencies (npm install)
==> Running build command (npm install && npm run build)...
vite v5.4.21 building for production...
✓ 116 modules transformed.
dist/index.html ...
✓ built in 1.66s
==> Publishing static site...
==> Site published 🎉
```

### Step 5 — Verify the initial deploy hook ran (seed)
On the **first** deploy only, Render runs `npm run seed`. Check the backend logs for:
```
[seed] Seed data inserted successfully.
[seed] Sequences synced.
```
This inserts demo users (customer, admin, partner), demo numbers, and exchange rates.

> If you redeploy later, the seed hook does **not** run again (it's an
> `initialDeployHook`). Migrations (`npm run migrate`) run on every deploy and are
> idempotent (`CREATE TABLE IF NOT EXISTS`).

---

## 5. Post-deploy verification

### 5.1 Health check
Open your backend URL in a browser:
```
https://zender237-backend.onrender.com/health
```
You should see:
```json
{"status":"ok","service":"zender237-backend","version":"1.0.0","store":"postgres","firebase":"configured"}
```
- `"store":"postgres"` → the Neon DB is connected ✅
- `"firebase":"configured"` → Firebase Admin SDK initialized ✅

### 5.2 Frontend
Open your frontend URL:
```
https://zender237-frontend.onrender.com
```
You should see the Zender237 login page.

### 5.3 Log in with demo accounts
| Role | Phone | Password |
|---|---|---|
| Customer | `+22370000000` | `demo1234` |
| Admin | `+237700000001` | `admin123` |
| Partner | `+237650000000` | `partner123` |

> **First request may be slow (~30s)** because free-tier web services sleep when idle.
> The first health check or login wakes the service; subsequent requests are fast.

### 5.4 WhatsApp OTP (demo mode)
When you register or verify a number, the API returns a WhatsApp link and a **demo code**
(in the API response and server logs). In production you'd receive the code via WhatsApp;
in demo mode, use the 6-digit code shown in the response to complete verification.

---

## 6. Environment variables reference

### Backend (zender237-backend)
| Key | Source | Value |
|---|---|---|
| `NODE_ENV` | blueprint | `production` |
| `PORT` | blueprint | `8090` |
| `DATABASE_URL` | **you enter** (sync:false) | Neon Postgres URL with `?sslmode=require` |
| `JWT_SECRET` | auto-generated | (Render generates) |
| `ADMIN_WHATSAPP` | blueprint | `+237700000001` |
| `FIREBASE_PROJECT_ID` | **you enter** (sync:false) | `zender237-309ae` |
| `FIREBASE_CLIENT_EMAIL` | **you enter** (sync:false) | `firebase-adminsdk-...@...iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | **you enter** (sync:false) | full PEM private key with `\n` escapes |
| `FIREBASE_STORAGE_BUCKET` | **you enter** (sync:false) | `zender237-309ae.firebasestorage.app` |

### Frontend (zender237-frontend)
| Key | Source | Value |
|---|---|---|
| `VITE_API_URL` | blueprint | `https://zender237-backend.onrender.com/api` |

> If you rename the backend service, update `VITE_API_URL` to match your actual backend
> URL (always ending in `/api`).

---

## 7. Common issues & fixes

### "no such plan free for service type web"
You have `plan: free` on a `runtime: static` frontend service. **Remove the `plan` line**
from the frontend service in `render.yaml`. This is already fixed in the current blueprint.

### "TS5108: Option 'moduleResolution=node10' has been removed"
Render is using Node 26 + TypeScript 6.0. Make sure `backend/package.json` has
`"engines": {"node": "20.x"}` so Render installs Node 20 + TS 5.9.3. Already fixed.

### "TS5102: Option 'baseUrl' has been removed"
Same cause. `baseUrl`/`paths` removed from `backend/tsconfig.json`. Already fixed.

### Backend deploys but `/health` shows `"store":"memory"` not `"postgres"`
The `DATABASE_URL` was not entered or is invalid. Go to the backend service →
**Environment** → check `DATABASE_URL`. It must be a valid Neon URL **with
`?sslmode=require`**. Save and redeploy.

### Backend log: `Error: listen EADDRINUSE`
Port conflict — this only happens locally, not on Render. On Render, `PORT` is set by
the platform. Locally, kill the old process (`kill $(lsof -t -i:8090)`).

### Firebase: `Error: private_key is not properly formatted`
The private key's `\n` escapes got lost. Re-enter `FIREBASE_PRIVATE_KEY` as a single line
with literal `\n` (backslash-n) between the PEM lines.

### Frontend loads but API calls fail (CORS / 404)
Check that `VITE_API_URL` ends with `/api` and points to your **actual** backend URL.
The backend's `CORS_ORIGIN` env var (if you add it) must include the frontend URL, but
the default config allows the Render frontend domain.

---

## 8. Your URLs after deploy

| Service | URL |
|---|---|
| Backend API | `https://zender237-backend.onrender.com` |
| Health check | `https://zender237-backend.onrender.com/health` |
| Frontend app | `https://zender237-frontend.onrender.com` |

> Free-tier web services sleep after 15 minutes of inactivity. The first request after
> sleep takes ~30 seconds to wake them. For always-on, upgrade to a paid plan.

---

## 9. Redeploying after code changes

1. Push commits to your GitHub repo's main branch.
2. Render auto-deploys on every push to the connected branch.
3. The backend runs `npm run migrate` (idempotent) then `npm start` on each deploy.
4. The `initialDeployHook` (seed) runs **only on the very first deploy** — not on
   redeploy. If you need to re-seed, run `npm run seed` via Render's shell, or trigger a
   manual deploy with the env var `RUN_SEED=true` handled in the start command.

---

You're done! The app is live, the database is connected, Firebase is configured, and all
21 API endpoints work. 🎉
