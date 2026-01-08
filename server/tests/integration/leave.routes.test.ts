import { buildApp } from '../../src/app'
import { DatabaseFactory } from '../../src/infrastructure/database/DatabaseFactory';

describe('Leave Routes', () => {
  let app: any

  beforeAll(async () => {
    jest.spyOn(DatabaseFactory, 'getPrimaryDatabase').mockReturnValue({
      healthCheck: async () => true,
      query: async () => ({ rows: [], rowCount: 0 }),
      close: async () => {},
      getType: () => 'postgres'
    } as any)
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  test('GET /api/leave/requests requires auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/leave/requests'
    })
    expect(res.statusCode).toBe(401)
  })
})
