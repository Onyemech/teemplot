import { DatabaseFactory } from '../src/infrastructure/database/DatabaseFactory';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.SQLITE_PATH = ':memory:'; // Use in-memory SQLite for tests

// Clean up after all tests
afterAll(async () => {
  await DatabaseFactory.closeAll();
});

// Reset database before each test
beforeEach(async () => {
  const db = DatabaseFactory.getPrimaryDatabase();
  
  // Clear all tables
  const tables = ['users', 'companies', 'attendance_records', 'tasks'];
  
  for (const table of tables) {
    try {
      await db.query(`DELETE FROM ${table}`);
    } catch (error) {
      // Table might not exist yet
    }
  }
});
