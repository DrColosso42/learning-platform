# Learning Advisor - Spring Boot Backend

Parallel Spring Boot implementation of the Learning Advisor backend, maintaining API compatibility with the Node.js version.

## Overview

This is a **Spring Boot 3.2** implementation running on **port 3002** (parallel to Node.js on 3001), using the same MySQL database.

## Technology Stack

- **Java 17**
- **Spring Boot 3.2** (Web, Data JPA, Security)
- **MySQL 8.0** (shared with Node.js backend)
- **JWT Authentication** (io.jsonwebtoken 0.12.3)
- **Maven** for dependency management
- **Lombok** for reducing boilerplate
- **BCrypt** for password hashing

## Project Structure

```
backend-springboot/
├── src/main/java/com/learningadvisor/backend/
│   ├── LearningAdvisorApplication.java  # Main application
│   ├── config/
│   │   └── SecurityConfig.java          # Spring Security + CORS
│   ├── controller/
│   │   ├── AuthController.java          # ✅ Authentication endpoints
│   │   └── HealthController.java        # ✅ Health check
│   ├── dto/                             # Data Transfer Objects
│   │   ├── ApiResponse.java
│   │   ├── AuthRequest.java
│   │   ├── AuthResponse.java
│   │   └── UserDTO.java
│   ├── entity/                          # ✅ JPA Entities (all implemented)
│   │   ├── User.java
│   │   ├── Project.java
│   │   ├── QuestionSet.java
│   │   ├── Question.java
│   │   ├── StudySession.java
│   │   ├── SessionAnswer.java
│   │   ├── TimerSession.java
│   │   └── TimerEvent.java
│   ├── repository/                      # ✅ JPA Repositories (all implemented)
│   │   ├── UserRepository.java
│   │   ├── ProjectRepository.java
│   │   ├── QuestionSetRepository.java
│   │   ├── QuestionRepository.java
│   │   ├── StudySessionRepository.java
│   │   ├── SessionAnswerRepository.java
│   │   ├── TimerSessionRepository.java
│   │   └── TimerEventRepository.java
│   ├── security/
│   │   └── JwtAuthenticationFilter.java # ✅ JWT token filter
│   ├── service/
│   │   └── UserService.java             # ✅ User management
│   └── util/
│       └── JwtUtil.java                 # ✅ JWT utilities
├── src/main/resources/
│   └── application.properties           # ✅ Configuration
├── Dockerfile                           # ✅ Docker build
└── pom.xml                              # ✅ Maven dependencies
```

## Implemented Features

### ✅ Core Infrastructure
- Maven project setup with all dependencies
- Spring Boot application with JPA auditing
- MySQL database configuration (shared with Node.js)
- JWT authentication and security
- CORS configuration
- Health check endpoint

### ✅ Data Layer
- All 8 JPA entities matching Prisma schema
- All repositories with custom queries
- Proper entity relationships and cascading

### ✅ Authentication
- User registration (POST /api/auth/register)
- User login (POST /api/auth/login)
- Get profile (GET /api/auth/profile)
- BCrypt password hashing
- JWT token generation and validation

### ⚠️ Partially Implemented
- Auth endpoints only (register, login, profile)

### ❌ TODO - Remaining Controllers & Services

The following still need to be implemented to match Node.js functionality:

1. **ProjectController & ProjectService**
   - CRUD operations for projects
   - Public projects listing
   - User-owned projects

2. **QuestionController & QuestionService**
   - Question set CRUD
   - Question CRUD
   - Bulk question import (CSV, text lines)
   - Text parsing utilities

3. **StudySessionController & StudySessionService** ⚠️ CRITICAL
   - Start/resume session
   - Get next question (weighted selection algorithm)
   - Submit answer with confidence rating
   - Complete/restart/reset session
   - Progress tracking
   - **Weighted question selection algorithm** based on confidence ratings

4. **TimerController & TimerSessionService**
   - Start/pause/resume/stop timer
   - Advance phase (work ↔ rest)
   - Timer configuration updates
   - Timer statistics
   - Independent timer sessions

