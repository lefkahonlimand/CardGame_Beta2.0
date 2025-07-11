import { v4 as uuidv4 } from 'uuid';
import { GameBoard } from '../models/GameBoard.js';
import { SmartInsertionService } from './SmartInsertionService.js';
import { logger, logGameEvent } from '../utils/logger.js';
import { config } from '../config/index.js';

/**
 * Game Service - Main game logic and session management
 */
export class GameService {
  constructor(cardService, redisService, socketHandler = null) {
    this.cardService = cardService;
    this.redisService = redisService;
    this.socketHandler = socketHandler;
    this.sessions = new Map(); // In-memory sessions (backup to Redis)
  }

  /**
   * Create a new game session
   * @param {string} sessionId - Session ID
   * @returns {GameSession} Created game session
   */
  async createSession(sessionId = null) {
    const id = sessionId || uuidv4();
    
    const session = new GameSession(id, this.cardService);
    this.sessions.set(id, session);
    
    // Store in Redis if available
    if (this.redisService) {
      await this.redisService.saveSession(id, session.toJSON());
    }
    
    logGameEvent('sessionCreated', { sessionId: id });
    return session;
  }

  /**
   * Get game session by ID
   * @param {string} sessionId - Session ID
   * @returns {GameSession|null} Game session or null if not found
   */
  async getSession(sessionId) {
    // Try memory first
    let session = this.sessions.get(sessionId);
    
    if (!session && this.redisService) {
      // Try Redis
      const sessionData = await this.redisService.getSession(sessionId);
      if (sessionData) {
        session = GameSession.fromJSON(sessionData, this.cardService);
        this.sessions.set(sessionId, session);
      }
    }
    
    return session;
  }

  /**
   * Delete game session
   * @param {string} sessionId - Session ID
   */
  async deleteSession(sessionId) {
    this.sessions.delete(sessionId);
    
    if (this.redisService) {
      await this.redisService.deleteSession(sessionId);
    }
    
    logGameEvent('sessionDeleted', { sessionId });
  }

