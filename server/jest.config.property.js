/**
 * Jest configuration for property-based tests
 * 
 * Property tests use fast-check library and run 100+ iterations per test
 * These tests verify universal properties that should hold across all inputs
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/properties'],
  testMatch: ['**/*.property.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageDirectory: 'coverage/properties',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 60000, // Property tests may take longer (100+ iterations)
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/tests/properties/setup.ts'],
};
