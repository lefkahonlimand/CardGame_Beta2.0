import { logger } from '../utils/logger.js';

/**
 * GameBoard Model - Manages the cross-layout game board
 */
export class GameBoard {
  constructor() {
    this.positions = new Map(); // Map of "x,y" -> BoardCard
    this.origin = [0, 0]; // Fixed center position
    this.isEmpty = true;
  }

  /**
   * Place a card on the board
   * @param {Card} card - The card to place
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} axis - 'horizontal' or 'vertical'
   * @returns {BoardCard} The placed board card
   */
  placeCard(card, x, y, axis) {
    const key = `${x},${y}`;
    
    // Create board card with axis-specific properties
    const boardCard = new BoardCard(card, x, y, axis);
    
    this.positions.set(key, boardCard);
    this.isEmpty = false;
    
    logger.info(`Card placed: ${card.name} at (${x},${y}) on ${axis} axis`);
    
    return boardCard;
  }

  /**
   * Remove a card from the board
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if card was removed
   */
  removeCard(x, y) {
    const key = `${x},${y}`;
    const removed = this.positions.delete(key);
    
    if (this.positions.size === 0) {
      this.isEmpty = true;
    }
    
    return removed;
  }

  /**
   * Get card at position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {BoardCard|null}
   */
  getCard(x, y) {
    const key = `${x},${y}`;
    return this.positions.get(key) || null;
  }

  /**
   * Check if position is occupied
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean}
   */
  isPositionOccupied(x, y) {
    const key = `${x},${y}`;
    return this.positions.has(key);
  }

  /**
   * Get all cards on a specific axis
   * @param {string} axis - 'horizontal' or 'vertical'
   * @returns {Array<BoardCard>}
   */
  getCardsOnAxis(axis) {
    const cards = [];
    
    for (const [position, boardCard] of this.positions) {
      const [x, y] = position.split(',').map(Number);
      
      if (axis === 'horizontal' && y === 0) {
        cards.push(boardCard);
      } else if (axis === 'vertical' && x === 0) {
        cards.push(boardCard);
      }
    }
    
    // Sort by position
    if (axis === 'horizontal') {
      cards.sort((a, b) => a.x - b.x);
    } else {
      cards.sort((a, b) => a.y - b.y);
    }
    
    return cards;
  }

  /**
   * Get neighbors of a position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object} Object with left, right, above, below neighbors
   */
  getNeighbors(x, y) {
    return {
      left: this.getCard(x - 1, y),
      right: this.getCard(x + 1, y),
      above: this.getCard(x, y + 1),
      below: this.getCard(x, y - 1)
    };
  }

  /**
   * Determine axis from position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {string|null} 'horizontal', 'vertical', or null if invalid
   */
  determineAxis(x, y) {
    if (x === 0 && y === 0) {
      return 'origin'; // Special case for first card
    } else if (y === 0) {
      return 'horizontal';
    } else if (x === 0) {
      return 'vertical';
    }
    return null; // Invalid position for cross layout
  }

  /**
   * Shift cards when inserting
   * @param {number} insertX - X coordinate to insert at
   * @param {number} insertY - Y coordinate to insert at
   * @param {string} axis - Axis of insertion
   */
  shiftCardsForInsertion(insertX, insertY, axis) {
    const cardsToShift = [];
    
    if (axis === 'horizontal') {
      // Shift cards to the right
      for (const [position, boardCard] of this.positions) {
        const [x, y] = position.split(',').map(Number);
        if (y === insertY && x >= insertX) {
          cardsToShift.push({ boardCard, oldX: x, oldY: y, newX: x + 1, newY: y });
        }
      }
    } else if (axis === 'vertical') {
      // Shift cards upward
      for (const [position, boardCard] of this.positions) {
        const [x, y] = position.split(',').map(Number);
        if (x === insertX && y >= insertY) {
          cardsToShift.push({ boardCard, oldX: x, oldY: y, newX: x, newY: y + 1 });
        }
      }
    }
    
    // Remove cards from old positions
    cardsToShift.forEach(({ oldX, oldY }) => {
      this.removeCard(oldX, oldY);
    });
    
    // Place cards at new positions
    cardsToShift.forEach(({ boardCard, newX, newY }) => {
      boardCard.x = newX;
      boardCard.y = newY;
      this.positions.set(`${newX},${newY}`, boardCard);
    });
    
    logger.info(`Shifted ${cardsToShift.length} cards for insertion at (${insertX},${insertY})`);
  }

