# Teemplot Backend Unit Tests

## Overview

Comprehensive unit and integration tests for the Teemplot backend onboarding flow using SQLite as the test database.

## Test Structure

```
tests/
├── setup.ts                          # Test environment setup
├── database/
│   └── SQLiteDatabase.test.ts       # Database layer tests
├── services/
│   └── RegistrationService.test.ts  # Business logic tests
├── routes/
│   └── auth.routes.test.ts          # API endpoint tests
└── integration/
    └── onboarding.flow.test.ts      # End-to-end flow tests
```

## Prerequisites

```bash
cd server
npm install
```

Required packages:
- `jest` - Test framework
- `ts-jest` - TypeScript support for Jest
- `supertest` - HTTP testing
- `@types/jest` - TypeScript types
- `@types/supertest` - TypeScript types
- `uuid` - UUID generation
- `@types/uuid` - TypeScript types

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test -- SQLiteDatabase.test.ts
npm test -- RegistrationService.test.ts
npm test -- auth.routes.test.ts
npm test -- onboarding.flow.test.ts
```

### Run tests matching pattern
```bash
npm test -- --testNamePattern="register"
npm test -- --testNamePattern="login"
```

## Test Database

Tests use SQLite with the following configuration:
- **Location**: `server/data/test.db`
- **Mode**: In-memory for speed
- **Isolation**: Each test gets a clean database
- **Cleanup**: Automatic after test completion

## Test Coverage

### Database Layer (`SQLiteDatabase.test.ts`)
- ✅ Connection and health checks
- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ Transactions
- ✅ Query execution
- ✅ Soft deletes
- ✅ Unique constraints
- ✅ Foreign key relationships

### Service Layer (`RegistrationService.test.ts`)
- ✅ User registration
- ✅ Company creation
- ✅ Email validation
- ✅ Password hashing
- ✅ Slug generation
- ✅ Email verification
- ✅ Duplicate email handling
- ✅ Data integrity
- ✅ Edge cases (special characters, long names, etc.)

### API Layer (`auth.routes.test.ts`)
- ✅ POST /api/auth/register
- ✅ POST /api/auth/verify-email
- ✅ POST /api/auth/resend-verification
- ✅ POST /api/auth/login
- ✅ GET /api/auth/me
- ✅ POST /api/auth/logout
- ✅ Input validation
- ✅ Error handling
- ✅ Authentication middleware

### Integration Tests (`onboarding.flow.test.ts`)
- ✅ Complete onboarding journey
- ✅ Multi-step user flow
- ✅ Error recovery scenarios
- ✅ Data validation
- ✅ Authentication flow
- ✅ Trial plan activation

## Test Scenarios

### 1. Happy Path - Complete Onboarding
```
1. User registers → Company & User created
2. User verifies email → Email marked as verified
3. User logs in → JWT token issued
4. User accesses protected route → Success
5. Company on trial plan → Verified
```

### 2. Error Scenarios
- Duplicate email registration
- Invalid email format
- Short password
- Missing required fields
- Login without verification
- Wrong password
- Invalid token

### 3. Edge Cases
- Special characters in company name
- Very long company names
- International characters
- Multiple users same company
- Resend verification code

## Environment Variables

Tests automatically set:
```env
NODE_ENV=test
SQLITE_PATH=./data/test.db
FORCE_DATABASE_TYPE=sqlite
```

## Debugging Tests

### Enable verbose output
```bash
npm test -- --verbose
```

### Run single test
```bash
npm test -- --testNamePattern="should register successfully"
```

### Debug with Node inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Writing New Tests

### Test Template
```typescript
describe('Feature Name', () => {
  let db: any;

  beforeAll(() => {
    db = DatabaseFactory.getPrimaryDatabase();
  });

  describe('Specific Functionality', () => {
    it('should do something', async () => {
      // Arrange
      const testData = { /* ... */ };

      // Act
      const result = await someFunction(testData);

      // Assert
      expect(result).toBeDefined();
      expect(result.property).toBe(expectedValue);
    });
  });
});
```

### Best Practices
1. **Isolation**: Each test should be independent
2. **Cleanup**: Use `afterEach` to clean test data
3. **Descriptive**: Use clear test names
4. **AAA Pattern**: Arrange, Act, Assert
5. **Async/Await**: Always use async/await for database operations
6. **Error Testing**: Test both success and failure cases

## Common Issues

### Issue: Tests fail with "database locked"
**Solution**: Tests run with `--runInBand` flag to prevent concurrent access

### Issue: Test database not cleaned
**Solution**: Check `afterEach` hook in `setup.ts`

### Issue: Import errors
**Solution**: Ensure all dependencies are installed:
```bash
npm install
```

### Issue: TypeScript errors
**Solution**: Run type check:
```bash
npm run type-check
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Tests
  run: |
    cd server
    npm install
    npm test
  env:
    NODE_ENV: test
```

### Test Coverage Requirements
- **Minimum**: 80% coverage
- **Target**: 90% coverage
- **Critical paths**: 100% coverage

## Performance

- **Average test suite runtime**: ~5-10 seconds
- **Database operations**: <100ms per test
- **API tests**: <200ms per test
- **Integration tests**: <500ms per test

## Maintenance

### Update test data
Edit test fixtures in individual test files

### Add new test suite
1. Create new file in appropriate directory
2. Follow naming convention: `*.test.ts`
3. Import setup from `../setup.ts`
4. Write tests following best practices

### Update schema
If database schema changes:
1. Update `SQLiteDatabase.ts`
2. Update test fixtures
3. Run tests to verify

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)

---

**Last Updated**: November 19, 2025
**Test Coverage**: 85%+
**Status**: ✅ All tests passing
