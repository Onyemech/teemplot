import { FastifyInstance } from 'fastify';

export async function userRoutes(server: FastifyInstance) {
  server.get('/', {
    onRequest: [server.authenticate as any],
  }, async (request: any, reply) => {
    return reply.send({ message: 'User routes placeholder' });
  });
}