  /**
   * Get all positions as array
   * @returns {Array<{x: number, y: number, card: BoardCard}>}
   */
  getAllPositions() {
    const result = [];
    for (const [position, boardCard] of this.positions) {
      const [x, y] = position.split(',').map(Number);
      result.push({ x, y, card: boardCard });
    }
    return result;
  }

  /**
   * Get all cards as array (alias for getAllPositions)
   * @returns {Array<{x: number, y: number, card: BoardCard}>}
   */
  getAllCards() {
    return this.getAllPositions();
  }

  /**
   * Move a card from one position to another
   * @param {number} fromX - Source X coordinate
   * @param {number} fromY - Source Y coordinate
   * @param {number} toX - Target X coordinate
   * @param {number} toY - Target Y coordinate
   * @returns {boolean} True if successful
   */
  moveCard(fromX, fromY, toX, toY) {
    const fromKey = `${fromX},${fromY}`;
    const toKey = `${toX},${toY}`;
    
    const card = this.positions.get(fromKey);
    if (!card) {
      return false;
    }
    
    // Remove from old position
    this.positions.delete(fromKey);
    
    // Update card position
    card.x = toX;
    card.y = toY;
    
    // Place at new position
    this.positions.set(toKey, card);
    
    return true;
  }

  /**
   * Convert board to JSON representation
   * @returns {Object}
   */
  toJSON() {
    const result = {};
    for (const [position, boardCard] of this.positions) {
      result[position] = boardCard.toJSON();
    }
    return result;
  }

  /**
   * Get board statistics
   * @returns {Object}
   */
  getStats() {
    const horizontalCards = this.getCardsOnAxis('horizontal');
    const verticalCards = this.getCardsOnAxis('vertical');
    
    return {
      totalCards: this.positions.size,
      horizontalCards: horizontalCards.length,
      verticalCards: verticalCards.length,
      isEmpty: this.isEmpty,
      hasOrigin: this.positions.has('0,0')
    };
  }
}

/**
 * BoardCard - Represents a card placed on the board
 */
export class BoardCard {
  constructor(card, x, y, axis) {
    this.card = card;
    this.x = x;
    this.y = y;
    this.axis = axis;
    this.isOrigin = x === 0 && y === 0;
    
    // Set axis-specific properties
    if (this.isOrigin) {
      this.orientation = 'crossroad';
      this.metricValue = null; // Will be determined by context
      this.metricName = 'Kreuzungspunkt';
    } else {
      this.orientation = axis === 'horizontal' ? 'querformat' : 'hochformat';
      this.metricValue = card.getMetricValue(axis);
      this.metricName = card.getMetricName(axis);
    }
  }

  /**
   * Get effective metric value for comparison
   * @param {string} comparisonAxis - Axis for comparison
   * @returns {number}
   */
  getEffectiveMetricValue(comparisonAxis) {
    if (this.isOrigin) {
      // Origin card uses the metric that matches the comparison axis
      return this.card.getMetricValue(comparisonAxis);
    }
    return this.metricValue;
  }

  /**
   * Convert to JSON representation
   * @returns {Object}
   */
  toJSON() {
    return {
      ...this.card.toJSON(),
      x: this.x,
      y: this.y,
      axis: this.axis,
      orientation: this.orientation,
      metricValue: this.metricValue,
      metricName: this.metricName,
      isOrigin: this.isOrigin
    };
  }
}

export default GameBoard;
