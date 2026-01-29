import { DatabaseFactory } from '../../src/infrastructure/database/DatabaseFactory'
import { buildApp } from '../../src/app'

describe('Leave type normalization', () => {
  let app: any
  const companyId = '10000000-0000-0000-0000-000000000000'
  const userId = '20000000-0000-0000-0000-000000000000'
  const state: any = { inserted: null }

  const mockDb = {
    query: async (sql: string, params: any[] = []) => {
      if (sql.startsWith('SELECT annual_leave_balance FROM users')) {
        return { rows: [{ annual_leave_balance: 30 }], rowCount: 1 }
      }
      if (sql.startsWith('SELECT department_id FROM users')) {
        return { rows: [{ department_id: null }], rowCount: 1 }
      }
      if (sql.startsWith('INSERT INTO leave_requests')) {
        state.inserted = { sql, params }
        return { rows: [{ id: 'lr-1', company_id: companyId, user_id: userId, leave_type: params[2] }], rowCount: 1 }
      }
      if (sql.startsWith('INSERT INTO audit_logs')) {
        return { rows: [], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    },
    findOne: async (_table: string, _where: any) => {
      return { id: companyId, subscription_status: 'trial', subscription_plan: 'trial', trial_end_date: new Date(Date.now() + 86400000).toISOString() }
    },
    update: async () => ({ rows: [], rowCount: 1 })
  } as any

  beforeAll(async () => {
    jest.spyOn(DatabaseFactory, 'getPrimaryDatabase').mockReturnValue(mockDb)
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
    jest.restoreAllMocks()
  })

  test('normalizes "Annual Leave" to "annual"', async () => {
    const token = app.jwt.sign({ companyId, userId, role: 'employee' })
    const res = await app.inject({
      method: 'POST',
      url: '/api/leave/request',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        leaveType: 'Annual Leave',
        startDate: '2026-01-29',
        endDate: '2026-01-31',
        reason: 'Test',
        halfDay: false
      }
    })
    expect(res.statusCode).toBe(201)
    expect(state.inserted?.params?.[2]).toBe('annual')
  })
})