  /**
   * Add player to session
   * @param {string} sessionId - Session ID
   * @param {string} playerId - Player ID
   * @param {string} playerName - Player name
   * @returns {Object} Result object
   */
  async addPlayer(sessionId, playerId, playerName) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return { success: false, reason: 'Session not found' };
    }

    const result = session.addPlayer(playerId, playerName);
    
    if (result.success) {
      await this.saveSession(session);
      logGameEvent('playerJoined', { 
        sessionId, 
        playerId, 
        playerName, 
        playerCount: session.getPlayerCount() 
      });
    }
    
    return result;
  }

  /**
   * Remove player from session
   * @param {string} sessionId - Session ID
   * @param {string} playerId - Player ID
   * @returns {Object} Result object
   */
  async removePlayer(sessionId, playerId) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return { success: false, reason: 'Session not found' };
    }

    const result = session.removePlayer(playerId);
    
    if (result.success) {
      await this.saveSession(session);
      logGameEvent('playerLeft', { 
        sessionId, 
        playerId, 
        playerCount: session.getPlayerCount() 
      });
    }
    
    return result;
  }

  /**
   * Start game in session
   * @param {string} sessionId - Session ID
   * @param {string} initiatorId - Player who started the game
   * @returns {Object} Result object
   */
  async startGame(sessionId, initiatorId) {
    console.log('🎯 GameService.startGame called:', { sessionId, initiatorId });
    
    const session = await this.getSession(sessionId);
    if (!session) {
      console.error('❌ Session not found in GameService.startGame:', sessionId);
      return { success: false, reason: 'Session not found' };
    }

    console.log('📋 Session found, current state:', {
      sessionId,
      status: session.status,
      playerCount: session.getPlayerCount(),
      players: Array.from(session.players.keys())
    });

    const result = session.startGame(initiatorId);
    console.log('🎮 Session.startGame result:', result);
    
    if (result.success) {
      console.log('✅ Game started successfully, saving session...');
      await this.saveSession(session);
      logGameEvent('gameStarted', { 
        sessionId, 
        initiatorId, 
        playerCount: session.getPlayerCount() 
      });
      console.log('💾 Session saved after game start');
    } else {
      console.error('❌ Failed to start game in session:', result.reason);
    }
    
    return result;
  }

  /**
   * Execute player move
   * @param {string} sessionId - Session ID
   * @param {string} playerId - Player ID
   * @param {string} cardId - Card ID to play
   * @param {Object} insertionPoint - Insertion point data
   * @returns {Object} Result object
   */
  async executeMove(sessionId, playerId, cardId, insertionPoint) {
    console.log('🎯 GameService.executeMove called:', { sessionId, playerId, cardId, insertionPoint });
    
    const session = await this.getSession(sessionId);
    if (!session) {
      console.log('❌ Session not found in GameService.executeMove:', sessionId);
      return { success: false, reason: 'Session not found' };
    }

    console.log('🎮 Session found, executing move...');
    const result = session.executeMove(playerId, cardId, insertionPoint);
    
    console.log('📋 Session.executeMove result:', { 
      success: result.success, 
      reason: result.reason, 
      gameEnded: result.gameEnded,
      boardCard: result.boardCard ? 'present' : 'absent',
      loser: result.loser
    });
    
    if (result.success) {
      console.log('✅ Move successful - saving session and logging event');
      await this.saveSession(session);
      logGameEvent('moveExecuted', { 
        sessionId, 
        playerId, 
        cardId, 
        insertionPoint,
        gameStatus: session.status,
        reason: 'Move executed successfully'
      });
    } else {
      console.log('❌ Move failed:', result.reason);
      logGameEvent('moveRejected', { 
        sessionId, 
        playerId, 
        cardId, 
        insertionPoint,
        reason: result.reason,
        gameEnded: result.gameEnded
      });
    }
    
    return result;
  }

  /**
   * Get insertion points for current game state
   * @param {string} sessionId - Session ID
   * @returns {Object} Insertion points or error
   */
  async getInsertionPoints(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return { success: false, reason: 'Session not found' };
    }

    return {
      success: true,
      insertionPoints: session.getInsertionPoints()
    };
  }

  /**
   * Get game state for client
   * @param {string} sessionId - Session ID
   * @param {string} playerId - Player ID
   * @returns {Object} Game state or error
   */
  async getGameState(sessionId, playerId) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return { success: false, reason: 'Session not found' };
    }

    return {
      success: true,
      gameState: session.getGameStateForPlayer(playerId)
    };
  }

  /**
   * Deal cards to all players at the start of a round
   * @param {string} sessionId - Session ID
   * @returns {Object} Result
   */
  async dealCards(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return { success: false, reason: 'Session not found' };
    }

    const result = session.dealCards();
    
    if (result.success) {
      await this.saveSession(session);
      logGameEvent('cardsDealt', { 
        sessionId, 
        playerCount: session.getPlayerCount() 
      });
    }
    
    return result;
  }

  /**
   * Reveal all cards when round ends
   * @param {string} sessionId - Session ID
   * @returns {Object} Result with revealed cards
   */
  async revealAllCards(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return { success: false, reason: 'Session not found' };
    }

    const revealedCards = session.revealAllCards();
    
    await this.saveSession(session);
    logGameEvent('cardsRevealed', { 
      sessionId, 
      revealedCards 
    });

    return { success: true, revealedCards };
  }

  /**
   * Start new round
   * @param {string} sessionId - Session ID
   * @returns {Object} Result
   */
  async startNewRound(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return { success: false, reason: 'Session not found' };
    }

    const result = session.startNewRound();
    
    if (result.success) {
      await this.saveSession(session);
      logGameEvent('newRoundStarted', { 
        sessionId, 
        roundNumber: session.roundNumber 
      });
    }
    
    return result;
  }

  /**
   * Handle invalid move (round lost)
   * @param {string} sessionId - Session ID
   * @param {string} playerId - Player who made invalid move
   * @param {string} reason - Reason why move was invalid
   * @returns {Object} Result
   */
  async handleInvalidMove(sessionId, playerId, reason) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return { success: false, reason: 'Session not found' };
    }

    const result = session.endRound(playerId, reason);
    
    if (result.success) {
      await this.saveSession(session);
      logGameEvent('roundEnded', { 
        sessionId, 
        losingPlayer: playerId, 
        reason 
      });
    }
    
    return result;
  }

  /**
   * Save session to persistent storage
   * @param {GameSession} session - Session to save
   */
  async saveSession(session) {
    if (this.redisService) {
      await this.redisService.saveSession(session.id, session.toJSON());
    }
  }

  /**
   * Get all active sessions with enriched metadata
   * @returns {Array} Array of session summaries with metadata
   */
  getActiveSessions() {
    const sessions = [];
    
    for (const [id, session] of this.sessions) {
      sessions.push({
        id,
        name: session.metadata?.name || `Session ${id.slice(-8)}`,
        playerCount: session.getPlayerCount(),
        maxPlayers: session.metadata?.maxPlayers || config.game.maxPlayers,
        status: session.status,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        createdBy: session.metadata?.createdBy,
        gameType: session.metadata?.gameType || 'Card Estimation',
        estimatedDuration: session.metadata?.estimatedDuration || '15-30 min'
      });
    }
    
    return sessions;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    const now = Date.now();
    const timeoutMs = config.game.timeoutMinutes * 60 * 1000;
    
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > timeoutMs) {
        await this.deleteSession(id);
        logger.info(`Cleaned up expired session: ${id}`);
      }
    }
  }
}

