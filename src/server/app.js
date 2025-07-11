import Fastify from 'fastify';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { registerPlugins } from './plugins/index.js';
import { registerRoutes } from './routes/index.js';
import { GameService } from './services/GameService.js';
import { CardService } from './services/CardService.js';
import { SocketHandler } from './controllers/SocketHandler.js';

/**
 * Build Fastify application
 * @param {Object} opts - Options for Fastify
 * @returns {Object} Fastify instance
 */
async function buildApp(opts = {}) {
  const app = Fastify({
    logger: logger,
    ...opts
  });

  // Register plugins
  await registerPlugins(app);

  // Register routes
  await registerRoutes(app);

  // Initialize services
  const cardService = new CardService();
  await cardService.initialize();
  
  const gameService = new GameService(cardService);
  app.decorate('gameService', gameService);

  // Setup Socket.IO handlers
  app.ready(() => {
    const socketHandler = new SocketHandler(app.io, gameService);
    socketHandler.setupEventHandlers();
    // Store socket handler reference without decorating
    app.socketHandler = socketHandler;
  });

  return app;
}

/**
 * Start the server
 */
async function start() {
  try {
    const app = await buildApp();
    
    await app.listen({
      port: config.port,
      host: config.host
    });

    logger.info(`🚀 Server running at http://${config.host}:${config.port}`);
    logger.info(`🎮 Game server ready for connections`);
    
    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      try {
        await app.close();
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].includes('app.js')) {
  start();
}

export { buildApp, start };
