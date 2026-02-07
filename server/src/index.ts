import 'dotenv/config';
import './utils/sentry';
import { buildApp } from './app';
import { logger } from './utils/logger';
import { taskSchedulerService } from './services/TaskSchedulerService';
import { birthdayJobService } from './services/BirthdayJobService';

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
    logger.info(`🗄️  Database: PostgreSQL (Supabase)`);
    logger.info(`🔐 Security: Enabled`);
    logger.info(`📝 API Docs: http://${HOST}:${PORT}/health`);

    // Cookie configuration logging
    const isProduction = process.env.NODE_ENV === 'production';
    logger.info(`🍪 Cookie Settings:`);
    logger.info(`   - Domain: ${isProduction ? '.teemplot.com' : 'localhost (no domain)'}`);
    logger.info(`   - SameSite: lax`);
    logger.info(`   - Secure: ${isProduction}`);
    logger.info(`   - Secure: ${isProduction}`);
    logger.info(`   - HttpOnly: true`);

    // Start Task Scheduler
    taskSchedulerService.start();
    
    // Initialize Birthday Job
    birthdayJobService.initialize();
  } catch (error: any) {
    logger.error('Failed to start server');
    console.error('FULL ERROR:', error);
    console.error('ERROR MESSAGE:', error?.message);
    console.error('ERROR STACK:', error?.stack);
    process.exit(1);
  }
}

start();
