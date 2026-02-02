jest.mock('../../src/services/AuditService', () => ({
  auditService: { logAction: jest.fn().mockResolvedValue(undefined) }
}))

jest.mock('../../src/infrastructure/database/DatabaseFactory', () => ({
  DatabaseFactory: { getPrimaryDatabase: jest.fn() }
}))

import { requireFeature } from '../../src/middleware/subscription.middleware'
import { DatabaseFactory } from '../../src/infrastructure/database/DatabaseFactory'

describe('subscription middleware feature gating', () => {
  it('denies gold feature on silver plan', async () => {
    const db = {
      findOne: jest.fn().mockResolvedValue({
        id: 'c1',
        subscription_status: 'active',
        subscription_plan: 'silver_monthly'
      }),
      update: jest.fn()
    }

    ;(DatabaseFactory.getPrimaryDatabase as any).mockReturnValue(db)

    const request: any = {
      user: { userId: 'u1', companyId: 'c1' },
      method: 'GET',
      url: '/api/analytics/admin/dashboard'
    }
    const reply: any = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn()
    }

    await requireFeature('analytics')(request, reply)

    expect(reply.code).toHaveBeenCalledWith(403)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'FEATURE_NOT_AVAILABLE' })
    )
  })

  it('allows feature on trial', async () => {
    const db = {
      findOne: jest.fn().mockResolvedValue({
        id: 'c1',
        subscription_status: 'trial',
        trial_end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      }),
      update: jest.fn()
    }

    ;(DatabaseFactory.getPrimaryDatabase as any).mockReturnValue(db)

    const request: any = {
      user: { userId: 'u1', companyId: 'c1' },
      method: 'GET',
      url: '/api/tasks'
    }
    const reply: any = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn()
    }

    await requireFeature('tasks')(request, reply)
    expect(reply.code).not.toHaveBeenCalledWith(403)
  })
})

