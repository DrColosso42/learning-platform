# Learning Advisor

A modern web application for creating and managing study sessions with adaptive learning algorithms. The application uses spaced repetition and probability-based question selection to optimize learning outcomes.

## Overview

Learning Advisor helps users create question sets, conduct study sessions, and track their learning progress over time. The system adapts to user performance by calculating optimal question probabilities based on past answers and time intervals.

## Tech Stack

### Backend
- **Spring Boot 3.2.0** (Java 17)
- **Spring Security** with JWT authentication
- **Spring Data JPA** for data persistence
- **MySQL 8.0** database
- **Maven** for dependency management

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router** for navigation
- **Zustand** for state management
- **TanStack Query** for server state management
- **Axios** for API communication

### Infrastructure
- **Docker & Docker Compose** for containerization
- **MySQL** for data persistence

## Architecture

The application follows a three-tier architecture:

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│  - UI Components (components/)                       │
│  - Pages (pages/)                                    │
│  - State Management (store/)                         │
│  - API Services (services/)                          │
│  Port: 3000                                          │
└─────────────────┬───────────────────────────────────┘
                  │ HTTP/REST API
┌─────────────────▼───────────────────────────────────┐
│              Backend (Spring Boot)                   │
│  - Controllers (controller/)                         │
│  - Services (service/)                               │
│  - Repositories (repository/)                        │
│  - Entities (entity/)                                │
│  - Security (JWT, Spring Security)                   │
│  Port: 3002                                          │
└─────────────────┬───────────────────────────────────┘
                  │ JPA/JDBC
┌─────────────────▼───────────────────────────────────┐
│                 Database (MySQL 8.0)                 │
│  - Users & Authentication                            │
│  - Question Sets & Questions                         │
│  - Study Sessions & Answers                          │
│  - User Statistics                                   │
│  Port: 3306                                          │
└─────────────────────────────────────────────────────┘
```

### Backend Structure
```
backend-springboot/
├── src/main/java/com/learningadvisor/backend/
│   ├── config/              # Spring configuration (CORS, Security)
│   ├── controller/          # REST API endpoints
│   ├── dto/                 # Data Transfer Objects
│   ├── entity/              # JPA entities (database models)
│   ├── exception/           # Custom exceptions and handlers
│   ├── repository/          # JPA repositories (data access)
│   ├── security/            # JWT authentication & filters
│   ├── service/             # Business logic layer
│   └── util/                # Utility classes
└── pom.xml                  # Maven dependencies
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/               # Page-level components
│   ├── services/            # API client services
│   ├── hooks/               # Custom React hooks
│   ├── store/               # Zustand state management
│   ├── utils/               # Helper functions
│   └── App.tsx              # Root component
└── package.json
```

## Key Features

- **User Authentication**: JWT-based secure authentication and authorization
- **Question Set Management**: Create and organize collections of questions
- **Adaptive Study Sessions**:
  - Probability-based question selection
  - Spaced repetition algorithm
  - Progress tracking and statistics
- **Timer Modes**: Study, Work, and Break modes with configurable durations
- **Performance Analytics**: Track learning progress and statistics over time

## Prerequisites

- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)

That's it! You don't need to install Java, Maven, Node.js, or MySQL locally.

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd learning-advisor
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

The default configuration in `.env.example` works out of the box for local development. You can customize it if needed:

```env
# Database Configuration
DATABASE_URL=mysql://app_user:app_password@localhost:3306/learning_advisor

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Server Configuration
NODE_ENV=development
PORT=3001

# Frontend Configuration
VITE_API_URL=http://localhost:3002
```

### 3. Run the Application

Start all services using Docker Compose:

```bash
docker compose up
```

This command will:
1. Build the Spring Boot backend container
2. Build the React frontend container
3. Start the MySQL database container
4. Initialize the database schema
5. Start all services with proper health checks

**First-time setup**: The initial build may take a few minutes as it downloads dependencies and builds the containers.

### 4. Access the Application

Once all containers are running:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3002
- **Database**: localhost:3306

### 5. Stop the Application

To stop all services:

```bash
docker compose down
```

To stop and remove all data (including database):

```bash
docker compose down -v
```

## Development Workflow

### Running in Development Mode

The application is configured for hot-reloading:
- **Frontend**: Vite provides instant HMR (Hot Module Replacement)
- **Backend**: Spring Boot DevTools enables automatic restart on code changes

### Viewing Logs

View logs from all services:
```bash
docker compose logs -f
```

View logs from a specific service:
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f database
```

### Rebuilding After Changes

If you make changes to dependencies or Dockerfiles:

```bash
docker compose up --build
```

### Running Commands Inside Containers

Execute Maven commands in the backend:
```bash
docker compose exec backend mvn clean package
```

Execute npm commands in the frontend:
```bash
docker compose exec frontend npm install <package-name>
```

### Database Access

Connect to the MySQL database:
```bash
docker compose exec database mysql -u app_user -papp_password learning_advisor
```

## API Documentation

The backend exposes RESTful API endpoints organized by domain:

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive JWT token

### Question Sets
- `GET /api/questionsets` - Get all question sets for user
- `POST /api/questionsets` - Create a new question set
- `GET /api/questionsets/{id}` - Get specific question set
- `PUT /api/questionsets/{id}` - Update question set
- `DELETE /api/questionsets/{id}` - Delete question set

### Questions
- `POST /api/questionsets/{id}/questions` - Add question to set
- `PUT /api/questions/{id}` - Update question
- `DELETE /api/questions/{id}` - Delete question

### Study Sessions
- `POST /api/study-sessions` - Create new study session
- `POST /api/study-sessions/{id}/submit-answer` - Submit answer
- `GET /api/study-sessions/{id}/next-question` - Get next question
- `GET /api/study-sessions/{id}/probabilities` - Get question probabilities
- `GET /api/study-sessions/{id}/progress` - Get session progress

### User Statistics
- `GET /api/users/statistics` - Get user learning statistics

All authenticated endpoints require a `Authorization: Bearer <token>` header.

## Testing

Test files are available in the root directory:
- `test-auth.http` - Authentication endpoint tests
- `test-questionset.http` - Question set endpoint tests

These can be used with REST clients like the VSCode REST Client extension.

## Project Status

The application is currently under active development. The Node.js backend has been deprecated in favor of the Spring Boot implementation. See `MIGRATION_STATUS.md` for migration details.

## Troubleshooting

### Port Conflicts
If ports 3000, 3002, or 3306 are already in use, stop the conflicting services or modify the ports in `docker-compose.yml`.

### Database Connection Issues
Ensure the database service is healthy:
```bash
docker compose ps
```

Wait for the database health check to pass before the backend starts.

### Container Build Failures
Clear Docker cache and rebuild:
```bash
docker compose down -v
docker compose build --no-cache
docker compose up
```

### Permission Issues
If you encounter permission issues with the database volume:
```bash
sudo chown -R $USER:$USER database/
```

## Contributing

This project follows modular design principles and clean architecture patterns. When contributing:

1. Follow the existing project structure
2. Use dependency injection for services
3. Add comments explaining WHY, not WHAT
4. Write unit tests for new features
5. Use Docker for all development work
6. Follow RESTful API conventions

See `CLAUDE.md` for detailed coding standards and project rules.

## License

[Add your license information here]

## Contact

[Add contact information or links to issue tracker]
