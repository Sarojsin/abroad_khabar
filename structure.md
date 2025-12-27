# Abroad Khabar — Project Structure

## Overview
Abroad Khabar is a full-stack education/news + consultancy platform.

- **Backend**: FastAPI + SQLAlchemy + Alembic + JWT auth
- **Database**: PostgreSQL
- **Cache (optional)**: Redis
- **Frontend**: HTML/CSS/Vanilla JS SPA-style router + admin UI
- **Local Dev Servers**:
  - Frontend: `http://localhost:3000`
  - Backend: `http://localhost:8002` (API docs: `http://localhost:8002/docs`)
- **Docker/Production (Compose)**:
  - Frontend: `http://localhost` (port `80`)
  - Backend: `http://localhost:8000`

---

## Repository Layout (Top Level)
```
abroad_khabar/
├── backend/                 # FastAPI backend
├── frontend/                # Static frontend + SPA routing server
├── docker-compose.yml       # Postgres + Redis + backend + frontend (Docker)
├── README.md                # High-level docs
├── quickrun.md              # Quick start (local + docker)
└── structure.md             # (this file) detailed structure/architecture
```

---

## Backend (`/backend`)
### Purpose
Provides REST API under `/api/v1/*`, handles authentication, media uploads, and CRUD for content (blogs/services/videos/images/ads/etc.).

### Key Entry Points
- **App**: `backend/app/main.py`
  - Creates the FastAPI app
  - Registers middleware (CORS + security)
  - Mounts media under `/media`
  - Includes API router under `settings.API_V1_STR` (default: `/api/v1`)
  - Initializes DB tables at startup via `init_db()`

### Backend Structure
```
backend/
├── app/
│   ├── main.py                 # FastAPI app factory/entry
│   ├── auth/                    # Auth helpers (JWT utilities, deps, etc.)
│   ├── api/
│   │   └── v1/
│   │       ├── api.py           # Aggregates routers, prefixes, tags
│   │       ├── auth.py          # Login/register/me/refresh (JWT)
│   │       ├── admin.py         # Admin endpoints
│   │       ├── blogs.py         # Blog endpoints
│   │       ├── services.py      # Service endpoints
│   │       ├── videos.py        # Video endpoints
│   │       ├── images.py        # Image endpoints
│   │       ├── ads.py           # Ads endpoints
│   │       ├── contact.py       # Contact endpoints
│   │       ├── countries.py     # Countries endpoints
│   │       ├── faq.py           # FAQ endpoints
│   │       ├── homepage.py      # Homepage sections endpoints
│   │       ├── testimonials.py  # Testimonials endpoints
│   │       └── users.py         # User/admin user management
│   ├── core/
│   │   ├── config.py            # Settings (reads .env)
│   │   ├── permissions.py       # Role/permission utilities (backend-side)
│   │   └── security.py          # Security headers + (optional) rate limiting
│   ├── db/
│   │   ├── base.py              # SQLAlchemy Base
│   │   ├── repositories/        # DB repository helpers / data-access layer
│   │   └── session.py           # Engine/session + init_db()
│   ├── models/                  # SQLAlchemy models
│   ├── schemas/                 # Pydantic request/response schemas
│   ├── services/                # Business logic / helpers
│   └── utils/                   # Shared helpers (responses, etc.)
├── alembic/                     # DB migration environment
├── requirements.txt             # Python deps
├── .env                         # Local env (DO NOT commit secrets)
├── .env.example                 # Example env
├── Dockerfile                   # Production backend container
├── create_admin.py              # Script: create admin user
└── *.py                         # Various diagnostics/scripts
```

### API Modules (What the backend exposes)
Main router aggregation: `backend/app/api/v1/api.py`

- **Auth**: `/api/v1/auth/*`
- **Admin**: `/api/v1/admin/*`
- **Blogs**: `/api/v1/blogs/*`
- **Users**: `/api/v1/users/*`
- **Services**: `/api/v1/services/*`
- **Videos**: `/api/v1/videos/*`
- **Images**: `/api/v1/images/*`
- **Ads**: `/api/v1/ads/*`
- **Contact**: `/api/v1/contact/*`
- **Countries**: `/api/v1/countries/*`
- **FAQ**: `/api/v1/faq/*`
- **Homepage Sections**: `/api/v1/homepage/*`
- **Testimonials**: `/api/v1/testimonials/*`

### Backend Request Flow (High level)
1. **HTTP request** arrives at FastAPI (`app/main.py`).
2. **Middleware** runs:
   - CORS (`CORSMiddleware`)
   - Security headers + optional rate limiting (`app/core/security.py`)
3. **Route matching** happens under `settings.API_V1_STR` (default `/api/v1`).
4. **API router** dispatches to the correct module in `app/api/v1/*`.
5. **DB access** uses SQLAlchemy sessions from `app/db/session.py`.
6. **Response formatting** typically uses helpers from `app/utils/*` (custom response wrapper).

### Configuration (`backend/.env`)
Common values:
- **Database**
  - `POSTGRES_SERVER=localhost`
  - `POSTGRES_USER=postgres`
  - `POSTGRES_PASSWORD=...`
  - `POSTGRES_DB=education_platform`
  - `DATABASE_URL=postgresql://postgres:<password>@localhost:5432/education_platform`
- **API Prefix**
  - `API_V1_STR=/api/v1`
- **CORS**
  - `BACKEND_CORS_ORIGINS=["http://localhost:3000", ...]`
- **Redis** (optional)
  - `REDIS_URL=redis://localhost:6379`

### Notes on Redis
Redis is configured in settings, but the app can typically run without Redis for local development (it’s treated as optional / for caching).

