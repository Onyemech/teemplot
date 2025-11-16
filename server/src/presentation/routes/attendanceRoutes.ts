import { FastifyInstance } from 'fastify';

export async function attendanceRoutes(server: FastifyInstance) {
  server.get('/', {
    onRequest: [server.authenticate as any],
  }, async (request: any, reply) => {
    return reply.send({ message: 'Attendance routes placeholder' });
  });
}
