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
const TaskService_1 = require("../../src/services/TaskService");
const DatabaseFactory = __importStar(require("../../src/infrastructure/database/DatabaseFactory"));
describe('TaskService review workflow', () => {
    const companyId = '00000000-0000-0000-0000-000000000002';
    const adminA = '11111111-2222-3333-4444-555555555555';
    const adminB = '66666666-7777-8888-9999-000000000000';
    const employee = '99999999-8888-7777-6666-555555555555';
    const state = {
        users: {
            [adminA]: { id: adminA, role: 'admin', department_id: 'depX', is_active: true },
            [adminB]: { id: adminB, role: 'admin', department_id: 'depX', is_active: true },
            [employee]: { id: employee, role: 'employee', department_id: 'depX', is_active: true },
        },
        tasks: {}
    };
    const mockDb = {
        query: async (sql, params = []) => {
            if (sql.includes('SELECT id, role, department_id FROM users')) {
                const id = params[0];
                const u = state.users[id];
                return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
            }
            if (sql.includes('SELECT department_id FROM users WHERE id = $1')) {
                const id = params[0];
                const dept = state.users[id]?.department_id;
                return { rows: dept ? [{ department_id: dept }] : [], rowCount: dept ? 1 : 0 };
            }
            if (sql.includes('INSERT INTO tasks')) {
                const id = 'task-review';
                state.tasks[id] = { id, assigned_to: params[3], created_by: params[4], review_status: null, status: 'pending', company_id: companyId };
                return { rows: [state.tasks[id]], rowCount: 1 };
            }
            if (sql.includes('SELECT * FROM tasks WHERE id = $1 AND company_id = $2')) {
                const id = params[0];
                const t = state.tasks[id];
                return { rows: t ? [t] : [], rowCount: t ? 1 : 0 };
            }
            if (sql.includes('UPDATE tasks') && sql.includes('marked_complete_at')) {
                const id = params[3];
                const t = state.tasks[id];
                Object.assign(t, { status: 'awaiting_review', review_status: 'pending_review', marked_complete_by: params[0], company_id: params[4] });
                return { rows: [t], rowCount: 1 };
            }
            if (sql.includes('UPDATE tasks') && sql.includes('reviewed_at')) {
                const id = params[5];
                const t = state.tasks[id];
                const newStatus = params[0];
                const reviewStatus = params[1];
                Object.assign(t, { status: newStatus, review_status: reviewStatus, reviewed_by: params[2] });
                return { rows: [t], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        }
    };
    let taskId = 'task-review';
    beforeAll(async () => {
        jest.spyOn(DatabaseFactory, 'getPrimaryDatabase').mockReturnValue(mockDb);
        const svc = new TaskService_1.TaskService();
        const task = await svc.createTask({ title: 'r', assignedTo: employee }, { companyId, userId: adminA, role: 'admin' });
        taskId = task.id;
    });
    test('assignee marks complete and original assigner approves', async () => {
        const svc = new TaskService_1.TaskService();
        const completed = await svc.markTaskComplete(taskId, { actualHours: 1, completionNotes: 'done' }, { companyId, userId: employee, role: 'employee' });
        expect(completed.review_status).toBe('pending_review');
        const reviewed = await svc.reviewTask(taskId, { approved: true, reviewNotes: 'ok' }, { companyId, userId: adminA, role: 'admin' });
        expect(reviewed.status).toBe('completed');
        expect(reviewed.review_status).toBe('approved');
    });
    test('non-assigner cannot review', async () => {
        const svc = new TaskService_1.TaskService();
        await expect(svc.reviewTask(taskId, { approved: true }, { companyId, userId: adminB, role: 'admin' })).rejects.toThrow();
    });
});
//# sourceMappingURL=task-service-review.test.js.map