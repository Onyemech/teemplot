"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../../src/app");
const DatabaseFactory = __importStar(require("../../src/infrastructure/database/DatabaseFactory"));
describe('Error Handler', () => {
    let app;
    beforeAll(async () => {
        jest.spyOn(DatabaseFactory, 'getPrimaryDatabase').mockReturnValue({
            healthCheck: async () => true,
            query: async () => ({ rows: [], rowCount: 0 }),
            close: async () => { },
            getType: () => 'postgres'
        });
        app = await (0, app_1.buildApp)();
        app.get('/api/test-error', async () => {
            throw Object.assign(new Error('Boom'), { statusCode: 500 });
        });
    });
    afterAll(async () => {
        await app.close();
    });
    test('returns standardized error response', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/test-error' });
        const body = res.json();
        expect(res.statusCode).toBe(500);
        expect(body.success).toBe(false);
        expect(typeof body.message).toBe('string');
    });
});
//# sourceMappingURL=error-handler.test.js.map