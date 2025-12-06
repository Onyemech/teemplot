/**
 * Setup file for property-based tests
 * 
 * This file runs before all property tests to:
 * - Load environment variables
 * - Set up test database connection
 * - Configure test timeouts
 */

import { beforeAll, afterAll, jest } from '@jest/globals';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Set default test timeout for property tests (100+ iterations)
jest.setTimeout(60000);

// Global test setup
beforeAll(() => {
  console.log('🧪 Starting property-based tests with fast-check');
  console.log(`📊 Test iterations per property: 100+`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL || 'postgresql://localhost:5432/teemplot_test'}`);
});

// Global test teardown
afterAll(() => {
  console.log('✅ Property-based tests completed');
});
