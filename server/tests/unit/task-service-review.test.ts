import { TaskService } from '../../src/services/TaskService'
import { DatabaseFactory } from '../../src/infrastructure/database/DatabaseFactory';

describe('TaskService review workflow', () => {
  const companyId = '00000000-0000-0000-0000-000000000002'
  const adminA = '11111111-2222-3333-4444-555555555555'
  const adminB = '66666666-7777-8888-9999-000000000000'
  const employee = '99999999-8888-7777-6666-555555555555'

  const state = {
    users: {
      [adminA]: { id: adminA, role: 'admin', department_id: 'depX', is_active: true },
      [adminB]: { id: adminB, role: 'admin', department_id: 'depX', is_active: true },
      [employee]: { id: employee, role: 'employee', department_id: 'depX', is_active: true },
    },
    tasks: {} as Record<string, any>
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
        const id = 'task-review'
        state.tasks[id] = { id, assigned_to: params[3], created_by: params[4], review_status: null, status: 'pending', company_id: companyId }
        return { rows: [state.tasks[id]], rowCount: 1 }
      }
      if (sql.includes('SELECT * FROM tasks WHERE id = $1 AND company_id = $2')) {
        const id = params[0]
        const t = state.tasks[id]
        return { rows: t ? [t] : [], rowCount: t ? 1 : 0 }
      }
      if (sql.includes('UPDATE tasks') && sql.includes('marked_complete_at')) {
        const id = params[3]
        const t = state.tasks[id]
        Object.assign(t, { status: 'awaiting_review', review_status: 'pending_review', marked_complete_by: params[0], company_id: params[4] })
        return { rows: [t], rowCount: 1 }
      }
      if (sql.includes('UPDATE tasks') && sql.includes('reviewed_at')) {
        const id = params[5]
        const t = state.tasks[id]
        const newStatus = params[0]
        const reviewStatus = params[1]
        Object.assign(t, { status: newStatus, review_status: reviewStatus, reviewed_by: params[2] })
        return { rows: [t], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })
  } as any

  let taskId = 'task-review'

  beforeAll(async () => {
    jest.spyOn(DatabaseFactory, 'getPrimaryDatabase').mockReturnValue(mockDb)
    const svc = new TaskService() as any
    const task = await svc.createTask({ title: 'r', assignedTo: employee }, { companyId, userId: adminA, role: 'admin' })
    taskId = task.id
  })

  test('assignee marks complete and original assigner approves', async () => {
    const svc = new TaskService() as any
    const completed = await svc.markTaskComplete(taskId, { actualHours: 1, completionNotes: 'done' }, { companyId, userId: employee, role: 'employee' })
    expect(completed.review_status).toBe('pending_review')
    const reviewed = await svc.reviewTask(taskId, { approved: true, reviewNotes: 'ok' }, { companyId, userId: adminA, role: 'admin' })
    expect(reviewed.status).toBe('completed')
    expect(reviewed.review_status).toBe('approved')
  })

  test('non-assigner cannot review', async () => {
    const svc = new TaskService() as any
    await expect(svc.reviewTask(taskId, { approved: true }, { companyId, userId: adminB, role: 'admin' })).rejects.toThrow()
  })
})
