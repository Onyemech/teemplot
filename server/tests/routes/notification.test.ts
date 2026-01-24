// import Fastify, { FastifyInstance } from 'fastify';
// import { notificationRoutes } from '../../src/routes/notifications.routes';
// import { notificationService } from '../../src/services/NotificationService';
// import { DatabaseFactory } from '../../src/infrastructure/database/DatabaseFactory';
// import jwt from '@fastify/jwt';
// import { describe, it, beforeAll, afterAll, expect, jest } from '@jest/globals';

// // Mock the notification service
// jest.mock('../../src/services/NotificationService', () => ({
//   notificationService: {
//     getNotifications: jest.fn(),
//   },
// }));

// describe('Notification Routes', () => {
//   let app: FastifyInstance;

//   beforeAll(async () => {
//     app = Fastify();

//     // Register JWT
//     await app.register(jwt, {
//       secret: 'test-secret-key-for-testing-only',
//     });

//     // Add authenticate decorator
//     app.decorate('authenticate', async function (request: any, reply: any) {
//       try {
//         await request.jwtVerify();
//         // Mock user
//         request.user = { id: 'test-user-id' };
//       } catch (err) {
//         reply.code(401).send({ success: false, message: 'Unauthorized' });
//       }
//     });

//     // Register routes
//     await app.register(notificationRoutes, { prefix: '/api/notifications' });

//     // Register the singular route
//     app.get('/api/notification', {
//         onRequest: [app.authenticate]
//       }, async (request: any, reply: any) => {
//         try {
//           const userId = (request.user as any).id || (request.user as any).userId;
//           const { page, limit } = request.query as { page?: string, limit?: string };
    
//           const notifications = await notificationService.getNotifications(
//             userId,
//             parseInt(page || '1'),
//             parseInt(limit || '20')
//           );
    
//           return reply.send({ success: true, data: notifications });
//         } catch (error: any) {
//           app.log.error('Error fetching notifications:', error);
//           return reply.code(500).send({ success: false, message: 'Failed to fetch notifications' });
//         }
//       });
//   });

//   afterAll(async () => {
//     await app.close();
//   });

//   const mockNotifications = [{ id: '1', message: 'Test notification' }];
//   const token = app.jwt.sign({ id: 'test-user-id' });

//   describe('GET /api/notification', () => {
//     it('should return notifications successfully', async () => {
//       (notificationService.getNotifications as jest.Mock).mockResolvedValue(mockNotifications);

//       const response = await app.inject({
//         method: 'GET',
//         url: '/api/notification',
//         headers: {
//           authorization: `Bearer ${token}`,
//         },
//       });

//       expect(response.statusCode).toBe(200);
//       const body = JSON.parse(response.body);
//       expect(body.success).toBe(true);
//       expect(body.data).toEqual(mockNotifications);
//     });
//   });

//   describe('GET /api/notifications', () => {
//     it('should return notifications successfully', async () => {
//       (notificationService.getNotifications as jest.Mock).mockResolvedValue(mockNotifications);

//       const response = await app.inject({
//         method: 'GET',
//         url: '/api/notifications',
//         headers: {
//           authorization: `Bearer ${token}`,
//         },
//       });

//       expect(response.statusCode).toBe(200);
//       const body = JSON.parse(response.body);
//       expect(body.success).toBe(true);
//       expect(body.data).toEqual(mockNotifications);
//     });
//   });
// });
