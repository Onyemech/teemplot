// import Fastify from 'fastify'
// import locationRoutes from '../../src/routes/location.routes'

// describe('Location Routes', () => {
//   it('rejects missing latitude/longitude', async () => {
//     const app = Fastify()
//     // minimal auth decorator to bypass JWT
//     app.decorate('authenticate', async (_req: any, _rep: any) => {})
//     await app.register(locationRoutes, { prefix: '/api/location' })

//     const res = await app.inject({
//       method: 'POST',
//       url: '/api/location/update',
//       payload: { permissionState: 'granted' }
//     })
//     expect(res.statusCode).toBe(400)
//   })
// })
