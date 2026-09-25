# 📨 ReachInbox Email Scheduler Service & Queue Dashboard

A production-grade, highly scalable email scheduler service and real-time management dashboard inspired by **ReachInbox**. Built with **Express.js**, **BullMQ**, **Redis**, **Prisma ORM**, **Ethereal SMTP**, **Elasticsearch**, and a modern **Next.js 14 / Tailwind CSS** frontend.

---

## 📋 Table of Contents
- [✨ Key Features](#-key-features)
  - [Backend Features](#backend-features)
  - [Frontend Features](#frontend-features)
- [🏗️ Architecture Overview](#️-architecture-overview)
  - [1. How Scheduling Works (Zero Cron Jobs)](#1-how-scheduling-works-zero-cron-jobs)
  - [2. How Persistence on Restart is Handled](#2-how-persistence-on-restart-is-handled)
  - [3. How Rate Limiting & Concurrency are Implemented](#3-how-rate-limiting--concurrency-are-implemented)
- [🛠️ Getting Started](#️-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Ethereal Email Setup & Environment Variables](#ethereal-email-setup--environment-variables)
- [🐳 Docker Deployment](#-docker-deployment)
- [🤝 Repository Collaborators](#-repository-collaborators)

---

## ✨ Key Features

### Backend Features
- 🛡️ **Persistent Job Scheduler (Zero Cron Jobs)**: Powered by BullMQ delayed jobs backed by Redis and Prisma ORM. Jobs survive server restarts without losing state or duplicating email dispatches.
- ⚡ **Configurable Worker Concurrency**: Concurrency-safe queue workers (`WORKER_CONCURRENCY=5`) executing email jobs in parallel without blocking main event loop threads.
- ⏱️ **Provider Throttling & Minimum Delays**: Configurable minimum delay (default `2000ms` / 2s between dispatches) to mimic ESP sending behavior.
- 📊 **Redis-Backed Atomic Hourly Rate Limiting**: Global and per-sender rate limiting using atomic Redis counters (`rate_limit:{senderEmail}:{YYYY-MM-DD-HH}`). Jobs exceeding limits are deferred to the top of the next hour window preserving queue order.
- 💬 **Live Slack Webhook Rate-Limit Alerts**: Automatic Slack block notifications triggered the instant a sender hits their hourly limit.
- 📨 **Dynamic Ethereal SMTP Mailer**: Auto-generates test accounts and transporters per sender with live Ethereal inbox preview URLs (with optional Gmail / Brevo live SMTP relay).
- 🔍 **Elasticsearch Email Indexing**: Multi-field search across subject, body, recipients, sender, and email status.
- 🖥️ **Bull-Board Queue Management UI**: Live BullMQ administrative interface exposed at `/admin/queues` via `@bull-board/express`.
- 🔐 **Authentication & OTP Verification System**: OTP verification flow, Google OAuth token exchange, and JWT authentication.

### Frontend Features
- 🔐 **Authentication & Login Screen**: Split-panel design with OTP email verification, Google OAuth 2.0 login, custom credentials sign-in, and dark/light mode toggle.
- 🎨 **3D Fiber-Optic Canvas**: Animated canvas rendering dynamic fiber-optic data stream particles.
- 📊 **Real-time Queue Metrics Widget**: Live counters for Total Scheduled, Sent, Pending, Rate-Limited, and Failed jobs.
- ✍️ **Compose Email Modal**: Multi-recipient input with CSV Lead Parser (drag & drop CSV upload with valid lead count badge), hourly limit input, send delay, and celebration confetti.
- 📅 **Scheduled Emails Table**: Status filtering, live search, staggered timing display, and one-click schedule cancellation.
- 📬 **Sent Emails Table**: Sent email list, search modal, status badges, detailed view modal, and direct "View Ethereal Email" link button.
- 💬 **Slack Integration Modal**: Connect incoming Slack webhooks and trigger real-time test alerts.
- 📑 **Embedded BullMQ Board Tab**: Full live BullMQ administrative dashboard embedded directly inside the dashboard UI.

---

## 🏗️ Architecture Overview

### 1. How Scheduling Works (Zero Cron Jobs)
- **Hard Constraint**: Neither OS-level `crontab` nor polling Node.js cron libraries (`node-cron`, `agenda`) are used.
- **Delay Calculation**: When a campaign or email schedule request is submitted:
  $$\text{delayMs} = \max(0, \text{targetTimestamp} - \text{Date.now()})$$
- **BullMQ Delayed Enqueue**: The backend creates a DB record with status `PENDING` and enqueues a delayed job into BullMQ:
  ```typescript
  await queue.add('send-email', jobPayload, { delay: delayMs, jobId: emailRecord.id });
  ```
- **Execution**: Redis automatically moves the delayed job into the active queue once `delayMs` elapses, triggering worker execution.

### 2. How Persistence on Restart is Handled
- **Dual-Layer Storage Architecture**:
  1. **Relational Database (Prisma ORM - SQLite / PostgreSQL)**: Stores permanent records of all scheduled emails, campaign metadata, user accounts, and status history (`PENDING`, `PROCESSING`, `RATE_LIMITED`, `SENT`, `FAILED`).
  2. **Redis Memory & Append-Only Log (AOF / RDB)**: BullMQ stores job states, scheduled delays, and queue metadata inside persistent Redis data structures.
- **Server Restart Recovery**:
  - If the backend server reboots, BullMQ automatically reads existing delayed jobs from Redis upon startup.
  - Workers resume processing pending/delayed jobs from where they left off.
  - **Idempotency Guard**: Every job checks a Redis idempotency key (`sent_idempotency:{idempotencyKey}`) with a 24-hour TTL alongside DB status verification to guarantee no email is ever double-sent.

### 3. How Rate Limiting & Concurrency are Implemented

#### Atomic Rate Limiting
- **Redis Counter Key**: `rate_limit:{senderEmail}:{YYYY-MM-DD-HH}`
- **Atomic Operation**: Evaluated using Redis `INCR`:
  ```typescript
  const currentCount = await redis.incr(redisKey);
  if (currentCount === 1) await redis.expire(redisKey, 7200);
  ```
- **Limit Exceeded Action (No Dropped Jobs)**:
  - If `currentCount > hourlyLimit`, the job is **never discarded**.
  - The worker calculates milliseconds until the top of the next hour (`msUntilReset`).
  - The job is re-enqueued into BullMQ with `delay: msUntilReset`.
  - Database status is updated to `RATE_LIMITED`.
  - A live notification payload is posted to the user's connected Slack webhook.

#### Parallel Worker Concurrency
- BullMQ Worker is instantiated with `concurrency: ENV.WORKER_CONCURRENCY` (default: `5`).
- Up to 5 worker loops run in parallel, fetching and dispatching emails concurrently across different senders and recipients.
- Minimum inter-email delay (`MIN_EMAIL_DELAY_MS`) enforces throttling between individual dispatches.

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: v18+ or v22+
- **npm**: v9+
- **Redis**: Running on `localhost:6379` (*Note: If local Redis is not running, the backend automatically spawns an embedded `RedisMemoryServer` instance!*)

---

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. **Initialize Prisma Database**:
   ```bash
   npx prisma db push
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   - **Backend API**: `http://localhost:5000/api`
   - **BullMQ Admin Dashboard**: `http://localhost:5000/admin/queues`

---

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env.local` file from `.env.example`:
   ```bash
   cp .env.example .env.local
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   - **Frontend App**: `http://localhost:3000`

---

### Ethereal Email Setup & Environment Variables

#### Zero-Config Ethereal Fake SMTP
No account creation or API key is required for testing! The backend automatically generates temporary Ethereal SMTP test accounts dynamically via Nodemailer (`nodemailer.createTestAccount()`) for every unique sender address.
- Sent emails generate a live **Ethereal Preview URL** (e.g., `https://ethereal.email/message/...`) visible in the dashboard UI and API response.

#### Environment Variables Reference

##### Backend (`backend/.env`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Backend HTTP server port |
| `DATABASE_URL` | `"file:./dev.db"` | SQLite database connection string |
| `REDIS_HOST` | `127.0.0.1` | Redis host address |
| `REDIS_PORT` | `6379` | Redis port |
| `WORKER_CONCURRENCY` | `5` | Parallel BullMQ worker threads |
| `MIN_EMAIL_DELAY_MS` | `2000` | Minimum throttling delay between email sends (ms) |
| `DEFAULT_HOURLY_LIMIT` | `200` | Default sender hourly rate limit |
| `ELASTICSEARCH_NODE` | `http://localhost:9200` | Elasticsearch node URL |
| `JWT_SECRET` | `super_secret_reachinbox_key_2026` | Secret key for JWT auth tokens |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend application origin |

##### Frontend (`frontend/.env.local`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api` | Backend API endpoint URL |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `your_google_client_id` | Google OAuth Client ID |

---

## 🐳 Docker Deployment

Run the complete multi-container stack (Backend, Frontend, Redis, Elasticsearch) using Docker Compose:

```bash
docker-compose up --build
```

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000/api`
- **BullMQ Admin UI**: `http://localhost:5000/admin/queues`

---

## 🤝 Repository Collaborators

Access granted to collaborators:
- **`Mitrajit`** (Mitrajit Chandra Chandra)
- **`Yadav036`** (Gokul Yadhava G)
