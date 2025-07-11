import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Card } from '../models/Card.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Card Service - Manages card deck and operations
 */
export class CardService {
  constructor() {
    this.cards = [];
    this.cardsById = new Map();
  }

  /**
   * Initialize card service by loading cards from JSON
   */
  async initialize() {
    try {
      await this.loadCards();
      logger.info(`Card service initialized with ${this.cards.length} cards`);
    } catch (error) {
      logger.error('Failed to initialize card service:', error);
      throw error;
    }
  }

  /**
   * Load cards from JSON file
   */
  async loadCards() {
    const cardsPath = path.join(__dirname, '../../../data/cards.json');
    
    try {
      const cardsData = await fs.readFile(cardsPath, 'utf8');
      const cardArray = JSON.parse(cardsData);
      
      this.cards = [];
      this.cardsById.clear();
      
      for (const cardData of cardArray) {
        // Validate card data
        const { error } = Card.validate(cardData);
        if (error) {
          logger.warn(`Invalid card data for ${cardData.id}: ${error.message}`);
          continue;
        }
        
        const card = new Card(cardData);
        this.cards.push(card);
        this.cardsById.set(card.id, card);
      }
      
      logger.info(`Loaded ${this.cards.length} valid cards`);
    } catch (error) {
      logger.error('Failed to load cards:', error);
      throw new Error('Could not load card data');
    }
  }

  /**
   * Get all cards
   * @returns {Array<Card>} Array of all cards
   */
  getAllCards() {
    return [...this.cards];
  }

  /**
   * Get card by ID
   * @param {string} cardId - Card ID
   * @returns {Card|null} Card or null if not found
   */
  getCardById(cardId) {
    return this.cardsById.get(cardId) || null;
  }

  /**
   * Get cards that can be used as origin card (first card)
   * @returns {Array<Card>} Array of cards with both height and width
   */
  getOriginCards() {
    return this.cards.filter(card => card.canBeOriginCard());
  }

  /**
   * Get cards that can be placed on a specific axis
   * @param {string} axis - 'horizontal' or 'vertical'
   * @returns {Array<Card>} Array of cards that can be placed on the axis
   */
  getCardsForAxis(axis) {
    return this.cards.filter(card => card.canBePlacedOnAxis(axis));
  }

  /**
   * Create a shuffled deck of cards
   * @returns {Array<Card>} Shuffled array of cards
   */
  createShuffledDeck() {
    const deck = [...this.cards];
    
    // Fisher-Yates shuffle algorithm
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    logger.debug('Created shuffled deck with ' + deck.length + ' cards');
    return deck;
  }

  /**
   * Deal cards from deck to players
   * @param {Array<Card>} deck - The deck to deal from
   * @param {Array<string>} playerIds - Array of player IDs
   * @param {number} cardsPerPlayer - Number of cards per player
   * @returns {Object} Object mapping player IDs to their hands
   */
  dealCards(deck, playerIds, cardsPerPlayer = 5) {
    const hands = {};
    
    // Initialize empty hands
    playerIds.forEach(playerId => {
      hands[playerId] = [];
    });
    
    // Deal cards in round-robin fashion
    for (let cardIndex = 0; cardIndex < cardsPerPlayer; cardIndex++) {
      for (const playerId of playerIds) {
        if (deck.length > 0) {
          hands[playerId].push(deck.pop());
        }
      }
    }
    
    logger.info(`Dealt ${cardsPerPlayer} cards to ${playerIds.length} players`);
    return hands;
  }

  /**
   * Draw a card from deck
   * @param {Array<Card>} deck - The deck to draw from
   * @returns {Card|null} The drawn card or null if deck is empty
   */
  drawCard(deck) {
    if (deck.length === 0) {
      logger.warn('Attempted to draw from empty deck');
      return null;
    }
    
    const card = deck.pop();
    logger.debug(`Card drawn: ${card.name}`);
    return card;
  }

  /**
   * Get cards suitable for a specific game situation
   * @param {string} gamePhase - 'origin', 'early', 'mid', 'late'
   * @returns {Array<Card>} Filtered cards for the game phase
   */
  getCardsForGamePhase(gamePhase) {
    switch (gamePhase) {
      case 'origin':
        return this.getOriginCards();
      case 'early':
        // Cards with moderate values for early game
        return this.cards.filter(card => {
          const hasModerateValues = (card.height && card.height < 1000) || 
                                  (card.width && card.width < 1000);
          return hasModerateValues;
        });
      case 'mid':
        // All cards are suitable for mid game
        return this.cards;
      case 'late':
        // Cards with extreme values for late game
        return this.cards.filter(card => {
          const hasExtremeValues = (card.height && card.height > 1000) || 
                                  (card.width && card.width > 1000);
          return hasExtremeValues;
        });
      default:
        return this.cards;
    }
  }

  /**
   * Get card statistics
   * @returns {Object} Statistics about the card collection
   */
  getCardStats() {
    const stats = {
      totalCards: this.cards.length,
      originCards: this.getOriginCards().length,
      horizontalOnlyCards: this.getCardsForAxis('horizontal').filter(card => !card.canBePlacedOnAxis('vertical')).length,
      verticalOnlyCards: this.getCardsForAxis('vertical').filter(card => !card.canBePlacedOnAxis('horizontal')).length,
      dualAxisCards: this.cards.filter(card => card.canBePlacedOnAxis('horizontal') && card.canBePlacedOnAxis('vertical')).length,
      heightRange: {
        min: Math.min(...this.cards.filter(c => c.height).map(c => c.height)),
        max: Math.max(...this.cards.filter(c => c.height).map(c => c.height))
      },
      widthRange: {
        min: Math.min(...this.cards.filter(c => c.width).map(c => c.width)),
        max: Math.max(...this.cards.filter(c => c.width).map(c => c.width))
      }
    };
    
    return stats;
  }

  /**
   * Validate if a card exists and is valid
   * @param {string} cardId - Card ID to validate
   * @returns {Object} Validation result
   */
  validateCard(cardId) {
    const card = this.getCardById(cardId);
    
    if (!card) {
      return {
        valid: false,
        reason: `Karte mit ID "${cardId}" nicht gefunden`
      };
    }
    
    return {
      valid: true,
      card
    };
  }

  /**
   * Search cards by name or properties
   * @param {string} query - Search query
   * @returns {Array<Card>} Array of matching cards
   */
  searchCards(query) {
    const searchTerm = query.toLowerCase();
    
    return this.cards.filter(card => {
      return card.name.toLowerCase().includes(searchTerm) ||
             card.id.toLowerCase().includes(searchTerm);
    });
  }
}

export default CardService;
