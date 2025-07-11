/**
 * Unit Tests for GameService Dashboard Integration
 * Tests the dashboard-specific functionality and session management
 */

import { jest } from '@jest/globals';
import { GameService, GameSession } from '../../src/server/services/GameService.js';
import { CardService } from '../../src/server/services/CardService.js';

// Mock dependencies
const mockCardService = {
  createShuffledDeck: jest.fn(() => [
    { id: 'card1', name: 'Test Card 1', height: 100, width: null },
    { id: 'card2', name: 'Test Card 2', height: null, width: 200 },
    { id: 'card3', name: 'Test Card 3', height: 150, width: 150 }
  ]),
  dealCards: jest.fn((deck, playerIds, cardsPerPlayer) => {
    const hands = {};
    playerIds.forEach(id => {
      hands[id] = deck.slice(0, cardsPerPlayer);
    });
    return hands;
  }),
  drawCard: jest.fn((deck) => deck.pop()),
  getAllCards: jest.fn(() => []),
  initialize: jest.fn()
};

const mockRedisService = {
  saveSession: jest.fn(),
  getSession: jest.fn(),
  deleteSession: jest.fn()
};

describe('GameService Dashboard Integration', () => {
  let gameService;
  
  beforeEach(() => {
    gameService = new GameService(mockCardService, mockRedisService);
    jest.clearAllMocks();
  });

  describe('Session Creation for Dashboard', () => {
    test('should create session with metadata support', async () => {
      const session = await gameService.createSession();
      
      expect(session).toBeInstanceOf(GameSession);
      expect(session.metadata).toBeDefined();
      expect(session.metadata.name).toBeNull();
      expect(session.metadata.maxPlayers).toBe(8);
      expect(session.metadata.gameType).toBe('Card Estimation');
    });

    test('should create session with custom ID', async () => {
      const customId = 'custom-session-123';
      const session = await gameService.createSession(customId);
      
      expect(session.id).toBe(customId);
      expect(gameService.sessions.has(customId)).toBe(true);
    });

    test('should save session to Redis', async () => {
      await gameService.createSession();
      
      expect(mockRedisService.saveSession).toHaveBeenCalled();
    });
  });

  describe('Dashboard Session Management', () => {
    test('should add player and update metadata', async () => {
      const session = await gameService.createSession();
      const result = await gameService.addPlayer(session.id, 'player1', 'Test Player');
      
      expect(result.success).toBe(true);
      expect(session.players.has('player1')).toBe(true);
      expect(session.getPlayerCount()).toBe(1);
    });

    test('should prevent adding too many players', async () => {
      const session = await gameService.createSession();
      session.metadata.maxPlayers = 2;
      
      // Add first player
      await gameService.addPlayer(session.id, 'player1', 'Player 1');
      // Add second player
      await gameService.addPlayer(session.id, 'player2', 'Player 2');
      // Try to add third player (should fail)
      const result = await gameService.addPlayer(session.id, 'player3', 'Player 3');
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Session is full');
    });

    test('should prevent adding player to playing game', async () => {
      const session = await gameService.createSession();
      session.status = 'playing';
      
      const result = await gameService.addPlayer(session.id, 'player1', 'Test Player');
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Game already in progress');
    });
  });

  describe('getActiveSessions with Dashboard metadata', () => {
    test('should return enriched session data', async () => {
      const session1 = await gameService.createSession('session1');
      session1.metadata.name = 'Test Game 1';
      session1.metadata.createdBy = 'Player 1';
      await gameService.addPlayer('session1', 'player1', 'Player 1');
      
      const session2 = await gameService.createSession('session2');
      session2.metadata.name = 'Test Game 2';
      await gameService.addPlayer('session2', 'player2', 'Player 2');
      await gameService.addPlayer('session2', 'player3', 'Player 3');
      
      const sessions = gameService.getActiveSessions();
      
      expect(sessions).toHaveLength(2);
      expect(sessions[0]).toMatchObject({
        id: 'session1',
        name: 'Test Game 1',
        playerCount: 1,
        maxPlayers: 8,
        status: 'waiting',
        createdBy: 'Player 1',
        gameType: 'Card Estimation',
        estimatedDuration: '15-30 min'
      });
      
      expect(sessions[1]).toMatchObject({
        id: 'session2',
        name: 'Test Game 2',
        playerCount: 2,
        maxPlayers: 8,
        status: 'waiting'
      });
    });

    test('should return empty array when no sessions exist', () => {
      const sessions = gameService.getActiveSessions();
      expect(sessions).toEqual([]);
    });
  });

  describe('Game Start with Dashboard Integration', () => {
    test('should start game with proper card dealing', async () => {
      const session = await gameService.createSession();
      await gameService.addPlayer(session.id, 'player1', 'Player 1');
      await gameService.addPlayer(session.id, 'player2', 'Player 2');
      
      const result = await gameService.startGame(session.id, 'player1');
      
      expect(result.success).toBe(true);
      expect(session.status).toBe('playing');
      expect(mockCardService.createShuffledDeck).toHaveBeenCalled();
      expect(mockCardService.dealCards).toHaveBeenCalledWith(
        expect.any(Array),
        ['player1', 'player2'],
        5
      );
      expect(session.playerHands.size).toBe(2);
    });

    test('should fail to start game with insufficient players', async () => {
      const session = await gameService.createSession();
      await gameService.addPlayer(session.id, 'player1', 'Player 1');
      
      const result = await gameService.startGame(session.id, 'player1');
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Not enough players');
      expect(session.status).toBe('waiting');
    });

    test('should fail to start already playing game', async () => {
      const session = await gameService.createSession();
      await gameService.addPlayer(session.id, 'player1', 'Player 1');
      await gameService.addPlayer(session.id, 'player2', 'Player 2');
      
      // Start game first time
      await gameService.startGame(session.id, 'player1');
      
      // Try to start again
      const result = await gameService.startGame(session.id, 'player2');
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Game already in progress');
    });
  });

  describe('Game State for Dashboard', () => {
    test('should return correct game state for player', async () => {
      const session = await gameService.createSession();
      await gameService.addPlayer(session.id, 'player1', 'Player 1');
      await gameService.addPlayer(session.id, 'player2', 'Player 2');
      await gameService.startGame(session.id, 'player1');
      
      const result = await gameService.getGameState(session.id, 'player1');
      
      expect(result.success).toBe(true);
      expect(result.gameState).toMatchObject({
        sessionId: session.id,
        status: 'playing',
        players: expect.any(Array),
        currentPlayer: 'player1',
        myTurn: true,
        board: expect.any(Object),
        playerHand: expect.any(Array),
        deckCount: expect.any(Number),
        insertionPoints: expect.any(Object)
      });
    });

    test('should return error for non-existent session', async () => {
      const result = await gameService.getGameState('non-existent', 'player1');
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Session not found');
    });
  });

  describe('Session Metadata Management', () => {
    test('should update session metadata correctly', async () => {
      const session = await gameService.createSession();
      
      session.metadata = {
        name: 'Epic Card Battle',
        maxPlayers: 6,
        createdBy: 'GameMaster',
        gameType: 'Card Estimation',
        estimatedDuration: '20-40 min'
      };
      
      await gameService.saveSession(session);
      
      const sessions = gameService.getActiveSessions();
      expect(sessions[0]).toMatchObject({
        name: 'Epic Card Battle',
        maxPlayers: 6,
        createdBy: 'GameMaster',
        estimatedDuration: '20-40 min'
      });
    });

    test('should handle missing metadata gracefully', async () => {
      const session = await gameService.createSession();
      session.metadata = null;
      
      const sessions = gameService.getActiveSessions();
      expect(sessions[0]).toMatchObject({
        name: expect.stringMatching(/Session [a-f0-9-]{8}/),
        maxPlayers: 8,
        gameType: 'Card Estimation',
        estimatedDuration: '15-30 min'
      });
    });
  });

  describe('Player Removal and Session Cleanup', () => {
    test('should remove player and update counts', async () => {
      const session = await gameService.createSession();
      await gameService.addPlayer(session.id, 'player1', 'Player 1');
      await gameService.addPlayer(session.id, 'player2', 'Player 2');
      
      const result = await gameService.removePlayer(session.id, 'player1');
      
      expect(result.success).toBe(true);
      expect(session.getPlayerCount()).toBe(1);
      expect(session.players.has('player1')).toBe(false);
    });

    test('should end game when too few players remain', async () => {
      const session = await gameService.createSession();
      await gameService.addPlayer(session.id, 'player1', 'Player 1');
      await gameService.addPlayer(session.id, 'player2', 'Player 2');
      await gameService.startGame(session.id, 'player1');
      
      // Remove one player, leaving only one
      await gameService.removePlayer(session.id, 'player2');
      
      expect(session.status).toBe('ended');
    });
  });
});

export default null;
