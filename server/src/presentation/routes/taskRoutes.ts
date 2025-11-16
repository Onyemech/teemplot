import { FastifyInstance } from 'fastify';

export async function taskRoutes(server: FastifyInstance) {
  server.get('/', {
    onRequest: [server.authenticate as any],
  }, async (request: any, reply) => {
    return reply.send({ message: 'Task routes placeholder' });
  });
}
