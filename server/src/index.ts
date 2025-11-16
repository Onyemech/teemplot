import { buildServer } from './server';
import { config_env } from './config/environment';

async function start() {
  try {
    const server = await buildServer();

    await server.listen({
      port: config_env.port,
      host: '0.0.0.0',
    });

    server.log.info(`Server listening on port ${config_env.port}`);
    server.log.info(`Environment: ${config_env.isDevelopment ? 'development' : 'production'}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

start();
