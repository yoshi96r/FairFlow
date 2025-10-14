# FairFlow Logistics Management App

Monorepo with:
- API (Express + Prisma + WebSocket live tracking + JWT driver auth)
- Web (Next.js + MapLibre live map + reverse proxy + WebSocket proxy)
- Driver (Expo app with background location to stream GPS)

## Quick start

```bash
docker compose up -d
pnpm i
cp .env.example .env

# migrate schema
pnpm --filter @fairflow/api prisma migrate dev --name init
pnpm --filter @fairflow/api prisma db seed

# in two terminals
pnpm --filter @fairflow/api dev
pnpm --filter @fairflow/web dev
```

Open http://localhost:3001/track for the live map.

## Driver app (Expo)

Update the API base if not using proxy. Run on emulator/device, login with any phone, it will start background tracking.

---

## Deploy to Render (One‑Click)

1. Push this repo to GitHub.
2. Click **New +** → **Blueprint** on Render and point it at your repo. Render will detect `render.yaml`.
3. Provision:
   - **PostgreSQL** will be created automatically.
   - **fairflow-api** and **fairflow-web** will be deployed.
4. Set environment:
   - `JWT_SECRET` is auto‑generated.
   - The web service gets `API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` from the API service URL.
5. Trigger build. When live, open the **web** service URL and navigate to `/track`.

### Optional: GitHub Actions auto‑deploy
- Add the following **Repo Secrets**:
  - `RENDER_API_KEY` – from your Render account settings.
  - `RENDER_API_SERVICE_ID` – from the API service dashboard URL.
  - `RENDER_WEB_SERVICE_ID` – from the Web service dashboard URL.
- Push to `main` → CI builds and triggers Render deploys.


---

## Staging → Production (Render, Blue/Green-style Promotion)

This repo's `render.yaml` defines **two stacks**:
- **Production**: `fairflow-api`, `fairflow-web`, `fairflow-db` (autoDeploy: false)
- **Staging**: `fairflow-api-staging`, `fairflow-web-staging`, `fairflow-db-staging` (autoDeploy: true)

### How it works
- **On push to `main`**: GitHub Actions builds and **deploys staging**.
- After you test `fairflow-web-staging`, approve the **`approve-and-promote`** job to trigger **production** deploys.

### Required GitHub Secrets
- `RENDER_API_KEY`
- `RENDER_API_SERVICE_ID_STAGING`, `RENDER_WEB_SERVICE_ID_STAGING`
- `RENDER_API_SERVICE_ID_PROD`, `RENDER_WEB_SERVICE_ID_PROD`

### One-time setup
1. In Render: **New → Blueprint** → point to this repo (`render.yaml`). This creates all 4 services + 2 databases.
2. In GitHub: add the secrets above (grab Service IDs from each Render service dashboard).
3. Protect the **`production`** environment (requires manual approval).



---

## Custom Domains & HTTPS (free on Render)
We mapped:
- **Production**: `api.fairflowlogistics.com`, `app.fairflowlogistics.com`, and marketing `www.fairflowlogistics.com`
- **Staging**: `staging-api.fairflowlogistics.com`, `staging.fairflowlogistics.com`

### DNS Steps
1. In Render → each service → **Custom Domains**: add the domain above.
2. Render gives you a **CNAME**. Add it at your domain registrar (e.g., Cloudflare, Google Domains).
3. Wait for DNS to propagate; Render will auto-issue TLS certs (HTTPS).

### Why this matters
- Enforces secure `https://` + `wss://` for WebSockets and mobile apps.
- Cleaner URLs for drivers/dispatchers.
- Lets you separate marketing (`www`) from the app (`app`).

---

## Migration Guard (free)
CI checks **staging vs prod** schemas with `prisma migrate diff`. If destructive, the job fails and prod is not deployed.

---

## Health Check & Canary Warm-up (free)
- `/api/healthz` verifies DB connectivity.
- CI hits health check and preloads common API calls to ensure the new version is warm before traffic.

