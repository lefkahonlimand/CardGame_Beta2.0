/**
 * Unit Tests for SocketHandler Dashboard Integration
 * Tests the socket-based real-time communication for game sessions
 */

import { jest } from '@jest/globals';
import { SocketHandler } from '../../src/server/controllers/SocketHandler.js';

// Mock socket.io
const mockSocket = {
  id: 'socket123',
  emit: jest.fn(),
  to: jest.fn(() => ({ emit: jest.fn() })),
  join: jest.fn(),
  leave: jest.fn()
};

const mockIo = {
  on: jest.fn(),
  to: jest.fn(() => ({ emit: jest.fn() }))
};

// Mock GameService
const mockGameService = {
  getSession: jest.fn(),
  createSession: jest.fn(),
  addPlayer: jest.fn(),
  startGame: jest.fn(),
  getGameState: jest.fn(),
  executeMove: jest.fn(),
  removePlayer: jest.fn(),
  getInsertionPoints: jest.fn()
};

describe('SocketHandler Dashboard Integration', () => {
  let socketHandler;
  
  beforeEach(() => {
    socketHandler = new SocketHandler(mockIo, mockGameService);
    jest.clearAllMocks();
  });

  describe('Room Management', () => {
    test('should handle joinRoom event for dashboard navigation', async () => {
      const sessionData = {
        id: 'session123',
        players: new Map([['player1', { id: 'player1', name: 'Test Player' }]]),
        getPlayerCount: () => 1,
        status: 'waiting'
      };
      
      mockGameService.getSession.mockResolvedValue(sessionData);
      mockGameService.getGameState.mockResolvedValue({
        success: true,
        gameState: {
          sessionId: 'session123',
          status: 'waiting',
          players: [{ id: 'player1', name: 'Test Player' }],
          playerHand: []
        }
      });

      await socketHandler.handleJoinRoom(mockSocket, {
        sessionId: 'session123',
        playerId: 'player1'
      });

      expect(mockSocket.join).toHaveBeenCalledWith('session123');
      expect(mockSocket.emit).toHaveBeenCalledWith('gameState', expect.any(Object));
      expect(mockSocket.to).toHaveBeenCalledWith('session123');
    });

    test('should handle leaveRoom event properly', async () => {
      // Set up initial connection state
      socketHandler.connectedClients.set(mockSocket.id, {
        playerId: 'player1',
        sessionId: 'session123',
        connectedAt: Date.now()
      });

      mockGameService.removePlayer.mockResolvedValue({ success: true });
      mockGameService.getSession.mockResolvedValue({
        getPlayerCount: () => 1
      });

      await socketHandler.handleDisconnect(mockSocket);

      expect(mockGameService.removePlayer).toHaveBeenCalledWith('session123', mockSocket.id);
      expect(socketHandler.connectedClients.has(mockSocket.id)).toBe(false);
    });
  });

  describe('Game Start from Dashboard', () => {
    test('should start game when triggered from dashboard', async () => {
      // Set up connected client
      socketHandler.connectedClients.set(mockSocket.id, {
        playerId: mockSocket.id,
        sessionId: 'session123',
        connectedAt: Date.now()
      });

      const sessionData = {
        id: 'session123',
        players: new Map([
          ['player1', { id: 'player1', name: 'Player 1' }],
          ['player2', { id: 'player2', name: 'Player 2' }]
        ]),
        status: 'playing',
        playerHands: new Map([
          ['player1', [{ id: 'card1', name: 'Test Card 1' }]],
          ['player2', [{ id: 'card2', name: 'Test Card 2' }]]
        ])
      };

      mockGameService.startGame.mockResolvedValue({ success: true });
      mockGameService.getSession.mockResolvedValue(sessionData);
      mockGameService.getGameState.mockResolvedValue({
        success: true,
        gameState: {
          sessionId: 'session123',
          status: 'playing',
          players: Array.from(sessionData.players.values()),
          playerHand: [{ id: 'card1', name: 'Test Card 1' }]
        }
      });

      await socketHandler.handleStartGame(mockSocket, {});

      expect(mockGameService.startGame).toHaveBeenCalledWith('session123', mockSocket.id);
      expect(mockIo.to).toHaveBeenCalledWith('session123');
    });

    test('should fail to start game with insufficient players', async () => {
      socketHandler.connectedClients.set(mockSocket.id, {
        playerId: mockSocket.id,
        sessionId: 'session123',
        connectedAt: Date.now()
      });

      mockGameService.startGame.mockResolvedValue({
        success: false,
        reason: 'Not enough players'
      });

      await socketHandler.handleStartGame(mockSocket, {});

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Not enough players'
      });
    });
  });

  describe('Real-time Game State Broadcasting', () => {
    test('should broadcast game state to all players in session', async () => {
      const session = {
        players: new Map([
          ['player1', { id: 'player1', name: 'Player 1' }],
          ['player2', { id: 'player2', name: 'Player 2' }]
        ])
      };

      mockGameService.getSession.mockResolvedValue(session);
      mockGameService.getGameState
        .mockResolvedValueOnce({
          success: true,
          gameState: { sessionId: 'session123', playerId: 'player1', playerHand: ['card1'] }
        })
        .mockResolvedValueOnce({
          success: true,
          gameState: { sessionId: 'session123', playerId: 'player2', playerHand: ['card2'] }
        });

      await socketHandler.broadcastGameState('session123');

      expect(mockGameService.getGameState).toHaveBeenCalledTimes(2);
      expect(mockGameService.getGameState).toHaveBeenCalledWith('session123', 'player1');
      expect(mockGameService.getGameState).toHaveBeenCalledWith('session123', 'player2');
    });

    test('should handle broadcasting to non-existent session gracefully', async () => {
      mockGameService.getSession.mockResolvedValue(null);

      await socketHandler.broadcastGameState('non-existent');

      expect(mockGameService.getGameState).not.toHaveBeenCalled();
    });
  });

  describe('Player Move Handling', () => {
    test('should handle valid player move', async () => {
      socketHandler.connectedClients.set(mockSocket.id, {
        playerId: mockSocket.id,
        sessionId: 'session123',
        connectedAt: Date.now()
      });

      mockGameService.executeMove.mockResolvedValue({
        success: true,
        boardCard: { id: 'card1', position: { x: 0, y: 0 } }
      });

      await socketHandler.handlePlayerMove(mockSocket, {
        cardId: 'card1',
        insertionPoint: { x: 0, y: 0, type: 'horizontal' }
      });

      expect(mockGameService.executeMove).toHaveBeenCalledWith(
        'session123',
        mockSocket.id,
        'card1',
        { x: 0, y: 0, type: 'horizontal' }
      );

      expect(mockSocket.emit).toHaveBeenCalledWith('moveConfirmed', {
        cardId: 'card1',
        insertionPoint: { x: 0, y: 0, type: 'horizontal' },
        boardCard: { id: 'card1', position: { x: 0, y: 0 } }
      });
    });

    test('should handle invalid move that ends game', async () => {
      socketHandler.connectedClients.set(mockSocket.id, {
        playerId: mockSocket.id,
        sessionId: 'session123',
        connectedAt: Date.now()
      });

      mockGameService.executeMove.mockResolvedValue({
        success: false,
        reason: 'Invalid insertion',
        gameEnded: true,
        loser: mockSocket.id
      });

      mockGameService.getSession.mockResolvedValue({
        players: new Map([
          [mockSocket.id, { id: mockSocket.id, name: 'Current Player' }],
          ['player2', { id: 'player2', name: 'Other Player' }]
        ])
      });

      await socketHandler.handlePlayerMove(mockSocket, {
        cardId: 'card1',
        insertionPoint: { x: 0, y: 0, type: 'horizontal' }
      });

      expect(mockIo.to).toHaveBeenCalledWith('session123');
    });

    test('should reject move from player not in session', async () => {
      // No client info set up

      await socketHandler.handlePlayerMove(mockSocket, {
        cardId: 'card1',
        insertionPoint: { x: 0, y: 0, type: 'horizontal' }
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Not connected to a session'
      });
    });
  });

  describe('Insertion Points', () => {
    test('should return insertion points for connected player', async () => {
      socketHandler.connectedClients.set(mockSocket.id, {
        playerId: mockSocket.id,
        sessionId: 'session123',
        connectedAt: Date.now()
      });

      const mockInsertionPoints = {
        horizontal: [{ x: 1, y: 0 }],
        vertical: [{ x: 0, y: 1 }],
        origin: [{ x: 0, y: 0 }]
      };

      mockGameService.getInsertionPoints.mockResolvedValue({
        success: true,
        insertionPoints: mockInsertionPoints
      });

      await socketHandler.handleGetInsertionPoints(mockSocket, {});

      expect(mockGameService.getInsertionPoints).toHaveBeenCalledWith('session123');
      expect(mockSocket.emit).toHaveBeenCalledWith('insertionPoints', mockInsertionPoints);
    });

    test('should handle insertion points request from disconnected player', async () => {
      // No client info set up

      await socketHandler.handleGetInsertionPoints(mockSocket, {});

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Not connected to a session'
      });
    });
  });

  describe('Connection Statistics', () => {
    test('should track connection statistics correctly', () => {
      const now = Date.now();
      socketHandler.connectedClients.set('socket1', {
        playerId: 'player1',
        sessionId: 'session1',
        connectedAt: now - 5000
      });
      socketHandler.connectedClients.set('socket2', {
        playerId: 'player2',
        sessionId: 'session2',
        connectedAt: now - 3000
      });
      socketHandler.connectedClients.set('socket3', {
        playerId: 'player3',
        sessionId: null,
        connectedAt: now - 1000
      });

      const stats = socketHandler.getConnectionStats();

      expect(stats).toMatchObject({
        totalConnections: 3,
        playersInSessions: 2,
        activeSessions: 2
      });
      expect(stats.averageConnectionTime).toBeGreaterThan(0);
    });

    test('should handle empty connections gracefully', () => {
      const stats = socketHandler.getConnectionStats();

      expect(stats).toMatchObject({
        totalConnections: 0,
        playersInSessions: 0,
        activeSessions: 0,
        averageConnectionTime: 0
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle missing session data gracefully', async () => {
      await socketHandler.handleJoinSession(mockSocket, {
        sessionId: '',
        playerName: 'Test Player'
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Session ID and player name are required'
      });
    });

    test('should handle game service errors gracefully', async () => {
      mockGameService.getSession.mockRejectedValue(new Error('Database error'));

      await socketHandler.handleJoinSession(mockSocket, {
        sessionId: 'session123',
        playerName: 'Test Player'
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Internal server error'
      });
    });
  });
});

export default null;
