/**
 * Health check routes
 * @param {Object} app - Fastify instance
 */
export async function healthRoutes(app) {
  // Basic health check
  app.get('/', async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    };
  });

  // Detailed health check
  app.get('/detailed', async (request, reply) => {
    const gameService = app.gameService;
    const connectionStats = app.io ? 
      app.socketHandler?.getConnectionStats() : 
      { totalConnections: 0, playersInSessions: 0, activeSessions: 0 };

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      game: {
        activeSessions: gameService ? gameService.getActiveSessions().length : 0,
        connections: connectionStats
      },
      services: {
        cardService: gameService?.cardService ? 'ready' : 'not initialized',
        gameService: gameService ? 'ready' : 'not initialized',
        redisService: gameService?.redisService ? 'ready' : 'not available'
      }
    };
  });

  // Readiness check
  app.get('/ready', async (request, reply) => {
    const gameService = app.gameService;
    
    if (!gameService || !gameService.cardService) {
      return reply.code(503).send({
        status: 'not ready',
        reason: 'Game services not initialized',
        timestamp: new Date().toISOString()
      });
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString()
    };
  });

  // Liveness check
  app.get('/live', async (request, reply) => {
    return {
      status: 'alive',
      timestamp: new Date().toISOString()
    };
  });
}

export default healthRoutes;
