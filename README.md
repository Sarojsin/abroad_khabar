# Abroad Khabar

Abroad Khabar is a comprehensive education platform designed to provide news and consultancy services for students looking to study abroad. This project consists of a modern web frontend and a robust backend API.

## 🚀 Technologies

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL
- **Caching**: Redis
- **ORM**: SQLAlchemy
- **Migration**: Alembic
- **Authentication**: JWT (JSON Web Tokens)

### Frontend
- **Tech**: HTML5, CSS3, JavaScript
- **Server**: Nginx (via Docker)

### Infrastructure
- **Docker** & **Docker Compose** for containerization and orchestration.

## 📋 Prerequisites

Ensure you have the following installed on your system:
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Git](https://git-scm.com/)

## 🛠️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sarojsin/abroad_khabar.git
   cd abroad_khabar
   ```

2. **Environment Configuration**
   Check for any `.env.example` files in the backend directory. You may need to create a `.env` file if required by the application logic, though `docker-compose.yml` handles defaults for local development.

3. **Run with Docker Compose**
   Build and start the services:
   ```bash
   docker-compose up --build
   ```
   This command will:
   - Build the backend and frontend images.
   - Start PostgreSQL and Redis containers.
   - Start the backend and frontend services.

## 🔌 API Documentation

Once the application is running, you can access the API documentation (Swagger UI) provided by FastAPI:

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

## 🖥️ Accessing the Application

- **Frontend**: Open [http://localhost:3000](http://localhost:3000) in your browser.
- **Backend API**: Accessible at [http://localhost:8000](http://localhost:8000).

## 📂 Project Structure

```
abroad_khabar/
├── backend/            # FastAPI backend application
│   ├── app/            # Source code
│   ├── alembic/        # Database migrations
│   ├── Dockerfile      # Backend Docker setup
│   └── requirements.txt
├── frontend/           # Static frontend application
│   ├── css/
│   ├── js/
│   ├── pages/
│   └── Dockerfile      # Frontend Docker setup
├── docker-compose.yml  # Container orchestration
└── README.md
```

## 👥 Authors

- Saroj Sin - [GitHub](https://github.com/Sarojsin)

## 📄 License

This project is licensed under the MIT License.
