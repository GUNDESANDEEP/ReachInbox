# 🚀 Cloud Deployment Guide

This guide covers deploying the **ReachInbox Email Scheduler** monorepo to production cloud platforms (**Vercel** for Frontend & **Render / Railway** for Backend & Redis).

---

## 1. Deploying Backend & Redis to Render

### Option A: 1-Click Render Blueprint (Recommended)
1. Log in to [Render.com](https://render.com).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository: `https://github.com/GUNDESANDEEP/ReachInbox`.
4. Render will automatically detect `render.yaml` and provision:
   - **`reachinbox-redis`** (Redis instance for BullMQ queue state)
   - **`reachinbox-backend`** (Express server & queue worker)
5. Click **Apply**. Render will build and deploy your backend automatically!

### Option B: Manual Web Service Setup on Render
1. Create a **Redis Service**:
   - Name: `reachinbox-redis`
   - Plan: Free / Starter
2. Create a **Web Service**:
   - Name: `reachinbox-backend`
   - Root Directory: `backend`
   - Build Command: `npm install && npx prisma db push && npm run build`
   - Start Command: `npm start`
   - Environment Variables:
     - `NODE_ENV` = `production`
     - `DATABASE_URL` = `file:./dev.db`
     - `REDIS_HOST` = `<your-render-redis-internal-host>`
     - `REDIS_PORT` = `6379`
     - `WORKER_CONCURRENCY` = `5`
     - `MIN_EMAIL_DELAY_MS` = `2000`
     - `DEFAULT_HOURLY_LIMIT` = `200`
     - `JWT_SECRET` = `super_secret_reachinbox_key_2026`

---

## 2. Deploying Frontend Dashboard to Vercel

1. Log in to [Vercel.com](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository: `GUNDESANDEEP/ReachInbox`.
4. Configure Project Settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: Select `frontend`
   - **Environment Variables**:
     - `NEXT_PUBLIC_API_URL` = `https://<your-backend-app>.onrender.com/api`
5. Click **Deploy**. Vercel will build and launch your live frontend URL!

---

## 3. Alternative: Deploy Entire Monorepo via Railway

1. Go to [Railway.app](https://railway.app).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Add a **Redis Database** service.
4. Add the `backend` service pointing to `backend/Dockerfile`.
5. Add the `frontend` service pointing to `frontend/Dockerfile`.
6. Set Environment Variables across services as detailed above.
