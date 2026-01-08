"use strict";
/**
 * Setup file for property-based tests
 *
 * This file runs before all property tests to:
 * - Load environment variables
 * - Set up test database connection
 * - Configure test timeouts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load test environment variables
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env.test') });
// Set default test timeout for property tests (100+ iterations)
globals_1.jest.setTimeout(60000);
// Global test setup
(0, globals_1.beforeAll)(() => {
    console.log('🧪 Starting property-based tests with fast-check');
    console.log(`📊 Test iterations per property: 100+`);
    console.log(`🗄️  Database: ${process.env.DATABASE_URL || 'postgresql://localhost:5432/teemplot_test'}`);
});
// Global test teardown
(0, globals_1.afterAll)(() => {
    console.log('✅ Property-based tests completed');
});
//# sourceMappingURL=setup.js.map