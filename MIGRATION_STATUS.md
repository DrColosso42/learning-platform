# Backend Migration Status

## Overview
This document tracks the migration from Node.js backend to Spring Boot backend.

## Current Status: **PARTIAL**

The Spring Boot backend (port 3002) is partially implemented with only authentication endpoints working. The frontend currently uses the **Node.js backend (port 3001)** which is fully functional.

## Implemented in Spring Boot ✅

### Infrastructure
- Maven project setup with dependencies
- Docker configuration
- MySQL database integration
- Spring Security with JWT authentication
- CORS configuration
- All JPA entities and repositories

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile

### Project Management (NEW - This Branch)
- `GET /api/projects` - List user projects with statistics
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/public` - List public projects

**Status**: Implemented but needs JWT authentication debugging (getting 403 errors on protected endpoints)

## Not Yet Implemented ❌

### Question Management
- Question set CRUD operations
- Question CRUD operations
- Bulk question import (CSV, text lines)
- Text parsing utilities
- **Complexity**: Medium
- **Estimated LOC**: ~500 lines

### Study Session Management ⚠️ CRITICAL
- Start/resume session
- Get next question with **weighted selection algorithm**
- Submit answer with confidence rating
- Complete/restart/reset session
- Progress tracking
- Question probability calculations
- Sidebar visualization data
- **Complexity**: High (complex algorithm)
- **Estimated LOC**: ~800 lines

### Timer Management
- Start/pause/resume/stop timer
- Advance phase (work ↔ rest)
- Timer configuration updates
- Timer statistics
- Independent timer sessions
- **Complexity**: Medium
- **Estimated LOC**: ~400 lines

### Statistics & Analytics
- User statistics overview
- Activity data for calendar
- Time-based statistics
- Recent sessions
- Enhanced dashboard data
- **Complexity**: Medium-High
- **Estimated LOC**: ~600 lines

## Technical Debt & Issues

### 1. JWT Authentication Issues
- Spring Boot security returns 403 on protected endpoints
- Token parsing may have issues with the current JWT implementation
- **Priority**: High
- **Needs**: Debugging and potential JWT util refactor

### 2. Lazy Loading Issues
- Project entities use `@OneToMany` relationships that may cause lazy loading exceptions
- Need to review fetch strategies or use DTOs more carefully
- **Priority**: Medium

### 3. Missing Validation
- Not all DTOs have complete validation annotations
- Error handling could be more standardized
- **Priority**: Low

## Recommended Next Steps

### Option 1: Complete Spring Boot Migration (Estimated: 3-5 days)
1. Debug and fix JWT authentication issues (4 hours)
2. Implement QuestionController & QuestionService (8 hours)
3. Implement StudySessionController & StudySessionService (16 hours)
   - Port the weighted selection algorithm from Node.js
   - Implement all session management endpoints
4. Implement TimerController & TimerService (8 hours)
5. Implement StatisticsController & StatisticsService (10 hours)
6. Integration testing (6 hours)
7. Bug fixes and optimization (8 hours)

**Total Estimated Effort**: 60 hours

### Option 2: Keep Node.js Backend (Current Approach) ✅
- **Pros**:
  - Fully functional now
  - No migration risk
  - Well-tested codebase
  - TypeScript provides good type safety
- **Cons**:
  - Less enterprise-ready than Spring Boot
  - Single language stack instead of polyglot

### Option 3: Hybrid Approach
- Keep Node.js for production
- Continue Spring Boot development in parallel
- Use Spring Boot for new features once ready
- **Pros**: No disruption, gradual migration
- **Cons**: Maintaining two backends temporarily

## Current Configuration

### Docker Compose
- **Database**: MySQL 8.0 on port 3306
- **Node.js Backend**: Port 3001 (ACTIVE)
- **Spring Boot Backend**: Port 3002 (DEVELOPMENT ONLY)
- **Frontend**: Port 3000, configured to use port 3001

### Frontend API Configuration
```typescript
// frontend/src/services/*Service.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
```

### Docker Compose Environment
```yaml
frontend:
  environment:
    VITE_API_URL: http://localhost:3001  # Points to Node.js backend
```

## Testing the Application

### Start All Services
```bash
docker compose up
```

### Test Endpoints

#### Node.js Backend (Fully Functional)
```bash
# Health check
curl http://localhost:3001/health

# Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test User"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Get projects (requires token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/projects
```

#### Spring Boot Backend (Partial - Auth Only)
```bash
# Health check
curl http://localhost:3002/health

# Register user
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test User"}'

# Login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

### Access Frontend
```
http://localhost:3000
```

## Code Structure Comparison

### Node.js Backend
```
backend/
├── src/
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── routes/           # Route definitions
│   ├── middleware/       # Auth, validation, etc.
│   └── config/           # Database, environment
```

### Spring Boot Backend
```
backend-springboot/
├── src/main/java/com/learningadvisor/backend/
│   ├── controller/       # REST controllers
│   ├── service/          # Business logic
│   ├── repository/       # JPA repositories
│   ├── entity/           # JPA entities
│   ├── dto/              # Data transfer objects
│   ├── security/         # JWT filter, security config
│   └── util/             # Utility classes
```

## Conclusion

The **Node.js backend remains the recommended option** for production use at this time. The Spring Boot implementation provides a foundation for future migration but requires significant additional development to reach feature parity.

**Decision for this PR**: Use Node.js backend (port 3001) for frontend. Spring Boot backend is available for development and testing on port 3002.

## Files Modified in This Branch

### Added
- `backend-springboot/src/main/java/com/learningadvisor/backend/controller/ProjectController.java`
- `backend-springboot/src/main/java/com/learningadvisor/backend/service/ProjectService.java`
- `backend-springboot/src/main/java/com/learningadvisor/backend/dto/ProjectDTO.java`
- `backend-springboot/src/main/java/com/learningadvisor/backend/dto/CreateProjectRequest.java`
- `backend-springboot/src/main/java/com/learningadvisor/backend/dto/UpdateProjectRequest.java`
- `MIGRATION_STATUS.md` (this file)

### Modified
- `docker-compose.yml` - Changed frontend VITE_API_URL from 3002 to 3001

### Status
- Frontend: ✅ Working with Node.js backend
- Backend: ✅ Node.js fully functional
- Spring Boot: ⚠️ Partial implementation (auth + projects), needs more work
