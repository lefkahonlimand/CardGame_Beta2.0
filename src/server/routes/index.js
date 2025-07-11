import { gameRoutes } from './gameRoutes.js';
import { healthRoutes } from './healthRoutes.js';
import { dashboardRoutes } from './dashboardRoutes.js';

/**
 * Register all application routes with clean API separation
 * @param {Object} app - Fastify instance
 */
export async function registerRoutes(app) {
  // Root route
  app.get('/', async (request, reply) => {
    return {
      name: 'Card Estimation Game API',
      version: '2.0.0',
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
  });
  
  // Health check routes
  await app.register(healthRoutes, { prefix: '/health' });
  
  // Dashboard API routes (REST only - for lobby management)
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  
  // Game API routes (REST + Socket.IO - for game state)
  await app.register(gameRoutes, { prefix: '/api/game' });
}

export default registerRoutes;
