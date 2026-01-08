import { TaskService } from '../../src/services/TaskService'
import { DatabaseFactory } from '../../src/infrastructure/database/DatabaseFactory';

describe('TaskService denials', () => {
  const companyId = '00000000-0000-0000-0000-000000000001'
  const mgr = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  const emp1 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  const emp2 = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  const state = {
    users: {
      [mgr]: { id: mgr, role: 'manager', department_id: 'depA', is_active: true },
      [emp1]: { id: emp1, role: 'employee', department_id: 'depA', is_active: true },
      [emp2]: { id: emp2, role: 'employee', department_id: 'depB', is_active: true },
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
        return { rows: [{ id: 'taskX', title: params[1], assigned_to: params[3] }], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })
  } as any

  beforeAll(() => {
    jest.spyOn(DatabaseFactory, 'getPrimaryDatabase').mockReturnValue(mockDb)
  })

  test('employee cannot create tasks', async () => {
    const svc = new TaskService() as any
    const user = { companyId, userId: emp1, role: 'employee' }
    await expect(svc.createTask({ title: 't', assignedTo: emp1 }, user)).rejects.toThrow()
  })

  test('manager cannot assign cross-department', async () => {
    const svc = new TaskService() as any
    const user = { companyId, userId: mgr, role: 'manager' }
    await expect(svc.createTask({ title: 't', assignedTo: emp2 }, user)).rejects.toThrow()
  })
})
