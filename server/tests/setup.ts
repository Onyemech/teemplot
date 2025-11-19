import { DatabaseFactory } from '../src/infrastructure/database/DatabaseFactory';
import path from 'path';
import fs from 'fs';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.SQLITE_PATH = path.join(__dirname, '../data/test.db');
process.env.FORCE_DATABASE_TYPE = 'sqlite';

// Mock logger to reduce noise in tests
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Clean up test database before all tests
beforeAll(async () => {
  const testDbPath = process.env.SQLITE_PATH!;
  const testDbDir = path.dirname(testDbPath);

  // Ensure test data directory exists
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }

  // Try to remove existing test database (ignore if locked)
  try {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  } catch (error) {
    // File might be locked, that's okay
  }

  // Try to remove WAL files (ignore if locked)
  try {
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  } catch (error) {
    // Files might be locked, that's okay
  }
});

// Clean up after each test
afterEach(async () => {
  const db = DatabaseFactory.getPrimaryDatabase();
  
  // Clear all tables
  try {
    await db.query('DELETE FROM users');
    await db.query('DELETE FROM companies');
  } catch (error) {
    // Tables might not exist yet
  }
});

// Close database connections after all tests
afterAll(async () => {
  await DatabaseFactory.closeAll();
  
  // Wait a bit for connections to fully close
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Clean up test database file (ignore if locked)
  try {
    const testDbPath = process.env.SQLITE_PATH!;
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  } catch (error) {
    // Files might be locked, that's okay - they'll be cleaned up next run
  }
});
