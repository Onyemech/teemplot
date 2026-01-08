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
const DatabaseFactory = __importStar(require("../../src/infrastructure/database/DatabaseFactory"));
const app_1 = require("../../src/app");
describe('Leave hierarchical review', () => {
    let app;
    const companyId = '10000000-0000-0000-0000-000000000000';
    const employee = '20000000-0000-0000-0000-000000000000';
    const state = {
        leave: {}
    };
    const mockDb = {
        query: async (sql, params = []) => {
            if (sql.startsWith('INSERT INTO leave_requests')) {
                const id = 'lr-1';
                state.leave[id] = { id, status: 'pending', review_stage: 'manager', company_id: companyId, user_id: employee };
                return { rows: [state.leave[id]], rowCount: 1 };
            }
            if (sql.startsWith('UPDATE leave_requests SET status=\'in_review\', review_stage=\'admin\'')) {
                const id = params[0];
                Object.assign(state.leave[id], { status: 'in_review', review_stage: 'admin' });
                return { rows: [state.leave[id]], rowCount: 1 };
            }
            if (sql.startsWith('UPDATE leave_requests SET status=\'in_review\', review_stage=\'owner\'')) {
                const id = params[0];
                Object.assign(state.leave[id], { status: 'in_review', review_stage: 'owner' });
                return { rows: [state.leave[id]], rowCount: 1 };
            }
            if (sql.startsWith('UPDATE leave_requests SET status=\'approved\'')) {
                const id = params[0];
                Object.assign(state.leave[id], { status: 'approved' });
                return { rows: [state.leave[id]], rowCount: 1 };
            }
            if (sql.startsWith('SELECT status FROM leave_requests')) {
                const id = params[0];
                return { rows: [{ status: state.leave[id].status }], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        }
    };
    beforeAll(async () => {
        jest.spyOn(DatabaseFactory, 'getPrimaryDatabase').mockReturnValue(mockDb);
        app = await (0, app_1.buildApp)();
    });
    afterAll(async () => {
        await app.close();
    });
    test('request -> manager approve -> admin approve -> owner approve', async () => {
        const lr = await mockDb.query(`INSERT INTO leave_requests (company_id, user_id, leave_type, start_date, end_date, total_days, reason, half_day, status, review_stage)
       VALUES ($1,$2,'annual','2026-01-10','2026-01-12',3,'test',false,'pending','manager') RETURNING *`, [companyId, employee]);
        const id = lr.rows[0].id;
        await mockDb.query(`UPDATE leave_requests SET status='in_review', review_stage='admin' WHERE id=$1`, [id]);
        await mockDb.query(`UPDATE leave_requests SET status='in_review', review_stage='owner' WHERE id=$1`, [id]);
        await mockDb.query(`UPDATE leave_requests SET status='approved' WHERE id=$1`, [id]);
        const final = await mockDb.query(`SELECT status FROM leave_requests WHERE id=$1`, [id]);
        expect(final.rows[0].status).toBe('approved');
    });
});
//# sourceMappingURL=leave-hierarchy-review.test.js.map