/**
 * Game Session - Represents a single game session
 */
export class GameSession {
  constructor(id, cardService) {
    this.id = id;
    this.cardService = cardService;
    this.players = new Map();
    this.playerOrder = [];
    this.currentPlayerIndex = 0;
    this.gameBoard = new GameBoard();
    this.insertionService = new SmartInsertionService(this.gameBoard);
    this.deck = [];
    this.playerHands = new Map();
    this.status = 'waiting'; // 'waiting', 'playing', 'round_ended', 'ended'
    this.roundNumber = 0;
    this.cardsRevealed = false;
    this.lastRoundLoser = null;
    this.lastRoundReason = null;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    this.metadata = {
      name: null,
      maxPlayers: config.game.maxPlayers,
      createdBy: null,
      gameType: 'Card Estimation',
      estimatedDuration: '15-30 min'
    };
  }

  /**
   * Add player to session
   * @param {string} playerId - Player ID
   * @param {string} playerName - Player name
   * @returns {Object} Result object
   */
  addPlayer(playerId, playerName) {
    if (this.players.has(playerId)) {
      return { success: false, reason: 'Player already in session' };
    }

    const maxPlayers = this.metadata?.maxPlayers || config.game.maxPlayers;
    if (this.players.size >= maxPlayers) {
      return { success: false, reason: 'Session is full' };
    }

    if (this.status === 'playing') {
      return { success: false, reason: 'Game already in progress' };
    }

    this.players.set(playerId, {
      id: playerId,
      name: playerName,
      joinedAt: Date.now()
    });

    this.lastActivity = Date.now();
    return { success: true };
  }

  /**
   * Remove player from session
   * @param {string} playerId - Player ID
   * @returns {Object} Result object
   */
  removePlayer(playerId) {
    if (!this.players.has(playerId)) {
      return { success: false, reason: 'Player not in session' };
    }

    this.players.delete(playerId);
    this.playerHands.delete(playerId);
    
    // Remove from player order
    this.playerOrder = this.playerOrder.filter(id => id !== playerId);
    
    // Adjust current player index if necessary
    if (this.currentPlayerIndex >= this.playerOrder.length) {
      this.currentPlayerIndex = 0;
    }

    // End game if not enough players
    if (this.status === 'playing' && this.players.size < 2) {
      this.status = 'ended';
    }

    this.lastActivity = Date.now();
    return { success: true };
  }

  /**
   * Start the game
   * @param {string} initiatorId - Player who started the game
   * @returns {Object} Result object
   */
  startGame(initiatorId) {
    if (this.status === 'playing') {
      return { success: false, reason: 'Game already in progress' };
    }

    if (this.players.size < 2) {
      return { success: false, reason: 'Not enough players' };
    }

    if (!this.players.has(initiatorId)) {
      return { success: false, reason: 'Only players can start the game' };
    }

    // Initialize game
    this.status = 'playing';
    this.playerOrder = Array.from(this.players.keys());
    this.currentPlayerIndex = 0;
    this.gameBoard = new GameBoard();
    this.insertionService = new SmartInsertionService(this.gameBoard);
    
    // Create and shuffle deck
    this.deck = this.cardService.createShuffledDeck();
    
    // Deal cards to players
    const hands = this.cardService.dealCards(
      this.deck, 
      this.playerOrder, 
      config.game.cardsPerPlayer
    );
    
    this.playerHands.clear();
    for (const [playerId, hand] of Object.entries(hands)) {
      this.playerHands.set(playerId, hand);
    }

    this.lastActivity = Date.now();
    return { success: true };
  }

