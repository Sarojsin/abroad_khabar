# 🏃 Abroad Khabar Quickrun Guide

This guide provides the fast-track to getting **Abroad Khabar** up and running in both development and production environments.

## 🐳 Option 1: Production (Docker)
The recommended way for a stable, full-stack deployment using Nginx, Gunicorn, and background workers.

1. **Start all services:**
   ```bash
   docker-compose up --build
   ```
2. **Access Points:**
   - **Frontend (Nginx):** [http://localhost](http://localhost) (mapped via port 80)
   - **Backend API:** [http://localhost:8000](http://localhost:8000)
   - **API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🛠️ Option 2: Local Development
Use this for active development with **Instant Cache-Busting** and hot-reload-friendly settings.

### 1. Backend Setup
1. **Navigate and Install:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. **Configure Environment:**
   - Ensure `backend/.env` is configured for your local DB/Redis.
3. **Run Dev Server:**
   ```bash
   python app/main.py
   ```
   *Available at: [http://localhost:8002/docs](http://localhost:8002/docs)*

### 2. Frontend Setup (SPA Mode)
The frontend now includes a dedicated server to handle **SPA routing** and **prevention of 304 caching**.
  npm install
1. **Navigate and Run:**
   ```bash
   cd frontend
   npm start
   # or
   node server.js
   ```
   *Available at: [http://localhost:3000](http://localhost:3000)*


admin account
email: admin@abroadkhabar.com
password: admin123

---

## ✨ Key Features in this Build
- **SPA Router**: Handles seamless page transitions with optimized template caching.
- **Cache-Busting**: Development mode (localhost) automatically appends timestamps to partials to ensure you never see old cached code.
- **Production Ready**: Backend uses **Gunicorn** for high concurrency, and Frontend uses a tuned **Nginx** config.
- **Global Rebranding**: Fully updated to **Abroad Khabar**.

## 📝 Common Fixes
- **Port Conflict**: If port 3000 or 8002 is busy, use `taskkill /F /IM node.exe /T` or similar to clear stuck processes.
- **DB Migrations**: Run `alembic upgrade head` from the `backend` directory if schema changes occur.
