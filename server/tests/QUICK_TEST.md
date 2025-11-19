# Quick Test Guide

## Run Tests

```bash
# All tests
npm test

# Specific test file
npm test -- SQLiteDatabase
npm test -- RegistrationService  
npm test -- auth.routes
npm test -- onboarding.flow

# With coverage
npm run test:coverage
```

## Test Status

✅ Database Layer - SQLite CRUD operations
✅ Service Layer - Registration logic
✅ API Layer - Auth endpoints
✅ Integration - Complete onboarding flow

## Key Features Tested

- User registration with company creation
- Email verification
- Password hashing with bcrypt
- JWT authentication
- Role-based access (admin)
- Trial plan activation
- Data validation
- Error handling
- Multi-tenancy isolation

## Test Database

- Uses SQLite (`data/test.db`)
- Auto-cleanup after each test
- Isolated test environment