### Database Behavior
- DB connection is created in `app/db/session.py` using `settings.DATABASE_URL`.
- On backend startup (`lifespan` in `app/main.py`), the app calls `init_db()` which imports all models and runs `Base.metadata.create_all(...)`.

### Admin User Setup
A helper script exists:
- `backend/create_admin.py`

Default admin created by that script:
- **Email**: `admin@abroadkhabar.com`
- **Password**: `admin123`

---

## Frontend (`/frontend`)
### Purpose
Static site + SPA-style client routing + admin UI pages.

### How Frontend Routing Works
- `frontend/server.js` runs an Express server on port **3000** in local dev.
- It serves static files from `frontend/`.
- For unknown paths it falls back to `index.html` to support SPA-style routes.
- The SPA router (`frontend/js/core/router.js`) loads HTML partials from `/pages/*.html` and admin pages from `/admin/*.html`.

### Frontend Structure
```
frontend/
├── index.html                 # SPA shell (contains #main-content container)
├── server.js                  # Local dev server (Express) on :3000 + SPA fallback
├── package.json               # npm start = node server.js
├── nginx.conf                 # Production SPA routing + proxy rules
├── css/                       # Styles (site + admin UI styles)
├── js/
│   ├── main.js                # App bootstrap (init router + navbar/footer + auth)
│   ├── core/
│   │   ├── router.js          # SPA router + route definitions (public + /admin/*)
│   │   ├── api.js             # Fetch wrapper (baseURL -> backend API)
│   │   ├── auth.js            # Login/session/token handling (JWT in localStorage)
│   │   ├── permissions.js     # Frontend role/permission checks for routes/UI
│   │   └── seo.js             # Meta/SEO helpers
│   ├── components/            # Navbar, footer, modals, loader, etc.
│   ├── effects/               # UI effects (lazy media, animations)
│   ├── pages/                 # Page-level JS modules matching /pages/*.html
│   └── admin/                 # Admin page JS modules (manager UIs)
├── pages/                     # Public HTML partials (home/about/services/...)
├── admin/                     # Admin HTML pages (dashboard/blogs/services/ads/...)
└── (misc)                     # Extra test/diagnostic html files
```

### Frontend Routing Table (Key routes)
Routes are registered in `frontend/js/core/router.js` (see `generateRoutes()`), for example:

- Public:
  - `/` → `/pages/home.html`
  - `/about` → `/pages/about.html`
  - `/services` → `/pages/services.html`
  - `/blogs` → `/pages/blogs.html`
  - `/contact` → `/pages/contact.html`
  - `/login` → `/pages/login.html`
- Admin (requires auth + role):
  - `/admin/dashboard` → `/admin/dashboard.html`
  - `/admin/blogs` → `/admin/blogs.html`
  - `/admin/services` → `/admin/services.html`
  - `/admin/videos` → `/admin/videos.html`
  - `/admin/images` → `/admin/images.html`
  - `/admin/ads` → `/admin/ads.html`

### Frontend Auth Flow (Admin login)
1. User opens `http://localhost:3000/login`.
2. Login UI is `/pages/login.html` with JS controller `js/pages/login.js`.
3. Login calls `Auth.login(...)` (`js/core/auth.js`).
4. Auth uses `api.post('/auth/login', ...)` (`js/core/api.js`).
5. Backend returns `{ user, tokens }`; frontend stores:
   - `auth_token` (access token) in localStorage
   - `refresh_token` in localStorage
6. Router guards (requiresAuth/requiredRoles) allow access to `/admin/*` pages.

### Admin UI URLs (Local)
- **Login**: `http://localhost:3000/login`
- **Dashboard**: `http://localhost:3000/admin/dashboard`

### Frontend → Backend API
- `frontend/js/core/api.js` uses:
  - `baseURL = http://localhost:8002/api/v1`

---

## Docker / Production Setup
### Docker Compose (`docker-compose.yml`)
Services:
- **postgres**: PostgreSQL database
- **redis**: Redis cache
- **backend**: FastAPI/Gunicorn container
- **frontend**: Nginx serving static frontend

### Docker Ports
- Frontend exposed on host: `80`
- Backend exposed on host: `8000`

### Nginx (`frontend/nginx.conf`)
- Serves SPA with `try_files ... /index.html`.
- Proxies:
  - `/api/` → backend
  - `/media/` → backend

Note: In this repo, `frontend/nginx.conf` currently proxies to `http://backend:8002`.

In Docker, the backend container (Gunicorn) typically listens on `8000` (see `backend/Dockerfile` and `docker-compose.yml` port mapping `8000:8000`). If you run the stack in Docker and see API proxy issues, align the Nginx `proxy_pass` port with the backend container port.

---

## Local Development — Run Instructions
### Backend
From repo root:
```
cd backend
source venv/bin/activate
pip install -r requirements.txt
python -m app.main
```
- Backend runs at: `http://localhost:8002`
- Docs: `http://localhost:8002/docs`

### Frontend
From repo root:
```
cd frontend
npm install
npm start
```
- Frontend runs at: `http://localhost:3000`

---

## Common Troubleshooting
- **`ModuleNotFoundError: No module named 'app'`**
  - Run backend from `backend/` directory using `python -m app.main`.
- **`python-magic-bin` install fails on macOS**
  - Install `libmagic` (Homebrew) and use `python-magic`.
- **DB connection errors**
  - Ensure Postgres is running and database exists:
    - DB name: `education_platform`
    - User: `postgres`
    - Password: whatever is in `backend/.env`
- **Port conflicts**
  - Frontend uses `3000`, backend uses `8002` (local).
