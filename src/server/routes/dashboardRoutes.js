/**
 * Dashboard Routes - Handles session management and overview
 */

import { logger } from '../utils/logger.js';

/**
 * Register dashboard routes
 * @param {FastifyInstance} fastify - Fastify instance
 * @param {Object} options - Route options
 */
export async function dashboardRoutes(fastify, options) {
  // Get all active sessions for dashboard
  fastify.get('/sessions', async (request, reply) => {
    try {
      const sessions = fastify.gameService.getActiveSessions();
      
      // Enrich sessions with additional metadata
      const enrichedSessions = sessions.map(session => ({
        ...session,
        isJoinable: session.status === 'waiting' && session.playerCount < 8,
        playersNeeded: Math.max(0, 2 - session.playerCount),
        maxPlayers: 8,
        estimatedDuration: '15-30 min',
        gameType: 'Card Estimation'
      }));

      return {
        success: true,
        sessions: enrichedSessions,
        totalActive: sessions.length,
        totalJoinable: enrichedSessions.filter(s => s.isJoinable).length,
        serverInfo: {
          uptime: process.uptime(),
          nodeVersion: process.version,
          memoryUsage: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Failed to get dashboard sessions:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve sessions'
      });
    }
  });

  // Create new session from dashboard
  fastify.post('/sessions', async (request, reply) => {
    try {
      const { sessionName, playerName, playerId, maxPlayers = 8 } = request.body;

      // Validate required fields
      if (!sessionName || !playerName || !playerId) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: sessionName, playerName, playerId'
        });
      }

      // Create new session
      const session = await fastify.gameService.createSession();
      
      // Add the creator as first player
      const addPlayerResult = await fastify.gameService.addPlayer(
        session.id, 
        playerId, 
        playerName
      );

      if (!addPlayerResult.success) {
        return reply.status(400).send({
          success: false,
          error: addPlayerResult.reason
        });
      }

      // Update session metadata
      session.metadata = {
        name: sessionName,
        maxPlayers: maxPlayers,
        createdBy: playerName,
        createdAt: new Date().toISOString()
      };

      await fastify.gameService.saveSession(session);

      logger.info(`Dashboard: New session created`, {
        sessionId: session.id,
        sessionName,
        createdBy: playerName
      });

      return {
        success: true,
        session: {
          id: session.id,
          name: sessionName,
          playerCount: 1,
          maxPlayers: maxPlayers,
          status: 'waiting',
          createdBy: playerName,
          createdAt: session.createdAt
        }
      };
    } catch (error) {
      logger.error('Failed to create session from dashboard:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to create session'
      });
    }
  });

  // Join session from dashboard
  fastify.post('/sessions/:sessionId/join', async (request, reply) => {
    try {
      const { sessionId } = request.params;
      const { playerName, playerId } = request.body;

      if (!playerName || !playerId) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: playerName, playerId'
        });
      }

      // Get session to check if joinable
      const session = await fastify.gameService.getSession(sessionId);
      if (!session) {
        return reply.status(404).send({
          success: false,
          error: 'Session not found'
        });
      }

      if (session.status !== 'waiting') {
        return reply.status(400).send({
          success: false,
          error: 'Game is already in progress'
        });
      }

      // Add player to session
      const result = await fastify.gameService.addPlayer(sessionId, playerId, playerName);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.reason
        });
      }

      logger.info(`Dashboard: Player joined session`, {
        sessionId,
        playerId,
        playerName
      });

      return {
        success: true,
        sessionId: sessionId,
        playerCount: session.getPlayerCount() + 1,
        message: `Successfully joined session as ${playerName}`
      };
    } catch (error) {
      logger.error('Failed to join session from dashboard:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to join session'
      });
    }
  });

  // Get session details for dashboard
  fastify.get('/sessions/:sessionId', async (request, reply) => {
    try {
      const { sessionId } = request.params;
      
      const session = await fastify.gameService.getSession(sessionId);
      if (!session) {
        return reply.status(404).send({
          success: false,
          error: 'Session not found'
        });
      }

      const players = Array.from(session.players.values());
      
      return {
        success: true,
        session: {
          id: session.id,
          name: session.metadata?.name || `Session ${session.id.slice(-8)}`,
          status: session.status,
          playerCount: players.length,
          maxPlayers: session.metadata?.maxPlayers || 8,
          players: players.map(p => ({
            id: p.id,
            name: p.name,
            joinedAt: p.joinedAt
          })),
          createdAt: session.createdAt,
          createdBy: session.metadata?.createdBy,
          lastActivity: session.lastActivity
        }
      };
    } catch (error) {
      logger.error('Failed to get session details:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve session details'
      });
    }
  });

  // Get server statistics for dashboard
  fastify.get('/stats', async (request, reply) => {
    try {
      const sessions = fastify.gameService.getActiveSessions();
      const totalPlayers = sessions.reduce((sum, session) => sum + session.playerCount, 0);
      
      return {
        success: true,
        stats: {
          totalSessions: sessions.length,
          activeSessions: sessions.filter(s => s.status === 'playing').length,
          waitingSessions: sessions.filter(s => s.status === 'waiting').length,
          totalPlayers: totalPlayers,
          serverUptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Failed to get dashboard stats:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve statistics'
      });
    }
  });
}

export default dashboardRoutes;
