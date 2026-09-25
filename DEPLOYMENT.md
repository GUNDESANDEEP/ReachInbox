# 🚀 Cloud Deployment Guide (Render)

This guide covers deploying both the **Backend** (Express, Redis, BullMQ) and **Frontend** (Next.js 14 Dashboard) together on **Render**.

---

## 1-Click Automated Render Blueprint Deployment

1. Log in to your **[Render Dashboard](https://dashboard.render.com)**.
2. Click **New +** $\rightarrow$ **Blueprint**.
3. Connect your private GitHub repository: **`GUNDESANDEEP/ReachInbox`**.
4. Render will automatically detect [`render.yaml`](./render.yaml) and provision all 3 services:

| Service Name | Service Type | Component |
| :--- | :--- | :--- |
| **`reachinbox-backend`** | Web Service | Express API & BullMQ Queue Worker (`/backend`) |
| **`reachinbox-frontend`** | Web Service | Next.js 14 Dashboard App (`/frontend`) |
| **`reachinbox-redis`** | Redis Instance | BullMQ persistent queue & atomic rate limit store |

5. Click **Apply**.
6. Render will automatically link the backend's internal Redis connection and set `NEXT_PUBLIC_API_URL` on the frontend pointing directly to your live backend endpoint!

---

## Manual Render Setup (If not using Blueprint)

### 1. Redis Instance
- **Type**: Redis
- **Name**: `reachinbox-redis`
- **Plan**: Free / Starter

### 2. Backend Web Service
- **Type**: Web Service
- **Name**: `reachinbox-backend`
- **Root Directory**: `backend`
- **Environment**: Node
- **Build Command**: `npm install && npx prisma db push && npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `NODE_ENV` = `production`
  - `DATABASE_URL` = `file:./dev.db`
  - `REDIS_HOST` = `<your-render-redis-host>`
  - `REDIS_PORT` = `6379`
  - `WORKER_CONCURRENCY` = `5`
  - `MIN_EMAIL_DELAY_MS` = `2000`
  - `DEFAULT_HOURLY_LIMIT` = `200`
  - `JWT_SECRET` = `super_secret_reachinbox_key_2026`

### 3. Frontend Web Service
- **Type**: Web Service
- **Name**: `reachinbox-frontend`
- **Root Directory**: `frontend`
- **Environment**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL` = `https://reachinbox-backend.onrender.com/api` *(replace with your actual backend Render URL)*
