import { gameRoutes } from './gameRoutes.js';
import { healthRoutes } from './healthRoutes.js';
import { dashboardRoutes } from './dashboardRoutes.js';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Register all application routes with clean API separation
 * @param {Object} app - Fastify instance
 */
export async function registerRoutes(app) {
  // API status endpoint
  app.get('/api', async (request, reply) => {
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
  
  // Static file serving for built assets
  app.register(async function (fastify) {
    await fastify.register(fastifyStatic, {
      root: path.join(__dirname, '../../../dist/assets'),
      prefix: '/assets/',
      decorateReply: false,
      setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        }
      }
    });
  });
  
  // Serve HTML files explicitly using fs
  app.get('/index.html', async (request, reply) => {
    try {
      const indexPath = path.join(__dirname, '../../../dist/index.html');
      const content = await fs.readFile(indexPath, 'utf8');
      return reply.type('text/html').send(content);
    } catch (error) {
      return reply.code(404).send({ error: 'File not found' });
    }
  });
  
  app.get('/game.html', async (request, reply) => {
    try {
      const gamePath = path.join(__dirname, '../../../dist/game.html');
      const content = await fs.readFile(gamePath, 'utf8');
      return reply.type('text/html').send(content);
    } catch (error) {
      return reply.code(404).send({ error: 'File not found' });
    }
  });
  
  // Default route - serve index.html for root access
  app.get('/', async (request, reply) => {
    try {
      const indexPath = path.join(__dirname, '../../../dist/index.html');
      const content = await fs.readFile(indexPath, 'utf8');
      return reply.type('text/html').send(content);
    } catch (error) {
      return reply.code(404).send({ error: 'File not found' });
    }
  });
}

export default registerRoutes;
