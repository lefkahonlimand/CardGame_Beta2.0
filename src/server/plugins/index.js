import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySocketIO from 'fastify-socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Register all Fastify plugins
 * @param {Object} app - Fastify instance
 */
export async function registerPlugins(app) {
  // Security plugins
  await app.register(fastifyHelmet, {
    // Disable CSP and nosniff for development
    contentSecurityPolicy: config.nodeEnv === 'production',
    noSniff: config.nodeEnv === 'production'
  });

  // CORS configuration
  await app.register(fastifyCors, {
    origin: config.cors.origin === '*' ? true : config.cors.origin,
    credentials: config.cors.credentials
  });

  // Rate limiting
  await app.register(fastifyRateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow,
    errorResponseBuilder: (request, context) => {
      return {
        code: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded, retry in ${context.ttl}ms`
      };
    }
  });

  // Socket.IO integration
  await app.register(fastifySocketIO, {
    cors: {
      origin: config.cors.origin === '*' ? true : config.cors.origin,
      credentials: config.cors.credentials
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // We'll handle frontend serving in routes, not here to avoid conflicts

  // Static file serving for public assets
  await app.register(async function (fastify) {
    await fastify.register(fastifyStatic, {
      root: path.join(__dirname, '../../../public'),
      prefix: '/public/',
      decorateReply: false
    });
  });

  // Serve client files
  await app.register(async function (fastify) {
    await fastify.register(fastifyStatic, {
      root: path.join(__dirname, '../../../src/client'),
      prefix: '/client/',
      decorateReply: false
    });
  });

  // Custom error handler
  app.setErrorHandler(async (error, request, reply) => {
    app.log.error(error);
    
    // Don't leak error details in production
    if (config.nodeEnv === 'production') {
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Something went wrong'
      });
    } else {
      reply.code(500).send({
        error: error.name,
        message: error.message,
        stack: error.stack
      });
    }
  });

  // Request logging
  app.addHook('onRequest', async (request, reply) => {
    app.log.info(`${request.method} ${request.url}`);
  });

  // Response time logging
  app.addHook('onResponse', async (request, reply) => {
    app.log.info(`${request.method} ${request.url} - ${reply.statusCode} (${reply.getResponseTime()}ms)`);
  });
}

export default registerPlugins;
