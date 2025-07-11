import pino from 'pino';
import { config } from '../config/index.js';

/**
 * Create logger instance
 */
export const logger = pino({
  level: config.log.level,
  transport: config.nodeEnv === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  } : undefined,
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err
  }
});

/**
 * Create child logger for specific context
 * @param {Object} bindings - Additional context
 * @returns {Object} Child logger
 */
export function createChildLogger(bindings) {
  return logger.child(bindings);
}

/**
 * Log game events with structured data
 * @param {string} event - Event name
 * @param {Object} data - Event data
 * @param {string} level - Log level
 */
export function logGameEvent(event, data = {}, level = 'info') {
  logger[level]({
    event,
    gameData: data,
    timestamp: new Date().toISOString()
  }, `Game Event: ${event}`);
}

/**
 * Log socket events
 * @param {string} socketId - Socket ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export function logSocketEvent(socketId, event, data = {}) {
  logger.info({
    socketId,
    event,
    data,
    timestamp: new Date().toISOString()
  }, `Socket Event: ${event}`);
}

export default logger;
