# 🐳 InstaClone Backend - Production Docker Environment

Professional production-ready Docker containerization for the InstaClone backend ecosystem using **Node 22 Alpine**, **PostgreSQL 16**, **Redis 7 (AOF)**, and **PgAdmin 4**.

---

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Building and Running Containers](#building-and-running-containers)
4. [Stopping Containers](#stopping-containers)
5. [Restarting Services](#restarting-services)
6. [Viewing Real-time Logs](#viewing-real-time-logs)
7. [Connecting to PostgreSQL](#connecting-to-postgresql)
8. [Connecting to Redis](#connecting-to-redis)
9. [Accessing PgAdmin GUI](#accessing-pgadmin-gui)
10. [Health Checks & Security](#health-checks--security)

---

## 🛠️ Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24.0+ recommended)
- [Docker Compose](https://docs.docker.com/compose/) (v2.0+ recommended)

---

## ⚙️ Project Setup

1. Copy the environment variable template:
   ```bash
   cp .env.example .env
   ```
2. Update environment secrets in `.env` if needed (`JWT_SECRET`, `CLOUDINARY_API_KEY`, etc.).

---

## 🚀 Building and Running Containers

Start the complete stack with a single command:

```bash
docker compose up --build
```

To run in **detached mode** (background):

```bash
docker compose up -d --build
```

Verify running containers and health status:

```bash
docker compose ps
```

---

## 🛑 Stopping Containers

Stop all running services cleanly:

```bash
docker compose down
```

To stop containers **and remove persistent volumes** (Warning: deletes database data):

```bash
docker compose down -v
```

---

## 🔄 Restarting Services

Restart all services:

```bash
docker compose restart
```

Restart a specific service (e.g. backend only):

```bash
docker compose restart backend
```

---

## 📜 Viewing Real-time Logs

View logs for all services:

```bash
docker compose logs -f
```

View logs for a specific service:

```bash
# Backend Logs
docker compose logs -f backend

# Redis Logs
docker compose logs -f redis

# PostgreSQL Logs
docker compose logs -f postgres
```

---

## 🐘 Connecting to PostgreSQL

### Via Docker CLI (Internal terminal):
```bash
docker exec -it instaclone_postgres psql -U postgres -d instaclone_db
```

### Connection Details for External Tools (DBeaver, TablePlus, Postico):
- **Host**: `localhost` (or `postgres` inside Docker network)
- **Port**: `5432`
- **User**: `postgres`
- **Password**: `postgres_password`
- **Database**: `instaclone_db`

---

## 🔴 Connecting to Redis

### Via Docker CLI:
```bash
docker exec -it instaclone_redis redis-cli
```

Test Redis Ping:
```bash
docker exec -it instaclone_redis redis-cli ping
# Output: PONG
```

Inspect active Redis keys:
```bash
docker exec -it instaclone_redis redis-cli keys "*"
```

---

## 🖥️ Accessing PgAdmin GUI

1. Open your browser and navigate to:
   `http://localhost:5050`
2. Log in with PgAdmin credentials:
   - **Email**: `admin@instaclone.com`
   - **Password**: `admin123`
3. Add New PostgreSQL Server in PgAdmin:
   - **Name**: `InstaClone Postgres`
   - **Host**: `postgres` *(service name)*
   - **Port**: `5432`
   - **Maintenance database**: `instaclone_db`
   - **Username**: `postgres`
   - **Password**: `postgres_password`

---

## 🩺 Health Checks & Security

- **Backend Health Check**: `http://localhost:3000/health`
- **Non-Root Execution**: The Node.js container runs under security user `USER node`.
- **Custom Bridge Network**: Services communicate securely via `instaclone_network`.
- **Persistent Data**: Database data persists inside named volumes (`postgres_data`, `redis_data`, `pgadmin_data`).