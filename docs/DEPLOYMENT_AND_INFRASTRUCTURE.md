# Talaro Deployment & Infrastructure Guide

> **Current Target:** Railway (PostgreSQL + MedusaJS API)  
> **Future Target:** Supabase (Managed PostgreSQL, Connection Pooling, Studio UI, Realtime)

---

## 1. Overview & Strategy

Talaro is an open-source, AI-native local commerce network built on MedusaJS v2 and Next.js 16. It operates strictly as a discovery and walk-in connector layer with no payment gateway liabilities or platform checkout bottlenecks.

Because the system relies on standard PostgreSQL with transactional schema links, the database layer is completely portable:
- **Phase 1 (Current / Pilot):** Deploy on **Railway** for fast iteration, single-platform orchestration, and zero-overhead container management.
- **Phase 2 (Future / Scale):** Transition the database layer to **Supabase** for managed database operations, high-concurrency connection pooling, automated backups, and developer/operator GUI access via Supabase Studio.

---

## 2. Current Architecture: Railway (Pilot & Launch)

### 2.1 Topology on Railway

```
┌─────────────────────────────────────────────────────────────┐
│                      Railway Project                        │
│                                                             │
│  ┌───────────────────────┐        ┌──────────────────────┐  │
│  │   PostgreSQL Plugin   │◄───────┤     Backend API      │  │
│  │    (PostgreSQL 16)    │        │   (packages/api)     │  │
│  │   Internal Port 5432  │        │   Port 9000 (HTTP)   │  │
│  └───────────────────────┘        └──────────▲───────────┘  │
│                                              │              │
│                                              │ Internal/    │
│                                              │ Public API   │
│                                              │              │
│                                   ┌──────────▼───────────┐  │
│                                   │      Storefront      │  │
│                                   │  (apps/storefront)   │  │
│                                   │    Next.js 16 App    │  │
│                                   └──────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Why Railway for the Current Phase

1. **Integrated Private Networking:** Railway provides private DNS resolution between services (e.g. `postgres.railway.internal`), preventing database exposure to the public internet.
2. **Monorepo Support:** Railway natively handles Bun/Node workspaces and builds `packages/api` and `apps/storefront` from the same GitHub repository (`sanikeit/talaro`).
3. **Automated Migration Hook:** Database migrations run automatically during the pre-deploy build step using `bun x medusa db:migrate`.
4. **Predictable Pilot Costs:** Flat resource-based billing without surprise per-request fees.

### 2.3 Step-by-Step Railway Deployment Guide

Follow these steps in your Railway dashboard (`https://railway.com/project/06796ebb-182b-45f8-9a14-4613f61af8f0`):

#### Step 1: Add PostgreSQL Plugin
1. In your Railway project view, click **`+ New`** (top right) → **`Database`** → **`Add PostgreSQL`**.
2. Wait a few seconds for the PostgreSQL service to initialize. Railway will assign an internal domain (e.g. `postgres.railway.internal`).

#### Step 2: Configure Service Variables (Backend API)
Click on your backend service (`2ca49421-d9c0-4f11-8665-832ccbbb1752`) and open the **Variables** tab:
1. Click **`+ New Variable`** → Select **Add Reference**:
   - Name: `DATABASE_URL`
   - Value: `${{Postgres.DATABASE_URL}}`
2. Add the remaining required environment variables:
   ```env
   PORT=9000
   HOST=0.0.0.0
   JWT_SECRET=supersecret-jwt-token-replace-with-openssl-rand-32
   COOKIE_SECRET=supersecret-cookie-token-replace-with-openssl-rand-32
   STORE_CORS=*
   ADMIN_CORS=*
   AUTH_CORS=*
   STOREFRONT_URL=https://talaro.intellicraft.studio
   ```

#### Step 3: Configure Build & Start Commands (Settings Tab)
In your backend service, switch to the **Settings** tab:
1. **Source Repo:** `sanikeit/talaro` (Branch: `main`)
2. **Root Directory:** Leave empty (uses repo root where `railway.json` and `turbo.json` reside).
3. **Build Settings:**
   - **Builder:** `NIXPACKS` (or select `DOCKERFILE` if you prefer the Docker build).
   - **Custom Build Command:** (Optional if `railway.json` is committed, or set explicitly):
     ```bash
     bun install && bun run build
     ```
4. **Deploy Settings:**
   - **Custom Start Command:**
     ```bash
     cd packages/api && bun x medusa db:migrate && bun run start
     ```
   - **Healthcheck Path:** `/health`
   - **Healthcheck Timeout:** `300` seconds

#### Step 4: Generate Public Domain
Under the **Networking** section in Settings:
1. Click **`Generate Domain`** under *Public Networking*.
2. Railway will issue a public URL (e.g. `https://talaro-production.up.railway.app`).
3. Set `MEDUSA_BACKEND_URL` in the **Variables** tab to this generated URL.

