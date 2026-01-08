import { buildApp } from '../../src/app'
import { DatabaseFactory } from '../../src/infrastructure/database/DatabaseFactory';

describe('Error Handler', () => {
  let app: any
  beforeAll(async () => {
    jest.spyOn(DatabaseFactory, 'getPrimaryDatabase').mockReturnValue({
      healthCheck: async () => true,
      query: async () => ({ rows: [], rowCount: 0 }),
      close: async () => {},
      getType: () => 'postgres'
    } as any)
    app = await buildApp()
    app.get('/api/test-error', async () => {
      throw Object.assign(new Error('Boom'), { statusCode: 500 })
    })
  })
  afterAll(async () => {
    await app.close()
  })
  test('returns standardized error response', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/test-error' })
    const body = res.json()
    expect(res.statusCode).toBe(500)
    expect(body.success).toBe(false)
    expect(typeof body.message).toBe('string')
  })
})
