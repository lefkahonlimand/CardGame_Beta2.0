import { logSocketEvent, logger } from '../utils/logger.js';

/**
 * Socket Handler - Manages WebSocket events for real-time communication
 */
export class SocketHandler {
  constructor(io, gameService) {
    this.io = io;
    this.gameService = gameService;
    this.connectedClients = new Map(); // socketId -> {playerId, sessionId}
  }

  /**
   * Setup event handlers for Socket.IO
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logSocketEvent(socket.id, 'connection');
      
      // Store connection info
      this.connectedClients.set(socket.id, {
        playerId: null,
        sessionId: null,
        connectedAt: Date.now()
      });

      // Handle player joining a session (old method)
      socket.on('joinSession', async (data) => {
        await this.handleJoinSession(socket, data);
      });

      // Handle joining a room from dashboard (new method)
      socket.on('joinRoom', async (data) => {
        await this.handleJoinRoom(socket, data);
      });

      // Handle leaving a room
      socket.on('leaveRoom', async (data) => {
        await this.handleLeaveRoom(socket, data);
      });

      // Handle starting a game
      socket.on('startGame', async (data) => {
        await this.handleStartGame(socket, data);
      });

      // Handle player moves
      socket.on('playerMove', async (data) => {
        await this.handlePlayerMove(socket, data);
      });

      // Handle requesting insertion points
      socket.on('getInsertionPoints', async (data) => {
        await this.handleGetInsertionPoints(socket, data);
      });

      // Handle requesting game state
      socket.on('getGameState', async (data) => {
        await this.handleGetGameState(socket, data);
      });

      // Handle revealing cards at round end
      socket.on('revealCards', async (data) => {
        await this.handleRevealCards(socket, data);
      });

      // Handle starting new round
      socket.on('startNewRound', async (data) => {
        await this.handleStartNewRound(socket, data);
      });

      // Handle invalid move acknowledgment
      socket.on('acknowledgeInvalidMove', async (data) => {
        await this.handleAcknowledgeInvalidMove(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });

    logger.info('Socket.IO event handlers initialized');
  }

  /**
   * Handle joining a room from dashboard (new method)
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Join data {sessionId, playerId}
   */
  async handleJoinRoom(socket, data) {
    try {
      logSocketEvent(socket.id, 'joinRoom', data);

      const { sessionId, playerId } = data;
      
      if (!sessionId || !playerId) {
        socket.emit('error', { message: 'Session ID and player ID are required' });
        return;
      }

      // Get session (should already exist from dashboard)
      const session = await this.gameService.getSession(sessionId);
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      // Update connection info
      const clientInfo = this.connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.playerId = playerId;
        clientInfo.sessionId = sessionId;
      }

      // Join socket room
      socket.join(sessionId);

      // Send game state to player
      const gameStateResult = await this.gameService.getGameState(sessionId, playerId);
      if (gameStateResult.success) {
        socket.emit('gameState', gameStateResult.gameState);
      }

      // Notify other players in room
      socket.to(sessionId).emit('playerConnected', {
        playerId: playerId,
        socketId: socket.id,
        timestamp: Date.now()
      });

      logger.info(`Player ${playerId} connected to room ${sessionId}`);

    } catch (error) {
      logger.error('Error handling joinRoom:', error);
      socket.emit('error', { message: 'Internal server error' });
    }
  }

  /**
   * Handle leaving a room
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Leave data {sessionId, playerId}
   */
  async handleLeaveRoom(socket, data) {
    try {
      logSocketEvent(socket.id, 'leaveRoom', data);

      const clientInfo = this.connectedClients.get(socket.id);
      if (!clientInfo || !clientInfo.sessionId) {
        return; // Not in a session
      }

      const { sessionId } = clientInfo;

      // Leave socket room
      socket.leave(sessionId);

      // Update connection info
      clientInfo.sessionId = null;
      clientInfo.playerId = null;

      // Notify other players
      socket.to(sessionId).emit('playerDisconnected', {
        playerId: clientInfo.playerId,
        socketId: socket.id,
        timestamp: Date.now()
      });

      logger.info(`Player left room ${sessionId}`);

    } catch (error) {
      logger.error('Error handling leaveRoom:', error);
    }
  }

  /**
   * Handle player joining a session (old method)
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Join data {sessionId, playerName, playerId}
   */
  async handleJoinSession(socket, data) {
    try {
      logSocketEvent(socket.id, 'joinSession', data);

      const { sessionId, playerName, playerId } = data;
      
      if (!sessionId || !playerName || !playerId) {
        socket.emit('error', { message: 'Session ID, player name and player ID are required' });
        return;
      }

      // Get or create session
      let session = await this.gameService.getSession(sessionId);
      if (!session) {
        session = await this.gameService.createSession(sessionId);
      }

      // Add player to session using proper playerId
      const result = await this.gameService.addPlayer(sessionId, playerId, playerName);
      
      if (!result.success) {
        socket.emit('error', { message: result.reason });
        return;
      }

      // Update connection info
      const clientInfo = this.connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.playerId = playerId;
        clientInfo.sessionId = sessionId;
      }

      // Join socket room
      socket.join(sessionId);

      // Send game state to player
      const gameStateResult = await this.gameService.getGameState(sessionId, playerId);
      if (gameStateResult.success) {
        socket.emit('gameState', gameStateResult.gameState);
      }

      // Notify other players
      socket.to(sessionId).emit('playerJoined', {
        playerId: playerId,
        playerName: playerName,
        playerCount: session.getPlayerCount()
      });

      logger.info(`Player ${playerName} (${playerId}) joined session ${sessionId}`);

    } catch (error) {
      logger.error('Error handling joinSession:', error);
      socket.emit('error', { message: 'Internal server error' });
    }
  }

  /**
   * Handle starting a game
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Start game data {sessionId}
   */
  async handleStartGame(socket, data) {
    try {
      logSocketEvent(socket.id, 'startGame', data);
      console.log('🚀 StartGame handler called:', {
        socketId: socket.id,
        data,
        connectedClients: this.connectedClients.size
      });

      const clientInfo = this.connectedClients.get(socket.id);
      console.log('📋 Client info:', clientInfo);
      
      if (!clientInfo || !clientInfo.sessionId) {
        console.error('❌ Client not connected to session:', { clientInfo });
        socket.emit('error', { message: 'Not connected to a session' });
        return;
      }

      const { sessionId } = clientInfo;
      console.log('🎯 Starting game for session:', sessionId);
      
      // Get session info before starting
      const session = await this.gameService.getSession(sessionId);
      console.log('📊 Session before start:', {
        sessionId,
        playerCount: session?.getPlayerCount(),
        status: session?.status,
        players: session ? Array.from(session.players.keys()) : []
      });
      
      // Start game
      const result = await this.gameService.startGame(sessionId, clientInfo.playerId);
      console.log('🎮 Game start result:', result);
      
      if (!result.success) {
        console.error('❌ Failed to start game:', result.reason);
        socket.emit('error', { message: result.reason });
        return;
      }

      console.log('✅ Game started successfully, broadcasting state...');
      
      // Broadcast game state to all players in session
      await this.broadcastGameState(sessionId);
      
      // Send game started event
      const gameStartedEvent = {
        startedBy: clientInfo.playerId,
        timestamp: Date.now()
      };
      console.log('📡 Broadcasting gameStarted event:', gameStartedEvent);
      this.io.to(sessionId).emit('gameStarted', gameStartedEvent);
      
      // Additional broadcast after a small delay to ensure state sync
      setTimeout(async () => {
        console.log('🔄 Sending delayed game state broadcast...');
        await this.broadcastGameState(sessionId);
      }, 100);

      logger.info(`Game started in session ${sessionId} by ${socket.id}`);
      console.log('🎉 Game start process completed successfully');

    } catch (error) {
      console.error('💥 Error in startGame handler:', error);
      logger.error('Error handling startGame:', error);
      socket.emit('error', { message: 'Internal server error' });
    }
  }

  /**
   * Handle player moves
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Move data {cardId, insertionPoint}
   */
  async handlePlayerMove(socket, data) {
    try {
      logSocketEvent(socket.id, 'playerMove', data);
      console.log('🎯 SocketHandler.handlePlayerMove:', { 
        socketId: socket.id, 
        data,
        timestamp: new Date().toISOString() 
      });

      const clientInfo = this.connectedClients.get(socket.id);
      if (!clientInfo || !clientInfo.sessionId) {
        console.log('❌ No client info or session ID for socket:', socket.id);
        socket.emit('error', { message: 'Not connected to a session' });
        return;
      }

      const { sessionId } = clientInfo;
      const { cardId, insertionPoint } = data;

      if (!cardId || !insertionPoint) {
        console.log('❌ Missing cardId or insertionPoint:', { cardId, insertionPoint });
        socket.emit('error', { message: 'Card ID and insertion point are required' });
        return;
      }

      console.log('🔍 Executing move:', { sessionId, playerId: clientInfo.playerId, cardId, insertionPoint });

      // Execute move
      const result = await this.gameService.executeMove(sessionId, clientInfo.playerId, cardId, insertionPoint);
      
      console.log('📋 Move execution result:', { 
        success: result.success, 
        reason: result.reason, 
        gameEnded: result.gameEnded,
        boardCard: result.boardCard ? 'present' : 'absent'
      });
      
      if (!result.success) {
        if (result.gameEnded) {
          console.log('🚨 Game ended due to invalid move - sending moveConfirmed with valid: false');
          // Game ended due to invalid move
          // Still send moveConfirmed to clear UI state, but then immediately handle game end
          socket.emit('moveConfirmed', {
            cardId,
            insertionPoint,
            valid: false,
            reason: result.reason
          });
          
          console.log('⏳ Scheduling game end handler after 100ms delay');
          // Handle game end after a brief delay to ensure UI updates
          setTimeout(async () => {
            await this.handleGameEnd(sessionId, result);
          }, 100);
        } else {
          console.log('❌ Move failed but game continues - sending error:', result.reason);
          socket.emit('error', { message: result.reason });
        }
        return;
      }

      console.log('✅ Move successful - broadcasting game state and sending confirmation');
      // Broadcast updated game state to all players
      await this.broadcastGameState(sessionId);

      // Send move confirmation
      socket.emit('moveConfirmed', {
        cardId,
        insertionPoint,
        boardCard: result.boardCard,
        valid: true,
        reason: 'Move executed successfully'
      });

      logger.info(`Move executed in session ${sessionId} by ${socket.id}: ${cardId}`);
      console.log('🎉 Move handling completed successfully');

    } catch (error) {
      console.error('💥 Error in handlePlayerMove:', error);
      logger.error('Error handling playerMove:', error);
      socket.emit('error', { message: 'Internal server error' });
    }
  }

  /**
   * Handle requesting insertion points
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Request data {sessionId}
   */
  async handleGetInsertionPoints(socket, data) {
    try {
      logSocketEvent(socket.id, 'getInsertionPoints', data);

      const clientInfo = this.connectedClients.get(socket.id);
      if (!clientInfo || !clientInfo.sessionId) {
        socket.emit('error', { message: 'Not connected to a session' });
        return;
      }

      const { sessionId } = clientInfo;
      
      // Get insertion points
      const result = await this.gameService.getInsertionPoints(sessionId);
      
      if (!result.success) {
        socket.emit('error', { message: result.reason });
        return;
      }

      socket.emit('insertionPoints', result.insertionPoints);

    } catch (error) {
      logger.error('Error handling getInsertionPoints:', error);
      socket.emit('error', { message: 'Internal server error' });
    }
  }

  /**
   * Handle requesting game state
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Request data {sessionId}
   */
  async handleGetGameState(socket, data) {
    try {
      logSocketEvent(socket.id, 'getGameState', data);

      const clientInfo = this.connectedClients.get(socket.id);
      if (!clientInfo || !clientInfo.sessionId) {
        socket.emit('error', { message: 'Not connected to a session' });
        return;
      }

      const { sessionId } = clientInfo;
      
      // Get game state
      const result = await this.gameService.getGameState(sessionId, clientInfo.playerId);
      
      if (!result.success) {
        socket.emit('error', { message: result.reason });
        return;
      }

      socket.emit('gameState', result.gameState);

    } catch (error) {
      logger.error('Error handling getGameState:', error);
      socket.emit('error', { message: 'Internal server error' });
    }
  }

  /**
   * Handle player disconnection
   * @param {Object} socket - Socket.IO socket
   */
  async handleDisconnect(socket) {
    try {
      logSocketEvent(socket.id, 'disconnect');

      const clientInfo = this.connectedClients.get(socket.id);
      if (clientInfo && clientInfo.sessionId && clientInfo.playerId) {
        const { sessionId, playerId } = clientInfo;
        
        // Remove player from session using the correct playerId
        const result = await this.gameService.removePlayer(sessionId, playerId);
        
        if (result.success) {
          // Notify other players
          socket.to(sessionId).emit('playerLeft', {
            playerId: playerId,
            timestamp: Date.now()
          });

          // Broadcast updated game state if session still exists
          const session = await this.gameService.getSession(sessionId);
          if (session && session.getPlayerCount() > 0) {
            await this.broadcastGameState(sessionId);
          }
        }
      }

      // Clean up connection info
      this.connectedClients.delete(socket.id);

      logger.info(`Player ${socket.id} disconnected`);

    } catch (error) {
      logger.error('Error handling disconnect:', error);
    }
  }

  /**
   * Handle game end
   * @param {string} sessionId - Session ID
   * @param {Object} result - Game end result
   */
  async handleGameEnd(sessionId, result) {
    try {
      // Get session to find winner
      const session = await this.gameService.getSession(sessionId);
      if (!session) return;

      const players = Array.from(session.players.values());
      const winner = players.find(p => p.id !== result.loser);

      // Broadcast game end event
      this.io.to(sessionId).emit('gameEnded', {
        winner: winner ? winner.id : null,
        winnerName: winner ? winner.name : null,
        loser: result.loser,
        loserName: players.find(p => p.id === result.loser)?.name,
        reason: result.reason,
        timestamp: Date.now()
      });

      // Broadcast final game state
      await this.broadcastGameState(sessionId);

      logger.info(`Game ended in session ${sessionId}, loser: ${result.loser}`);

    } catch (error) {
      logger.error('Error handling game end:', error);
    }
  }

  /**
   * Handle revealing cards at round end
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Request data {sessionId}
   */
  async handleRevealCards(socket, data) {
    try {
      logSocketEvent(socket.id, 'revealCards', data);

      const clientInfo = this.connectedClients.get(socket.id);
      if (!clientInfo || !clientInfo.sessionId) {
        socket.emit('error', { message: 'Not connected to a session' });
        return;
      }

      const { sessionId } = clientInfo;
      
      // Reveal cards
      const result = await this.gameService.revealAllCards(sessionId);
      
      if (!result.success) {
        socket.emit('error', { message: result.reason });
        return;
      }

      // Broadcast revealed cards to all players
      this.io.to(sessionId).emit('cardsRevealed', {
        revealedCards: result.revealedCards,
        timestamp: Date.now()
      });

      // Broadcast updated game state
      await this.broadcastGameState(sessionId);

      logger.info(`Cards revealed in session ${sessionId}`);

    } catch (error) {
      logger.error('Error handling revealCards:', error);
      socket.emit('error', { message: 'Internal server error' });
    }
  }

  /**
   * Handle starting new round
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Request data {sessionId}
   */
  async handleStartNewRound(socket, data) {
    try {
      logSocketEvent(socket.id, 'startNewRound', data);

      const clientInfo = this.connectedClients.get(socket.id);
      if (!clientInfo || !clientInfo.sessionId) {
        socket.emit('error', { message: 'Not connected to a session' });
        return;
      }

      const { sessionId } = clientInfo;
      
      // Start new round
      const result = await this.gameService.startNewRound(sessionId);
      
      if (!result.success) {
        socket.emit('error', { message: result.reason });
        return;
      }

      // Broadcast new round started to all players
      this.io.to(sessionId).emit('newRoundStarted', {
        startedBy: clientInfo.playerId,
        timestamp: Date.now()
      });

      // Broadcast updated game state with new cards
      await this.broadcastGameState(sessionId);

      logger.info(`New round started in session ${sessionId} by ${clientInfo.playerId}`);

    } catch (error) {
      logger.error('Error handling startNewRound:', error);
      socket.emit('error', { message: 'Internal server error' });
    }
  }

  /**
   * Handle invalid move acknowledgment
   * @param {Object} socket - Socket.IO socket
   * @param {Object} data - Acknowledgment data {sessionId, understood}
   */
  async handleAcknowledgeInvalidMove(socket, data) {
    try {
      logSocketEvent(socket.id, 'acknowledgeInvalidMove', data);

      const clientInfo = this.connectedClients.get(socket.id);
      if (!clientInfo || !clientInfo.sessionId) {
        socket.emit('error', { message: 'Not connected to a session' });
        return;
      }

      const { sessionId } = clientInfo;
      const { understood } = data;

      if (understood) {
        // Player acknowledged the invalid move
        socket.to(sessionId).emit('playerAcknowledged', {
          playerId: clientInfo.playerId,
          timestamp: Date.now()
        });

        logger.info(`Player ${clientInfo.playerId} acknowledged invalid move in session ${sessionId}`);
      }

    } catch (error) {
      logger.error('Error handling acknowledgeInvalidMove:', error);
      socket.emit('error', { message: 'Internal server error' });
    }
  }

  /**
   * Broadcast game state to all players in a session
   * @param {string} sessionId - Session ID
   */
  async broadcastGameState(sessionId) {
    try {
      console.log('📡 Broadcasting game state for session:', sessionId);
      const session = await this.gameService.getSession(sessionId);
      if (!session) {
        console.error('❌ Session not found for broadcast:', sessionId);
        return;
      }

      console.log('📊 Session found for broadcast:', {
        sessionId,
        status: session.status,
        playerCount: session.getPlayerCount(),
        connectedClients: this.connectedClients.size
      });

      let broadcastCount = 0;
      // Send personalized game state to each connected player in the session
      for (const [socketId, clientInfo] of this.connectedClients.entries()) {
        if (clientInfo.sessionId === sessionId && clientInfo.playerId) {
          console.log('📤 Sending game state to player:', { 
            socketId, 
            playerId: clientInfo.playerId 
          });
          
          const gameStateResult = await this.gameService.getGameState(sessionId, clientInfo.playerId);
          if (gameStateResult.success) {
            console.log('📊 Game state for player:', clientInfo.playerId, ':', {
              status: gameStateResult.gameState.status,
              playerCount: gameStateResult.gameState.players?.length,
              currentPlayer: gameStateResult.gameState.currentPlayer,
              myTurn: gameStateResult.gameState.myTurn
            });
            this.io.to(socketId).emit('gameState', gameStateResult.gameState);
            broadcastCount++;
          } else {
            console.error('❌ Failed to get game state for player:', clientInfo.playerId, gameStateResult.reason);
          }
        }
      }
      
      console.log('✅ Game state broadcast completed. Sent to', broadcastCount, 'players');

    } catch (error) {
      console.error('💥 Error broadcasting game state:', error);
      logger.error('Error broadcasting game state:', error);
    }
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection statistics
   */
  getConnectionStats() {
    const now = Date.now();
    const connections = Array.from(this.connectedClients.values());
    
    return {
      totalConnections: connections.length,
      playersInSessions: connections.filter(c => c.sessionId).length,
      averageConnectionTime: connections.length > 0 
        ? connections.reduce((sum, c) => sum + (now - c.connectedAt), 0) / connections.length 
        : 0,
      activeSessions: new Set(connections.map(c => c.sessionId).filter(Boolean)).size
    };
  }

  /**
   * Send message to all clients in a session
   * @param {string} sessionId - Session ID
   * @param {string} event - Event name
   * @param {Object} data - Data to send
   */
  broadcastToSession(sessionId, event, data) {
    this.io.to(sessionId).emit(event, data);
  }

  /**
   * Send message to specific player
   * @param {string} playerId - Player ID
   * @param {string} event - Event name
   * @param {Object} data - Data to send
   */
  sendToPlayer(playerId, event, data) {
    this.io.to(playerId).emit(event, data);
  }
}

export default SocketHandler;
