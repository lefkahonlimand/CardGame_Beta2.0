/**
 * Critical Unit Tests for Game Flow
 * Tests the specific issues: card initialization, player count, and game state
 */

import { jest } from '@jest/globals';
import { GameService, GameSession } from '../../src/server/services/GameService.js';
import { CardService } from '../../src/server/services/CardService.js';
import { config } from '../../src/server/config/index.js';

// Mock card data that matches our JSON structure
const mockCards = [
  { id: 'eiffel', name: 'Eiffelturm', height: 330, width: 125 },
  { id: 'burj', name: 'Burj Khalifa', height: 828, width: 39 },
  { id: 'empire', name: 'Empire State Building', height: 381, width: 129 },
  { id: 'liberty', name: 'Freiheitsstatue', height: 93, width: 17 },
  { id: 'colosseum', name: 'Kolosseum', height: 48, width: 188 }
];

// Mock CardService with real card functionality
const mockCardService = {
  createShuffledDeck: jest.fn(() => [...mockCards]),
  dealCards: jest.fn((deck, playerIds, cardsPerPlayer) => {
    const hands = {};
    playerIds.forEach((id, index) => {
      hands[id] = deck.slice(index * cardsPerPlayer, (index + 1) * cardsPerPlayer);
    });
    return hands;
  }),
  drawCard: jest.fn((deck) => deck.pop()),
  getAllCards: jest.fn(() => mockCards),
  initialize: jest.fn()
};

