import { DatabaseFactory } from '../../src/infrastructure/database/DatabaseFactory';
import { buildApp } from '../../src/app'

describe('Leave hierarchical review', () => {
  let app: any
  const companyId = '10000000-0000-0000-0000-000000000000'
  const employee = '20000000-0000-0000-0000-000000000000'
  const state = {
    leave: {} as Record<string, any>
  }
  const mockDb = {
    query: async (sql: string, params: any[] = []) => {
      if (sql.startsWith('INSERT INTO leave_requests')) {
        const id = 'lr-1'
        state.leave[id] = { id, status: 'pending', review_stage: 'manager', company_id: companyId, user_id: employee }
        return { rows: [state.leave[id]], rowCount: 1 }
      }
      if (sql.startsWith('UPDATE leave_requests SET status=\'in_review\', review_stage=\'admin\'')) {
        const id = params[0]
        Object.assign(state.leave[id], { status: 'in_review', review_stage: 'admin' })
        return { rows: [state.leave[id]], rowCount: 1 }
      }
      if (sql.startsWith('UPDATE leave_requests SET status=\'in_review\', review_stage=\'owner\'')) {
        const id = params[0]
        Object.assign(state.leave[id], { status: 'in_review', review_stage: 'owner' })
        return { rows: [state.leave[id]], rowCount: 1 }
      }
      if (sql.startsWith('UPDATE leave_requests SET status=\'approved\'')) {
        const id = params[0]
        Object.assign(state.leave[id], { status: 'approved' })
        return { rows: [state.leave[id]], rowCount: 1 }
      }
      if (sql.startsWith('SELECT status FROM leave_requests')) {
        const id = params[0]
        return { rows: [{ status: state.leave[id].status }], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    }
  } as any

  beforeAll(async () => {
    jest.spyOn(DatabaseFactory, 'getPrimaryDatabase').mockReturnValue(mockDb)
    app = await buildApp()
  })
  afterAll(async () => {
    await app.close()
  })
  test('request -> manager approve -> admin approve -> owner approve', async () => {
    const lr = await mockDb.query(
      `INSERT INTO leave_requests (company_id, user_id, leave_type, start_date, end_date, total_days, reason, half_day, status, review_stage)
       VALUES ($1,$2,'annual','2026-01-10','2026-01-12',3,'test',false,'pending','manager') RETURNING *`,
      [companyId, employee]
    )
    const id = lr.rows[0].id
    await mockDb.query(`UPDATE leave_requests SET status='in_review', review_stage='admin' WHERE id=$1`, [id])
    await mockDb.query(`UPDATE leave_requests SET status='in_review', review_stage='owner' WHERE id=$1`, [id])
    await mockDb.query(`UPDATE leave_requests SET status='approved' WHERE id=$1`, [id])
    const final = await mockDb.query(`SELECT status FROM leave_requests WHERE id=$1`, [id])
    expect(final.rows[0].status).toBe('approved')
  })
})
