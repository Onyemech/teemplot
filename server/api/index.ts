import 'dotenv/config';
import { buildApp } from '../dist/app';

let app: any = null;

export default async function handler(req: any, res: any) {
  try {
    if (!app) {
      app = await buildApp();
      await app.ready();
    }

    // Convert Vercel request to Fastify request
    app.server.emit('request', req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