describe('Critical Game Flow Tests', () => {
  let gameService;
  let session;
  
  beforeEach(() => {
    gameService = new GameService(mockCardService);
    jest.clearAllMocks();
  });

  describe('Card Initialization Issue', () => {
    test('should properly initialize cards when game starts', async () => {
      // Create session and add players
      session = await gameService.createSession();
      await gameService.addPlayer(session.id, 'player1', 'Player 1');
      await gameService.addPlayer(session.id, 'player2', 'Player 2');
      
      // Start game
      const result = await gameService.startGame(session.id, 'player1');
      
      expect(result.success).toBe(true);
      expect(mockCardService.createShuffledDeck).toHaveBeenCalled();
      expect(mockCardService.dealCards).toHaveBeenCalledWith(
        mockCards,
        ['player1', 'player2'],
        config.game.cardsPerPlayer
      );
      
      // Check that players have cards
      expect(session.playerHands.size).toBe(2);
      expect(session.playerHands.get('player1')).toBeDefined();
      expect(session.playerHands.get('player2')).toBeDefined();
      expect(session.playerHands.get('player1').length).toBe(config.game.cardsPerPlayer);
    });

    test('should return cards in getGameStateForPlayer', async () => {
      // Create and start game
      session = await gameService.createSession();
      await gameService.addPlayer(session.id, 'player1', 'Player 1');
      await gameService.addPlayer(session.id, 'player2', 'Player 2');
      await gameService.startGame(session.id, 'player1');
      
      // Get game state for player
      const gameStateResult = await gameService.getGameState(session.id, 'player1');
      
      expect(gameStateResult.success).toBe(true);
      expect(gameStateResult.gameState.playerHand).toBeDefined();
      expect(gameStateResult.gameState.playerHand.length).toBeGreaterThan(0);
      expect(gameStateResult.gameState.players).toHaveLength(2);
      expect(gameStateResult.gameState.status).toBe('playing');
    });
  });

  describe('Player Count Display Issue', () => {
    test('should correctly track player count in session', async () => {
      // Create session
      session = await gameService.createSession();
      expect(session.getPlayerCount()).toBe(0);
      
      // Add first player
      await gameService.addPlayer(session.id, 'player1', 'Player 1');
      expect(session.getPlayerCount()).toBe(1);
      
      // Add second player  
      await gameService.addPlayer(session.id, 'player2', 'Player 2');
      expect(session.getPlayerCount()).toBe(2);
      
      // Check that getActiveSessions returns correct count
      const activeSessions = gameService.getActiveSessions();
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].playerCount).toBe(2);
    });

    test('should include players array in game state', async () => {
      session = await gameService.createSession();
      await gameService.addPlayer(session.id, 'player1', 'Player 1');
      await gameService.addPlayer(session.id, 'player2', 'Player 2');
      
      const gameStateResult = await gameService.getGameState(session.id, 'player1');
      
      expect(gameStateResult.success).toBe(true);
      expect(gameStateResult.gameState.players).toHaveLength(2);
      expect(gameStateResult.gameState.players[0]).toMatchObject({
        id: 'player1',
        name: 'Player 1'
      });
      expect(gameStateResult.gameState.players[1]).toMatchObject({
        id: 'player2',
        name: 'Player 2'
      });
    });
  });

  describe('Game Status Issue', () => {
    test('should change status from waiting to playing when game starts', async () => {
      session = await gameService.createSession();
      expect(session.status).toBe('waiting');
      
      // Add players
      await gameService.addPlayer(session.id, 'player1', 'Player 1');
      await gameService.addPlayer(session.id, 'player2', 'Player 2');
      expect(session.status).toBe('waiting');
      
      // Start game
      const result = await gameService.startGame(session.id, 'player1');
      expect(result.success).toBe(true);
      expect(session.status).toBe('playing');
    });

    test('should require minimum 2 players to start', async () => {
      session = await gameService.createSession();
      await gameService.addPlayer(session.id, 'player1', 'Player 1');
      
      // Try to start with only 1 player
      const result = await gameService.startGame(session.id, 'player1');
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Not enough players');
      expect(session.status).toBe('waiting');
    });

    test('should reflect correct status in getActiveSessions', async () => {
      session = await gameService.createSession();
      await gameService.addPlayer(session.id, 'player1', 'Player 1');
      await gameService.addPlayer(session.id, 'player2', 'Player 2');
      
      // Before starting
      let activeSessions = gameService.getActiveSessions();
      expect(activeSessions[0].status).toBe('waiting');
      
      // After starting
      await gameService.startGame(session.id, 'player1');
      activeSessions = gameService.getActiveSessions();
      expect(activeSessions[0].status).toBe('playing');
    });
  });

  describe('Session Metadata Integration', () => {
    test('should properly handle session metadata for dashboard', async () => {
      session = await gameService.createSession();
      
      // Set metadata
      session.metadata = {
        name: 'Test Game',
        maxPlayers: 4,
        createdBy: 'Player 1',
        gameType: 'Card Estimation',
        estimatedDuration: '15-30 min'
      };
      
      await gameService.addPlayer(session.id, 'player1', 'Player 1');
      await gameService.addPlayer(session.id, 'player2', 'Player 2');
      
      const activeSessions = gameService.getActiveSessions();
      expect(activeSessions[0]).toMatchObject({
        name: 'Test Game',
        maxPlayers: 4,
        createdBy: 'Player 1',
        gameType: 'Card Estimation',
        estimatedDuration: '15-30 min',
        playerCount: 2,
        status: 'waiting'
      });
    });

    test('should respect maxPlayers from metadata', async () => {
      session = await gameService.createSession();
      session.metadata.maxPlayers = 2;
      
      // Add 2 players
      await gameService.addPlayer(session.id, 'player1', 'Player 1');
      await gameService.addPlayer(session.id, 'player2', 'Player 2');
      
      // Try to add third player
      const result = await gameService.addPlayer(session.id, 'player3', 'Player 3');
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Session is full');
    });
  });

  describe('Real Card Dealing Flow', () => {
    test('should deal actual cards with correct properties', async () => {
      session = await gameService.createSession();
      await gameService.addPlayer(session.id, 'player1', 'Player 1');
      await gameService.addPlayer(session.id, 'player2', 'Player 2');
      
      // Mock the actual card dealing behavior
      mockCardService.dealCards.mockReturnValue({
        'player1': [
          { id: 'eiffel', name: 'Eiffelturm', height: 330, width: 125 },
          { id: 'burj', name: 'Burj Khalifa', height: 828, width: 39 }
        ],
        'player2': [
          { id: 'empire', name: 'Empire State Building', height: 381, width: 129 },
          { id: 'liberty', name: 'Freiheitsstatue', height: 93, width: 17 }
        ]
      });
      
      await gameService.startGame(session.id, 'player1');
      
      const gameState1 = await gameService.getGameState(session.id, 'player1');
      const gameState2 = await gameService.getGameState(session.id, 'player2');
      
      expect(gameState1.gameState.playerHand).toHaveLength(2);
      expect(gameState2.gameState.playerHand).toHaveLength(2);
      
      // Check card properties
      expect(gameState1.gameState.playerHand[0]).toMatchObject({
        id: 'eiffel',
        name: 'Eiffelturm',
        height: 330,
        width: 125
      });
    });
  });
});

export default null;
