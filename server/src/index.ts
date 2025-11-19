import 'dotenv/config';
import { buildApp } from './app';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '5000');
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    logger.info('Building app...');
    const app = await buildApp();
    
    logger.info(`Attempting to listen on ${HOST}:${PORT}...`);
    await app.listen({ port: PORT, host: HOST });

    logger.info(`🚀 Server running on http://${HOST}:${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🗄️  Database: ${process.env.NODE_ENV === 'production' ? 'PostgreSQL (Supabase)' : 'SQLite (Local)'}`);
    logger.info(`🔐 Security: Enabled`);
    logger.info(`📝 API Docs: http://${HOST}:${PORT}/health`);
  } catch (error: any) {
    logger.error('Failed to start server');
    console.error('FULL ERROR:', error);
    console.error('ERROR MESSAGE:', error?.message);
    console.error('ERROR STACK:', error?.stack);
    process.exit(1);
  }
}

start();
