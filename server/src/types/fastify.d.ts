import '@fastify/jwt';
import '@fastify/cookie';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      userId: string;
      companyId: string;
      role: string;
      email: string;
    };
  }
}
