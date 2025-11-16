import { FastifyInstance } from 'fastify';

export async function companyRoutes(server: FastifyInstance) {
  server.get('/', {
    onRequest: [server.authenticate as any],
  }, async (request: any, reply) => {
    return reply.send({ message: 'Company routes placeholder' });
  });
}
