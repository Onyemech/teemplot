import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

interface SSEClient {
  id: string;
  userId: string;
  response: FastifyReply;
}

class RealtimeService {
  private clients: Map<string, SSEClient> = new Map();

  /**
   * Handle SSE connection
   */
  async handleConnection(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as { userId: string };
    const clientId = randomUUID();

    // Set headers for SSE
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');

    // Add client to map
    this.clients.set(clientId, {
      id: clientId,
      userId: user.userId,
      response: reply,
    });

    logger.info({ userId: user.userId, clientId }, 'SSE Client connected');

    // Send initial ping
    reply.raw.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    // Keep connection alive with heartbeats
    const interval = setInterval(() => {
      if (reply.raw.writable) {
        reply.raw.write(': keepalive\n\n');
      } else {
        clearInterval(interval);
        this.clients.delete(clientId);
      }
    }, 30000);

    // Handle client disconnect
    request.raw.on('close', () => {
      clearInterval(interval);
      this.clients.delete(clientId);
      logger.info({ userId: user.userId, clientId }, 'SSE Client disconnected');
    });
  }

  /**
   * Send notification to a specific user
   */
  sendToUser(userId: string, event: string, data: any) {
    for (const client of this.clients.values()) {
      if (client.userId === userId && client.response.raw.writable) {
        try {
          const payload = JSON.stringify({ type: event, ...data });
          client.response.raw.write(`data: ${payload}\n\n`);
        } catch (error) {
          logger.error({ error, userId, clientId: client.id }, 'Failed to send SSE message');
          this.clients.delete(client.id);
        }
      }
    }
  }

  /**
   * Send notification to multiple users
   */
  sendToUsers(userIds: string[], event: string, data: any) {
    userIds.forEach(id => this.sendToUser(id, event, data));
  }
}

export const realtimeService = new RealtimeService();
