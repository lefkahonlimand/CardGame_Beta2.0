/**
 * Game API routes
 * @param {Object} app - Fastify instance
 */
export async function gameRoutes(app) {
  // Get all active sessions
  app.get('/sessions', async (request, reply) => {
    const gameService = app.gameService;
    
    if (!gameService) {
      return reply.code(503).send({
        error: 'Game service not available'
      });
    }

    const sessions = gameService.getActiveSessions();
    return {
      sessions,
      count: sessions.length,
      timestamp: new Date().toISOString()
    };
  });

  // Get specific session info
  app.get('/sessions/:sessionId', async (request, reply) => {
    const { sessionId } = request.params;
    const gameService = app.gameService;
    
    if (!gameService) {
      return reply.code(503).send({
        error: 'Game service not available'
      });
    }

    const session = await gameService.getSession(sessionId);
    
    if (!session) {
      return reply.code(404).send({
        error: 'Session not found'
      });
    }

    return {
      session: {
        id: session.id,
        playerCount: session.getPlayerCount(),
        status: session.status,
        players: Array.from(session.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          joinedAt: p.joinedAt
        })),
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        boardStats: session.gameBoard.getStats()
      },
      timestamp: new Date().toISOString()
    };
  });

  // Create new session
  app.post('/sessions', async (request, reply) => {
    const gameService = app.gameService;
    
    if (!gameService) {
      return reply.code(503).send({
        error: 'Game service not available'
      });
    }

    const { sessionId, playerName } = request.body || {};
    
    try {
      const session = await gameService.createSession(sessionId);
      
      // Note: Player will be added when they join, not during session creation
      
      return reply.code(201).send({
        sessionId: session.id,
        session: {
          id: session.id,
          status: session.status,
          createdAt: session.createdAt
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      app.log.error('Failed to create session:', error);
      return reply.code(500).send({
        error: 'Failed to create session'
      });
    }
  });

  // Get insertion points for a card
  app.post('/insertion-points', async (request, reply) => {
    const { sessionId, cardId } = request.body;
    const gameService = app.gameService;
    
    if (!gameService) {
      return reply.code(503).send({
        error: 'Game service not available'
      });
    }

    try {
      const result = await gameService.getInsertionPoints(sessionId);
      
      if (!result.success) {
        return reply.code(404).send({
          error: result.reason
        });
      }
      
      return result.insertionPoints;
    } catch (error) {
      app.log.error('Failed to get insertion points:', error);
      return reply.code(500).send({
        error: 'Failed to get insertion points'
      });
    }
  });

  // Execute a move
  app.post('/move', async (request, reply) => {
    const { sessionId, cardId, position } = request.body;
    const gameService = app.gameService;
    
    if (!gameService) {
      return reply.code(503).send({
        error: 'Game service not available'
      });
    }

    try {
      const result = await gameService.makeMove(sessionId, 'player1', cardId, position);
      
      if (!result.success) {
        return reply.code(400).send({
          success: false,
          message: result.reason
        });
      }
      
      return {
        success: true,
        result: result
      };
    } catch (error) {
      app.log.error('Failed to execute move:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to execute move'
      });
    }
  });

  // Get cards info
  app.get('/cards', async (request, reply) => {
    const gameService = app.gameService;
    
    if (!gameService || !gameService.cardService) {
      return reply.code(503).send({
        error: 'Card service not available'
      });
    }

    const cards = gameService.cardService.getAllCards();
    const stats = gameService.cardService.getCardStats();
    
    return {
      cards: cards.map(card => card.toJSON()),
      stats,
      timestamp: new Date().toISOString()
    };
  });

  // Get specific card
  app.get('/cards/:cardId', async (request, reply) => {
    const { cardId } = request.params;
    const gameService = app.gameService;
    
    if (!gameService || !gameService.cardService) {
      return reply.code(503).send({
        error: 'Card service not available'
      });
    }

    const card = gameService.cardService.getCardById(cardId);
    
    if (!card) {
      return reply.code(404).send({
        error: 'Card not found'
      });
    }

    return {
      card: card.toJSON(),
      timestamp: new Date().toISOString()
    };
  });

  // Search cards
  app.get('/cards/search/:query', async (request, reply) => {
    const { query } = request.params;
    const gameService = app.gameService;
    
    if (!gameService || !gameService.cardService) {
      return reply.code(503).send({
        error: 'Card service not available'
      });
    }

    const cards = gameService.cardService.searchCards(query);
    
    return {
      cards: cards.map(card => card.toJSON()),
      query,
      count: cards.length,
      timestamp: new Date().toISOString()
    };
  });

  // Get insertion points for a session
  app.get('/sessions/:sessionId/insertions', async (request, reply) => {
    const { sessionId } = request.params;
    const gameService = app.gameService;
    
    if (!gameService) {
      return reply.code(503).send({
        error: 'Game service not available'
      });
    }

    const result = await gameService.getInsertionPoints(sessionId);
    
    if (!result.success) {
      return reply.code(404).send({
        error: result.reason
      });
    }

    return {
      insertionPoints: result.insertionPoints,
      sessionId,
      timestamp: new Date().toISOString()
    };
  });

  // Get game state for a session and player
  app.get('/sessions/:sessionId/state/:playerId', async (request, reply) => {
    const { sessionId, playerId } = request.params;
    const gameService = app.gameService;
    
    if (!gameService) {
      return reply.code(503).send({
        error: 'Game service not available'
      });
    }

    const result = await gameService.getGameState(sessionId, playerId);
    
    if (!result.success) {
      return reply.code(404).send({
        error: result.reason
      });
    }

    return {
      gameState: result.gameState,
      timestamp: new Date().toISOString()
    };
  });

  // Add player to session
  app.post('/sessions/:sessionId/players', async (request, reply) => {
    const { sessionId } = request.params;
    const { playerId, playerName } = request.body;
    const gameService = app.gameService;
    
    if (!gameService) {
      return reply.code(503).send({
        error: 'Game service not available'
      });
    }

    try {
      const result = await gameService.addPlayer(sessionId, playerId, playerName);
      
      if (!result.success) {
        return reply.code(400).send({
          success: false,
          message: result.reason
        });
      }
      
      return {
        success: true,
        message: 'Player added successfully'
      };
    } catch (error) {
      app.log.error('Failed to add player:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to add player'
      });
    }
  });

  // Start game
  app.post('/sessions/:sessionId/start', async (request, reply) => {
    const { sessionId } = request.params;
    const { playerId } = request.body;
    const gameService = app.gameService;
    
    if (!gameService) {
      return reply.code(503).send({
        error: 'Game service not available'
      });
    }

    try {
      const result = await gameService.startGame(sessionId, playerId);
      
      if (!result.success) {
        return reply.code(400).send({
          success: false,
          message: result.reason
        });
      }
      
      return {
        success: true,
        message: 'Game started successfully'
      };
    } catch (error) {
      app.log.error('Failed to start game:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to start game'
      });
    }
  });

  // Delete session
  app.delete('/sessions/:sessionId', async (request, reply) => {
    const { sessionId } = request.params;
    const gameService = app.gameService;
    
    if (!gameService) {
      return reply.code(503).send({
        error: 'Game service not available'
      });
    }

    await gameService.deleteSession(sessionId);
    
    return reply.code(204).send();
  });

  // Get server statistics
  app.get('/stats', async (request, reply) => {
    const gameService = app.gameService;
    const connectionStats = app.socketHandler?.getConnectionStats() || {};
    
    return {
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      },
      game: {
        activeSessions: gameService ? gameService.getActiveSessions().length : 0,
        totalCards: gameService?.cardService?.getAllCards().length || 0
      },
      connections: connectionStats,
      timestamp: new Date().toISOString()
    };
  });
}

export default gameRoutes;
