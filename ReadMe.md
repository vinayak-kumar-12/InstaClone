# 🐳 InstaClone Full-Stack Production Docker Environment

Enterprise-grade, full-stack containerization for the InstaClone application featuring **React Vite Frontend**, **Node 22 Express Backend**, **PostgreSQL 16**, **MongoDB 7**, and **Redis 7**.

---

## 🏗️ Architecture & Component Topology

```text
                                  +-------------------------------------------------------+
                                  |                     CLIENT BROWSER                    |
                                  +-------------------------------------------------------+
                                                              |
                                                    HTTP (80) | WebSocket
                                                              v
+-------------------------------------------------------------------------------------------------------------------+
| FRONTEND CONTAINER (instaclone_frontend)                                                                         |
| Nginx 1.27 Alpine | React SPA (Static Dist) | Gzip Compression | Security Headers                              |
| Reverse Proxies:                                                                                                 |
|   - /api/       ===>  http://backend:3000/api/                                                                   |
|   - /socket.io/ ===>  http://backend:3000/socket.io/                                                            |
+-------------------------------------------------------------------------------------------------------------------+
                                                              |
                                                    Internal Bridge Network
                                                              v
+-------------------------------------------------------------------------------------------------------------------+
| BACKEND CONTAINER (instaclone_backend)                                                                           |
| Node.js 22 Express | Socket.IO | Non-root 'node' User | Health Monitoring (/health)                              |
+-------------------------------------------------------------------------------------------------------------------+
         |                                           |                                           |
         v                                           v                                           v
+------------------------+                 +------------------------+                 +------------------------+
| POSTGRESQL CONTAINER   |                 | MONGODB CONTAINER      |                 | REDIS CONTAINER        |
| (instaclone_postgres)  |                 | (instaclone_mongodb)   |                 | (instaclone_redis)     |
| Image: postgres:16     |                 | Image: mongo:7         |                 | Image: redis:7 (AOF)   |
| Volume: postgres_data  |                 | Volume: mongo_data     |                 | Volume: redis_data     |
+------------------------+                 +------------------------+                 +------------------------+
```

---

## ⚡ Quick Start: Docker Compose Single-Command

Start the complete 5-container stack in detached mode:

```bash
docker compose up -d --build
```

### Check Container Health Status:

```bash
docker compose ps
```

---

## 💻 Local Development (Outside Docker)

The backend and frontend automatically detect if they are running outside Docker and adapt connection hosts to `localhost` / `127.0.0.1`:

1. **Start Backend Locally**:
   ```bash
   cd backend
   npm start
   ```
2. **Start Frontend Locally**:
   ```bash
   cd frontend
   npm run dev
   ```

---

## 🛠️ Docker Operations & Management

### View Logs:
```bash
# All container logs
docker compose logs -f

# Backend logs only
docker compose logs -f backend

# Frontend Nginx logs
docker compose logs -f frontend
```

### Stop Services:
```bash
docker compose down
```

### Rebuild and Restart Stack:
```bash
docker compose up -d --build --force-recreate
```

### Access Container Shell:
```bash
# Backend container bash
docker exec -it instaclone_backend sh

# Redis CLI inside container
docker exec -it instaclone_redis redis-cli ping
```

---

## 🩺 Service Endpoints & Healthchecks

| Service | Port | Endpoint / Healthcheck | Description |
| :--- | :--- | :--- | :--- |
| **Frontend** | `80` | `http://localhost:80/` | React Vite app served by Nginx |
| **Backend** | `3000` | `http://localhost:3000/health` | Node.js Express REST API & WebSockets |
| **PostgreSQL** | `5432` | `pg_isready -U postgres` | PostgreSQL 16 database |
| **MongoDB** | `27017` | `mongosh ping` | MongoDB 7 document store |
| **Redis** | `6379` | `redis-cli ping` | Redis 7 cache & Pub/Sub broker |
