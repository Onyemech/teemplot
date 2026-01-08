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
describe('TaskService role-based assignment', () => {
    const companyId = '00000000-0000-0000-0000-000000000000';
    const managerId = '11111111-1111-1111-1111-111111111111';
    const employeeId = '22222222-2222-2222-2222-222222222222';
    const state = {
        users: {
            [managerId]: { id: managerId, role: 'manager', department_id: 'dep1', is_active: true },
            [employeeId]: { id: employeeId, role: 'employee', department_id: 'dep1', is_active: true }
        }
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
                return { rows: [{ id: 'task1', title: params[1], assigned_to: params[3] }], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        }
    };
    beforeAll(() => {
        jest.spyOn(DatabaseFactory, 'DatabaseFactory', 'get').mockReturnValue(DatabaseFactory);
        jest.spyOn(DatabaseFactory, 'getPrimaryDatabase').mockReturnValue(mockDb);
    });
    test('manager assigns to employee in same department', async () => {
        const svc = new TaskService_1.TaskService();
        const user = { companyId, userId: managerId, role: 'manager' };
        const data = { title: 'Test', assignedTo: employeeId };
        const res = await svc.createTask(data, user);
        expect(res.title).toBe('Test');
        expect(res.assigned_to).toBe(employeeId);
    });
});
//# sourceMappingURL=task-service-permissions.test.js.map