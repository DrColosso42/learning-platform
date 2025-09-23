# Learning Advisor - Project Rules

## Code Quality Standards

### Comments
- Add function-level comments for public APIs and complex business logic
- Comment WHY, not WHAT - explain the purpose and reasoning
- Use JSDoc format for function documentation
- No need to comment every line or obvious operations
- Comment non-obvious algorithms or business rules

### Modularity & Architecture
- **MUST** follow modular design principles
- Use dependency injection pattern for services
- Separate concerns: controllers, services, repositories, models
- Each module should have a single responsibility
- Avoid tight coupling - use interfaces/abstractions
- Configuration should be externalized and environment-based

### File Structure
```
backend/
├── src/
│   ├── controllers/     # HTTP request handlers
│   ├── services/        # Business logic layer
│   ├── repositories/    # Data access layer
│   ├── models/          # Data models/schemas
│   ├── middleware/      # Custom middleware
│   ├── utils/           # Utility functions
│   ├── config/          # Configuration files
│   └── routes/          # Route definitions
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page-level components
│   ├── services/        # API client services
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Helper functions
│   └── store/           # State management
```

### Code Standards
- Use TypeScript for type safety
- Implement proper error handling with custom error classes
- Use environment variables for all configuration
- Implement proper logging (not console.log in production)
- Follow RESTful API conventions
- Use async/await over promises
- Implement proper validation for all inputs

### Database Design
- Use migrations for schema changes
- Implement proper indexing strategy
- Use transactions for related operations
- Follow naming conventions (snake_case for DB, camelCase for code)

### Testing Requirements
- Unit tests for services and utilities
- Integration tests for API endpoints
- Test error scenarios, not just happy paths

## Development Workflow
- Incremental development - build features step by step
- Each feature should be self-contained and deployable
- Environment parity between development and production
- Use Docker for consistent environments