#### Step 5: Trigger Deploy
1. Click **Deploy** or push your latest code to `main`.
2. Railway will:
   - Install dependencies with `bun install`.
   - Run Turborepo build (`turbo run build`).
   - Run database migrations (`medusa db:migrate`) on startup.
   - Start Medusa backend with admin (`/seller`), vendor (`/dashboard`), and root hub (`/`).
   - Verify health at `/health`.

---

### 2.4 Railway Environment Configuration Reference

#### Backend API (`packages/api`)
```env
# Database (Auto-provided by Railway PostgreSQL plugin)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Runtime Ports
PORT=9000
HOST=0.0.0.0

# CORS & Domain Configuration
STORE_CORS=https://talaro.store,http://localhost:8000
ADMIN_CORS=https://api.talaro.store,http://localhost:7002
AUTH_CORS=https://api.talaro.store,https://talaro.store,http://localhost:7002,http://localhost:8000

# Public URLs
MEDUSA_BACKEND_URL=https://api.talaro.store
STOREFRONT_URL=https://talaro.store

# Security Secrets (Generate using openssl rand -base64 32)
JWT_SECRET=your-32-char-jwt-secret
COOKIE_SECRET=your-32-char-cookie-secret
```

#### Storefront (`apps/storefront`)
```env
NEXT_PUBLIC_API_URL=https://api.talaro.store
NEXT_PUBLIC_DEFAULT_REGION=in
NEXT_PUBLIC_STORE_NAME=Talaro
```

---

## 3. Future Architecture: Supabase (Scaling Roadmap)

As Talaro scales beyond the pilot towards 100+ merchants and hundreds of daily courtesy holds, the PostgreSQL database layer is planned to migrate to **Supabase**.

### 3.1 Why Supabase in the Future?

| Feature | Railway PostgreSQL (Current) | Supabase (Future Target) |
|---|---|---|
| **Connection Pooling** | Direct connection | **Supavisor (PgBouncer)** handling 10,000+ concurrent connections without exhausting server limits |
| **Operator GUI** | CLI (`psql`) or external client | **Supabase Studio** for instant team access to view/audit `stock_hold`, `seller`, and `offer` records |
| **Backups & Recovery** | Standard snapshots | **Point-in-Time Recovery (PITR)** and automated daily logical backups |
| **Realtime WebSockets** | Not built-in | **Supabase Realtime** for live in-app notifications if merchant app moves beyond WhatsApp in v2 |
| **Row Level Security (RLS)** | Relies on application logic | **Hardware-enforced RLS policies** at the Postgres engine level |

### 3.2 Future Migration Plan (Railway → Supabase)

The migration requires **zero code changes** in the backend because MedusaJS v2 is ORM-agnostic and interfaces directly with standard PostgreSQL:

1. **Step 1: Provision Supabase Project**
   - Create a project on [supabase.com](https://supabase.com) in the target region (e.g., `ap-south-1` Mumbai for Indian traffic latency).
2. **Step 2: Obtain Connection URI**
   - Use the **Session Pooler** (port 5432) or **Direct Connection** URI from Supabase Settings:
     ```env
     DATABASE_URL=postgresql://postgres.[project-ref]:[db-password]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require
     ```
3. **Step 3: Export & Restore Data**
   ```bash
   # 1. Dump Railway database
   pg_dump -d "$RAILWAY_DATABASE_URL" --no-owner --no-privileges -f talaro_backup.sql

   # 2. Restore into Supabase
   psql -d "$SUPABASE_DATABASE_URL" -f talaro_backup.sql
   ```
4. **Step 4: Update Backend Environment**
   - Update `DATABASE_URL` in the hosting environment to point to Supabase.
   - Re-deploy backend (`packages/api`).

---

## 4. Operational Runbook

### Running Migrations Manually
```bash
cd packages/api
bun x medusa db:migrate
```

### Seeding Initial Demo Data (Dev / Staging)
```bash
cd packages/api
bun run medusa exec ./src/scripts/seed-bootstrap-invites.ts
bun run medusa exec ./src/scripts/seed.ts
```

### Running Automated Test Suite
```bash
# Verify Hold System (9 tests)
python3 packages/api/src/scripts/verify-hold-system.py

# Verify All Public & Vendor Regressions (34 tests)
python3 packages/api/src/scripts/verify-public-apis.py
python3 packages/api/src/scripts/verify-inr-lock.py
python3 packages/api/src/scripts/verify-address-and-filters.py
python3 apps/storefront/scripts/verify-storefront-sellers.py
python3 packages/api/src/scripts/verify-search.py
```
