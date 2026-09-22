# DSA Vault — Production Deployment Guide

DSA Vault is fully configured for high-concurrency multi-user production deployments with MongoDB Atlas (or self-hosted MongoDB), connection pooling, rate limiting, HTTP security headers, payload compression, and Docker containerization.

---

## 1. Setting Up MongoDB Atlas (Recommended Cloud Database)

MongoDB Atlas provides a free, fully managed, multi-region database cluster.

### Step-by-Step Atlas Setup:
1. **Create an Account**: Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign up for free.
2. **Create a Free Cluster**:
   - Choose **M0 Free Tier**.
   - Select your preferred cloud provider and closest region (e.g. AWS us-east-1 or eu-central-1).
   - Click **Create Deployment**.
3. **Configure Database Security User**:
   - Username: e.g. `vault_admin`
   - Password: Click **Autogenerate Secure Password** and copy it down.
   - Click **Create Database User**.
4. **Configure Network Access**:
   - Under "Where would you like to connect from?", choose **Allow Access from Anywhere** (`0.0.0.0/0`).
   - *Note: Cloud platforms like Render, Railway, and Vercel use dynamic IP addresses, so `0.0.0.0/0` is necessary.*
   - Click **Add Entry**.
5. **Get Your Connection String**:
   - Click **Done** / **Go to Databases**.
   - Click **Connect** on your cluster.
   - Choose **Drivers** (Node.js).
   - Copy the SRV connection string:
     ```
     mongodb+srv://vault_admin:<db_password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=DSAVault
     ```
   - Replace `<db_password>` with your actual database user password.
   - Specify the database name before the `?` query parameter:
     ```
     mongodb+srv://vault_admin:YourPassword123@cluster0.abcde.mongodb.net/dsa-vault?retryWrites=true&w=majority&appName=DSAVault
     ```

---

## 2. Environment Variables Checklist

Set these environment variables in your deployment platform's dashboard:

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | Run in production mode | `production` |
| `MONGODB_URI` | **Yes** | MongoDB Atlas or remote connection URI | `mongodb+srv://...` |
| `JWT_SECRET` | **Yes** | Secure random key for user session tokens | *(generate with `openssl rand -base64 48`)* |
| `PORT` | Auto | Server port (auto-set by Render/Railway/Fly) | `5000` |
| `MONGODB_MAX_POOL_SIZE` | No | Maximum concurrent DB connections (default: `50`) | `50` |
| `MONGODB_MIN_POOL_SIZE` | No | Idle reserve DB connections (default: `5`) | `5` |
| `CLIENT_ORIGIN` | No | Allowed CORS origins (comma-separated) | `https://yourdomain.com` |

---

## 3. Deploying to Render (Recommended — Free & Easy)

Render hosts the entire unified app (React UI + Express API + MongoDB connection) in a single service:

1. Push your repository to **GitHub** or **GitLab**.
2. Log into [dashboard.render.com](https://dashboard.render.com) and click **New +** → **Web Service**.
3. Select your repository.
4. Configure the service:
   - **Name**: `dsa-vault`
   - **Language**: `Node`
   - **Region**: Choose closest to your MongoDB Atlas region.
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Instance Type**: `Free`
5. Add **Environment Variables**:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: *Your MongoDB Atlas connection URI*
   - `JWT_SECRET`: *Your generated 64-character secret*
6. Click **Deploy Web Service**.
7. Once finished, open your `.onrender.com` URL. Your DSA Vault is live!

---

## 4. Deploying to Railway

1. Log into [railway.app](https://railway.app) and click **New Project**.
2. Select **Deploy from GitHub repo** and pick this repository.
3. In your service's **Variables** tab, add:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: *Your MongoDB Atlas connection URI*
   - `JWT_SECRET`: *Your random JWT secret*
4. In **Settings** → **Build**:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
5. In **Settings** → **Networking**, click **Generate Domain**.
6. Railway deploys the unified frontend and backend automatically.

---

## 5. Deploying with Docker / VPS (Self-Hosted)

A production-ready `Dockerfile` and `docker-compose.yml` are included in the repository.

### Option A: Complete Stack with Local MongoDB (One-Click)
Run the application and a dedicated MongoDB container together:
```bash
# Set your production JWT secret
export JWT_SECRET=$(openssl rand -base64 48)

# Build and start both containers in background
docker compose up --build -d
```
The app will be accessible on port `5000` (e.g. `http://your-server-ip:5000`).

### Option B: Docker Container with MongoDB Atlas
```bash
docker run -d \
  --name dsa-vault \
  --restart unless-stopped \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e MONGODB_URI="mongodb+srv://vault_admin:password@cluster.mongodb.net/dsa-vault?retryWrites=true&w=majority" \
  -e JWT_SECRET="your-secure-secret-here" \
  $(docker build -q .)
```

---

## 6. Deploying to Vercel

If you prefer Vercel for serverless hosting:
1. Import the repository in Vercel.
2. In Project Settings → **Environment Variables**, set:
   - `MONGODB_URI`: *Your MongoDB Atlas connection string*
   - `JWT_SECRET`: *Your random JWT secret*
3. Deploy! Vercel uses `vercel.json` and `api/index.ts` to automatically route `/api/*` requests to the serverless function while serving the static frontend from `dist`.

---

## 7. High-Concurrency & Multi-User Architecture

- **Connection Pooling**: Mongoose is configured with `minPoolSize: 5` and `maxPoolSize: 50`, keeping warm connection sockets ready to serve burst traffic without the overhead of establishing new TCP/TLS handshakes on each request.
- **Account Isolation & Compound Indexes**:
  Every user's problems and revisions are isolated by `userId`. High-performance compound indexes guarantee millisecond query times even across millions of problem records:
  - `{ userId: 1, title: 1 }` (unique constraint per user)
  - `{ userId: 1, nextReviewAt: 1 }` (due revision retrieval)
  - `{ userId: 1, solvedAt: -1 }` (recent activity and problem feed)
  - `{ userId: 1, topic: 1 }` (topic mastery breakdown)
- **Rate Limiting**:
  - Authentication endpoints are throttled to 30 requests per 15 minutes to eliminate credential stuffing and brute-force attacks.
  - General API endpoints are throttled to 600 requests per 15 minutes per IP.
- **Security & Compression**:
  - `helmet` applies defense-in-depth HTTP security headers (HSTS, XSS filter, clickjacking protection).
  - `compression` applies gzip/brotli payload compression to save bandwidth and reduce latency.
- **Monitoring**:
  - You can monitor real-time health and database connectivity at any time by requesting `GET /api/health`.
