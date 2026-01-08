import { TaskService } from '../../src/services/TaskService'
import { DatabaseFactory } from '../../src/infrastructure/database/DatabaseFactory';

describe('TaskService role-based assignment', () => {
  const companyId = '00000000-0000-0000-0000-000000000000'
  const managerId = '11111111-1111-1111-1111-111111111111'
  const employeeId = '22222222-2222-2222-2222-222222222222'
  const state = {
    users: {
      [managerId]: { id: managerId, role: 'manager', department_id: 'dep1', is_active: true },
      [employeeId]: { id: employeeId, role: 'employee', department_id: 'dep1', is_active: true }
    }
  }

  const mockDb = {
    query: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('SELECT id FROM users')) {
        const id = params[0]
        const u = (state.users as any)[id]
        if (u) {
          if (sql.includes('department_id = $2')) {
            const dept = (state.users as any)[id]?.department_id
            if (dept === params[1]) return { rows: [u] }
            return { rows: [] }
          }
          return { rows: [u] }
        }
        return { rows: [] }
      }
      if (sql.includes('INSERT INTO tasks')) {
        return { rows: [{ id: 'task1', title: params[1], assigned_to: params[3] }], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })
  } as any

  beforeAll(() => {
    jest.spyOn(DatabaseFactory, 'getPrimaryDatabase').mockReturnValue(mockDb)
  })

  test('manager assigns to employee in same department', async () => {
    const svc = new TaskService() as any
    const user = { companyId, userId: managerId, role: 'manager' }
    const data = { title: 'Test', assignedTo: employeeId }
    const res = await svc.createTask(data, user)
    expect(res.title).toBe('Test')
    expect(res.assigned_to).toBe(employeeId)
  })
})
