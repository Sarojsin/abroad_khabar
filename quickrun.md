# 🏃 Abroad Khabar Quickrun Guide

This guide provides a quick way to get the application up and running.

## 🐳 Option 1: Docker (Recommended)
The easiest way to run the entire stack (PostgreSQL, Redis, Backend, and Frontend).

1. **Start all services:**
   ```bash
   docker-compose up --build
   ```
2. **Access:**
   - **Frontend:** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:8000](http://localhost:8000)
   - **API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🛠️ Option 2: Manual (Development Mode)
Use this if you want to run services individually without Docker.

### 1. Prerequisites
- **Python 3.9+**
- **PostgreSQL** & **Redis** running locally.
- **Node.js** (Optional, for advanced frontend dev).

### 2. Backend Setup
1. **Navigate to backend:**
   ```bash
   cd backend
   ```
2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Configure environment:**
   - Copy `.env.example` to `.env` and update your database credentials.
4. **Run the server:**
   ```bash
   python app/main.py
   ```
   *Backend will be available at [http://localhost:8002](http://localhost:8002/docs)*

### 3. Frontend Setup
1. **Navigate to frontend:**
   ```bash
   cd frontend
   ```
2. **Serve files:**
   You can use any static server, for example:
   ```bash
   python -m http.server 3000
   ```
   *Frontend will be available at [http://localhost:3000](http://localhost:3000)*

---

## 📝 Note
Ensure your `.env` file in the `backend` folder has the correct `DATABASE_URL` and `REDIS_URL` pointing to your local instances if not using Docker.
