import { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (error) {
    return reply.code(401).send({
      success: false,
      message: 'Unauthorized. Please login.',
    });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    
    const user = (request as any).user;
    
    if (user.role !== 'admin') {
      return reply.code(403).send({
        success: false,
        message: 'Admin access required',
      });
    }
  } catch (error) {
    return reply.code(401).send({
      success: false,
      message: 'Unauthorized',
    });
  }
}