  /**
   * Execute a player move
   * @param {string} playerId - Player ID
   * @param {string} cardId - Card ID to play
   * @param {Object} insertionPoint - Insertion point data
   * @returns {Object} Result object
   */
  executeMove(playerId, cardId, insertionPoint) {
    console.log('\ud83c\udfaf GameSession.executeMove called:', { playerId, cardId, insertionPoint });
    console.log('\ud83d\udccb Session state:', {
      status: this.status,
      currentPlayer: this.getCurrentPlayerId(),
      playerCount: this.players.size,
      deckCount: this.deck.length
    });
    
    if (this.status !== 'playing') {
      console.log('\u274c Game not in progress - status:', this.status);
      return { success: false, reason: 'Game not in progress' };
    }

    if (this.getCurrentPlayerId() !== playerId) {
      console.log('\u274c Not player\'s turn - current:', this.getCurrentPlayerId(), 'attempting:', playerId);
      return { success: false, reason: 'Not your turn' };
    }

    const playerHand = this.playerHands.get(playerId);
    if (!playerHand) {
      console.log('\u274c Player hand not found for:', playerId);
      return { success: false, reason: 'Player hand not found' };
    }

    console.log('\ud83c\udcb4 Player hand:', playerHand.length, 'cards');

    // Find card in player's hand
    const cardIndex = playerHand.findIndex(card => card.id === cardId);
    if (cardIndex === -1) {
      console.log('\u274c Card not in hand - cardId:', cardId, 'hand cards:', playerHand.map(c => c.id));
      return { success: false, reason: 'Card not in hand' };
    }

    const card = playerHand[cardIndex];
    console.log('🃴 Found card:', { 
      id: card.id, 
      cardStructure: card,
      hasCardProperty: !!card.card,
      cardKeys: Object.keys(card)
    });
    console.log('🎯 Insertion point:', insertionPoint);

    // Execute insertion
    console.log('\ud83d\udd0d Executing insertion with SmartInsertionService...');
    const result = this.insertionService.executeInsertion(card, insertionPoint);
    console.log('\ud83d\udccb Insertion result:', { valid: result.valid, reason: result.reason, boardCard: result.boardCard ? 'present' : 'absent' });
    
    if (!result.valid) {
      console.log('\ud83d\udea8 Invalid move - ending game');
      // Invalid move - end game
      this.status = 'ended';
      this.lastActivity = Date.now();
      
      return {
        success: false,
        reason: result.reason,
        gameEnded: true,
        loser: playerId
      };
    }

    console.log('\u2705 Valid move - updating game state');
    // Valid move - update game state
    playerHand.splice(cardIndex, 1);
    console.log('\ud83c\udcb4 Card removed from hand, remaining:', playerHand.length, 'cards');
    
    // Draw new card if deck has cards
    const newCard = this.cardService.drawCard(this.deck);
    if (newCard) {
      playerHand.push(newCard);
      console.log('\ud83c\udcb4 New card drawn:', newCard.id, 'deck remaining:', this.deck.length);
    } else {
      console.log('\ud83c\udcb4 No cards left in deck');
    }

    // Next player's turn
    const oldPlayerIndex = this.currentPlayerIndex;
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length;
    console.log('\ud83d\udd04 Turn changed from player', oldPlayerIndex, 'to', this.currentPlayerIndex);
    console.log('\ud83d\udd04 Next player:', this.getCurrentPlayerId());
    
    this.lastActivity = Date.now();

    return { success: true, boardCard: result.boardCard };
  }

  /**
   * Get insertion points for current game state
   * @returns {Object} Insertion points
   */
  getInsertionPoints() {
    return this.insertionService.calculateInsertionPoints();
  }

  /**
   * Get current player ID
   * @returns {string|null} Current player ID
   */
  getCurrentPlayerId() {
    if (this.playerOrder.length === 0) return null;
    return this.playerOrder[this.currentPlayerIndex];
  }