5. **StatisticsController & StatisticsService**
   - User statistics overview
   - Activity data for calendar
   - Time-based statistics
   - Recent sessions
   - Enhanced dashboard data

## Database Schema

Uses the existing MySQL schema from the Node.js backend (no changes required):

- `users` - User accounts
- `projects` - Learning projects
- `question_sets` - Question collections (decks)
- `questions` - Individual questions
- `study_sessions` - Active/completed study sessions
- `session_answers` - Question answers with confidence ratings (1-5)
- `timer_sessions` - Pomodoro timer sessions
- `timer_events` - Timer state change audit log

## Configuration

Environment variables (configured in docker-compose.yml):

```properties
# Database
DB_HOST=database
DB_USER=app_user
DB_PASSWORD=app_password

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=604800000  # 7 days in milliseconds
```

## Running with Docker

The Spring Boot backend runs alongside the Node.js backend:

```bash
# Start all services (including Spring Boot on port 3002)
docker compose up

# Start only Spring Boot backend
docker compose up backend-springboot

# Rebuild after code changes
docker compose up --build backend-springboot
```

## API Endpoints

### Implemented (Port 3002)

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | /health | Health check | ✅ |
| POST | /api/auth/register | Register new user | ✅ |
| POST | /api/auth/login | Login user | ✅ |
| GET | /api/auth/profile | Get current user | ✅ |

### TODO (Match Node.js on Port 3001)

All remaining endpoints from the Node.js backend need implementation:

- **Projects**: GET, POST, PUT, DELETE /api/projects
- **Questions**: CRUD for question sets and questions
- **Study Sessions**: Session management, weighted selection
- **Timer**: Timer operations and statistics
- **Statistics**: User analytics and activity data

## Key Algorithms to Implement

### 1. Weighted Question Selection Algorithm
The core learning algorithm needs to be ported from Node.js:
- Questions with lower confidence ratings (1-4) get higher selection probability
- Questions with rating 5 (mastered) are only shown after all others
- Maintains answer history per session
- Supports both "front-to-end" and "shuffle" modes

See Node.js implementation in: `backend/src/services/studySessionService.ts`

### 2. Timer Session Independence
Timer sessions must be separate from study session progress to allow:
- Restarting timer without losing deck progress
- Multiple timer sessions per study session
- Phase tracking (work/rest) independent of questions

See Node.js implementation in: `backend/src/services/timerSessionService.ts`

## Development Notes

### Why Spring Boot?
- **Robust ecosystem**: Mature Java ecosystem with excellent tooling
- **Type safety**: Strong typing reduces runtime errors
- **Enterprise-ready**: Built-in support for transactions, security, caching
- **Performance**: Compiled language with JVM optimizations
- **Scalability**: Better for high-concurrency scenarios

### Maintaining API Compatibility
- All response structures match Node.js backend
- Same HTTP status codes and error messages
- Compatible JWT tokens (can switch between backends)
- Shared database ensures data consistency

### Next Steps (Priority Order)

1. **StudySessionService** - Implement weighted selection algorithm (CRITICAL)
2. **QuestionService** - CRUD + bulk import
3. **ProjectService** - Project management
4. **TimerSessionService** - Timer operations
5. **StatisticsService** - Analytics and reporting
6. **Testing** - Unit and integration tests
7. **Performance optimization** - Caching, query optimization

## Testing

```bash
# Health check
curl http://localhost:3002/health

# Register user
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get profile (replace TOKEN)
curl http://localhost:3002/api/auth/profile \
  -H "Authorization: Bearer TOKEN"
```

## Contributing

When implementing remaining services:

1. Follow the existing patterns (Service → Controller → DTO)
2. Add Javadoc comments for public methods
3. Use DTOs for all API responses
4. Implement proper error handling
5. Maintain API compatibility with Node.js version
6. Add integration tests

## Notes

- Database schema is managed by Node.js backend (Prisma migrations)
- Spring Boot uses `ddl-auto=none` to avoid schema changes
- Both backends can run simultaneously on different ports
- Frontend can switch between backends by changing API URL