  /**
   * Get player count
   * @returns {number} Number of players
   */
  getPlayerCount() {
    return this.players.size;
  }

  /**
   * Get game state for a specific player
   * @param {string} playerId - Player ID
   * @returns {Object} Game state
   */
  getGameStateForPlayer(playerId) {
    return {
      sessionId: this.id,
      status: this.status,
      players: Array.from(this.players.values()),
      currentPlayer: this.getCurrentPlayerId(),
      myTurn: this.getCurrentPlayerId() === playerId,
      board: this.gameBoard.toJSON(),
      playerHand: this.playerHands.get(playerId) || [],
      deckCount: this.deck.length,
      insertionPoints: this.getInsertionPoints()
    };
  }

  /**
   * Deal cards to all players
   * @returns {Object} Result
   */
  dealCards() {
    if (this.status !== 'playing') {
      return { success: false, reason: 'Game not in progress' };
    }

    // Create and shuffle deck
    this.deck = this.cardService.createShuffledDeck();
    
    // Deal cards to players
    const hands = this.cardService.dealCards(
      this.deck, 
      this.playerOrder, 
      config.game.cardsPerPlayer
    );
    
    this.playerHands.clear();
    for (const [playerId, hand] of Object.entries(hands)) {
      this.playerHands.set(playerId, hand);
    }

    this.roundNumber += 1;
    this.cardsRevealed = false;
    this.lastActivity = Date.now();
    
    return { success: true };
  }

  /**
   * Reveal all cards on the board
   * @returns {Object} Revealed cards data
   */
  revealAllCards() {
    const boardCards = this.gameBoard.getAllCards();
    const revealedCards = {};
    
    boardCards.forEach(({ x, y, card }) => {
      revealedCards[`${x},${y}`] = {
        position: { x, y },
        card: card.toJSON(),
        values: {
          height: card.card.height,
          width: card.card.width
        }
      };
    });
    
    this.cardsRevealed = true;
    this.lastActivity = Date.now();
    
    return revealedCards;
  }

  /**
   * Start a new round
   * @returns {Object} Result
   */
  startNewRound() {
    // Reset game board
    this.gameBoard = new GameBoard();
    this.insertionService = new SmartInsertionService(this.gameBoard);
    
    // Reset state
    this.status = 'playing';
    this.cardsRevealed = false;
    this.lastRoundLoser = null;
    this.lastRoundReason = null;
    this.currentPlayerIndex = 0;
    
    // Deal new cards
    return this.dealCards();
  }

  /**
   * End the current round
   * @param {string} losingPlayerId - Player who lost the round
   * @param {string} reason - Reason for losing
   * @returns {Object} Result
   */
  endRound(losingPlayerId, reason) {
    this.status = 'round_ended';
    this.lastRoundLoser = losingPlayerId;
    this.lastRoundReason = reason;
    this.lastActivity = Date.now();
    
    return { 
      success: true, 
      loser: losingPlayerId, 
      reason,
      revealedCards: this.revealAllCards()
    };
  }

  /**
   * Convert session to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      players: Array.from(this.players.entries()),
      playerOrder: this.playerOrder,
      currentPlayerIndex: this.currentPlayerIndex,
      board: this.gameBoard.toJSON(),
      playerHands: Array.from(this.playerHands.entries()),
      status: this.status,
      roundNumber: this.roundNumber,
      cardsRevealed: this.cardsRevealed,
      lastRoundLoser: this.lastRoundLoser,
      lastRoundReason: this.lastRoundReason,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      deckCount: this.deck.length
    };
  }

  /**
   * Create session from JSON
   * @param {Object} data - JSON data
   * @param {CardService} cardService - Card service instance
   * @returns {GameSession} Restored session
   */
  static fromJSON(data, cardService) {
    const session = new GameSession(data.id, cardService);
    
    session.players = new Map(data.players);
    session.playerOrder = data.playerOrder;
    session.currentPlayerIndex = data.currentPlayerIndex;
    session.status = data.status;
    session.createdAt = data.createdAt;
    session.lastActivity = data.lastActivity;
    
    // Restore game board
    // Note: This would need more complex restoration logic for full board state
    
    return session;
  }
}

export default GameService;
