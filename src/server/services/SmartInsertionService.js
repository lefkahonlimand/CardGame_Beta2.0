import { logger } from '../utils/logger.js';

/**
 * Smart Insertion Service - Intelligent card insertion system
 */
export class SmartInsertionService {
  constructor(gameBoard) {
    this.gameBoard = gameBoard;
  }

  /**
   * Calculate all valid insertion points for current board state
   * @returns {Object} Object with horizontal and vertical insertion points
   */
  calculateInsertionPoints() {
    const cards = this.gameBoard.getAllCards();
    
    if (cards.length === 0) {
      return {
        horizontal: [],
        vertical: [],
        origin: [{ x: 0, y: 0, type: 'origin', description: 'Erste Karte (Zentrum)' }]
      };
    }

    const result = {
      horizontal: this._calculateAxisPoints('horizontal'),
      vertical: this._calculateAxisPoints('vertical'),
      origin: []
    };

    logger.debug('Calculated insertion points', { 
      horizontalCount: result.horizontal.length,
      verticalCount: result.vertical.length 
    });

    return result;
  }

  /**
   * Berechnet Einfügepositionen für eine bestimmte Achse
   * @param {string} axis - 'horizontal' oder 'vertical'
   * @returns {Array} - Array von Einfügepositionen
   */
  _calculateAxisPoints(axis) {
    const points = [];
    const cards = this.gameBoard.getAllCards();

    if (cards.length === 0) {
      // Leeres Board - nur Origin-Position
      return [{ x: 0, y: 0, type: 'origin', axis: 'origin' }];
    }

    // Finde alle Karten auf der Achse
    const axisCards = cards.filter(cardInfo => {
      if (axis === 'horizontal') {
        return cardInfo.y === 0; // Horizontale Achse ist y=0
      } else {
        return cardInfo.x === 0; // Vertikale Achse ist x=0
      }
    });

    if (axisCards.length === 0) {
      // Keine Karten auf dieser Achse - Origin muss existieren
      const originCard = cards.find(c => c.x === 0 && c.y === 0);
      const originCardName = originCard ? originCard.card.name : 'Origin';
      
      if (axis === 'horizontal') {
        return [{ x: 1, y: 0, type: 'extend', axis: 'horizontal', description: `Rechts von ${originCardName} erweitern` },
                { x: -1, y: 0, type: 'extend', axis: 'horizontal', description: `Links von ${originCardName} erweitern` }];
      } else {
        return [{ x: 0, y: 1, type: 'extend', axis: 'vertical', description: `Über ${originCardName} erweitern` },
                { x: 0, y: -1, type: 'extend', axis: 'vertical', description: `Unter ${originCardName} erweitern` }];
      }
    }

    // Sortiere Karten nach Position
    axisCards.sort((a, b) => {
      return axis === 'horizontal' ? a.x - b.x : a.y - b.y;
    });

    // Finde Erweiterungspunkte an den Enden
    const first = axisCards[0];
    const last = axisCards[axisCards.length - 1];

    if (axis === 'horizontal') {
      // Links vom ersten Element
      points.push({ x: first.x - 1, y: 0, type: 'extend', axis: 'horizontal', description: `Links von ${first.card.card.name} erweitern` });
      // Rechts vom letzten Element
      points.push({ x: last.x + 1, y: 0, type: 'extend', axis: 'horizontal', description: `Rechts von ${last.card.card.name} erweitern` });
    } else {
      // Oben vom ersten Element
      points.push({ x: 0, y: first.y - 1, type: 'extend', axis: 'vertical', description: `Unter ${first.card.card.name} erweitern` });
      // Unten vom letzten Element
      points.push({ x: 0, y: last.y + 1, type: 'extend', axis: 'vertical', description: `Über ${last.card.card.name} erweitern` });
    }

    // Finde Einfügepositionen zwischen aufeinanderfolgenden Karten
    for (let i = 0; i < axisCards.length - 1; i++) {
      const current = axisCards[i];
      const next = axisCards[i + 1];

      if (axis === 'horizontal') {
        if (next.x - current.x > 1) {
          // Es gibt eine Lücke - Einfügepunkt hinzufügen
          points.push({
            x: current.x + 1,
            y: 0,
            type: 'insert',
            axis: 'horizontal',
            shiftsCards: false
          });
        } else if (next.x - current.x === 1) {
          // Karten sind aufeinanderfolgend - füge Einfügepunkt hinzu, der Karten verschiebt
          points.push({
            x: next.x,
            y: 0,
            type: 'insert',
            axis: 'horizontal',
            shiftsCards: true
          });
        }
      } else {
        if (next.y - current.y > 1) {
          // Es gibt eine Lücke - Einfügepunkt hinzufügen
          points.push({
            x: 0,
            y: current.y + 1,
            type: 'insert',
            axis: 'vertical',
            shiftsCards: false
          });
        } else if (next.y - current.y === 1) {
          // Karten sind aufeinanderfolgend - füge Einfügepunkt hinzu, der Karten verschiebt
          points.push({
            x: 0,
            y: next.y,
            type: 'insert',
            axis: 'vertical',
            shiftsCards: true
          });
        }
      }
    }

    return points;
  }

  /**
   * Get horizontal insertion points
   * @returns {Array} Array of horizontal insertion points
   */
  getHorizontalInsertionPoints() {
    const horizontalCards = this.gameBoard.getCardsOnAxis('horizontal');
    const insertionPoints = [];

    if (horizontalCards.length === 0) {
      return insertionPoints;
    }

    // Sort cards by x position
    horizontalCards.sort((a, b) => a.x - b.x);

    // Add extensions at the ends
    const leftMost = horizontalCards[0].x;
    const rightMost = horizontalCards[horizontalCards.length - 1].x;

    insertionPoints.push({
      x: leftMost - 1,
      y: 0,
      type: 'extend',
      axis: 'horizontal',
      description: `Links von ${horizontalCards[0].card.name} erweitern`
    });

    insertionPoints.push({
      x: rightMost + 1,
      y: 0,
      type: 'extend',
      axis: 'horizontal',
      description: `Rechts von ${horizontalCards[horizontalCards.length - 1].card.name} erweitern`
    });

    // Add gap insertions between non-consecutive cards
    for (let i = 0; i < horizontalCards.length - 1; i++) {
      const current = horizontalCards[i];
      const next = horizontalCards[i + 1];

      if (next.x - current.x > 1) {
        // There's a gap - add insertion point
        insertionPoints.push({
          x: current.x + 1,
          y: 0,
          type: 'gap',
          axis: 'horizontal',
          description: `Zwischen ${current.card.name} und ${next.card.name} einfügen`
        });
      }
    }

    // Add between insertions (right next to existing cards)
    for (let i = 0; i < horizontalCards.length - 1; i++) {
      const current = horizontalCards[i];
      const next = horizontalCards[i + 1];

      if (next.x - current.x === 1) {
        // Cards are consecutive - add insertion point between them
        insertionPoints.push({
          x: current.x + 1,
          y: 0,
          type: 'insert',
          axis: 'horizontal',
          description: `Zwischen ${current.card.name} und ${next.card.name} einfügen (verschiebt rechte Karten)`,
          shiftsCards: true
        });
      }
    }

    return insertionPoints;
  }

  /**
   * Get vertical insertion points
   * @returns {Array} Array of vertical insertion points
   */
  getVerticalInsertionPoints() {
    const verticalCards = this.gameBoard.getCardsOnAxis('vertical');
    const insertionPoints = [];

    if (verticalCards.length === 0) {
      return insertionPoints;
    }

    // Sort cards by y position
    verticalCards.sort((a, b) => a.y - b.y);

    // Add extensions at the ends
    const bottomMost = verticalCards[0].y;
    const topMost = verticalCards[verticalCards.length - 1].y;

    insertionPoints.push({
      x: 0,
      y: bottomMost - 1,
      type: 'extend',
      axis: 'vertical',
      description: `Unter ${verticalCards[0].card.name} erweitern`
    });

    insertionPoints.push({
      x: 0,
      y: topMost + 1,
      type: 'extend',
      axis: 'vertical',
      description: `Über ${verticalCards[verticalCards.length - 1].card.name} erweitern`
    });

    // Add gap insertions between non-consecutive cards
    for (let i = 0; i < verticalCards.length - 1; i++) {
      const current = verticalCards[i];
      const next = verticalCards[i + 1];

      if (next.y - current.y > 1) {
        // There's a gap - add insertion point
        insertionPoints.push({
          x: 0,
          y: current.y + 1,
          type: 'gap',
          axis: 'vertical',
          description: `Zwischen ${current.card.name} und ${next.card.name} einfügen`
        });
      }
    }

    // Add between insertions (right next to existing cards)
    for (let i = 0; i < verticalCards.length - 1; i++) {
      const current = verticalCards[i];
      const next = verticalCards[i + 1];

      if (next.y - current.y === 1) {
        // Cards are consecutive - add insertion point between them
        insertionPoints.push({
          x: 0,
          y: current.y + 1,
          type: 'insert',
          axis: 'vertical',
          description: `Zwischen ${current.card.name} und ${next.card.name} einfügen (verschiebt obere Karten)`,
          shiftsCards: true
        });
      }
    }

    return insertionPoints;
  }

  /**
   * Validate if a card can be inserted at a specific point
   * @param {Card} card - Card to insert
   * @param {Object} insertionPoint - Insertion point object
   * @returns {Object} Validation result
   */
  validateInsertion(card, insertionPoint) {
    const { x, y, axis, type, shiftsCards } = insertionPoint;

    // Check if position is already occupied (skip for shifting insertions)
    if (!shiftsCards) {
      const existingCard = this.gameBoard.getCard(x, y);
      if (existingCard) {
        return {
          valid: false,
          reason: 'Position bereits belegt'
        };
      }
    }

    // Check axis-specific validation
    if (axis === 'horizontal') {
      // Horizontal axis needs width
      if (!card.width || card.width === null) {
        return {
          valid: false,
          reason: `Karte ${card.name} kann nicht auf horizontaler Achse platziert werden`
        };
      }
    } else if (axis === 'vertical') {
      // Vertical axis needs height
      if (!card.height || card.height === null) {
        return {
          valid: false,
          reason: `Karte ${card.name} kann nicht auf vertikaler Achse platziert werden`
        };
      }
    } else if (axis === 'origin') {
      // Origin needs both metrics
      if (!card.width || !card.height || card.width === null || card.height === null) {
        return {
          valid: false,
          reason: `Karte ${card.name} kann nicht als erste Karte gelegt werden (benötigt beide Metriken)`
        };
      }
    }

    // Check neighbor relationships - simplified validation
    const neighbors = this.gameBoard.getNeighbors(x, y);
    const neighborList = [neighbors.left, neighbors.right, neighbors.above, neighbors.below].filter(n => n !== null);
    
    for (const neighbor of neighborList) {
      // For now, only validate that the card has the right metric for the axis
      // More complex neighbor validation can be added here based on game rules
      if (!this._validateNeighborRelationship(card, neighbor, insertionPoint)) {
        return {
          valid: false,
          reason: `Karte ${card.name} passt nicht zu Nachbar ${neighbor.card.name}`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate insertion that requires shifting cards
   * @param {Card} card - Card to insert
   * @param {Object} insertionPoint - Insertion point object
   * @returns {Object} Validation result
   */
  validateInsertionWithShifting(card, insertionPoint) {
    const { x, y, axis } = insertionPoint;

    // Simulate the board state after shifting
    const neighbors = this.gameBoard.getNeighbors(x, y);
    const cardValue = card.getMetricValue(axis);

    // Check left neighbor (for horizontal) or below neighbor (for vertical)
    if (axis === 'horizontal' && neighbors.left) {
      const leftValue = neighbors.left.getEffectiveMetricValue(axis);
      if (cardValue <= leftValue) {
        return {
          valid: false,
          reason: `${card.name} (${card.getMetricName(axis)}: ${cardValue}) muss größer sein als ${neighbors.left.card.name} (${leftValue})`
        };
      }
    } else if (axis === 'vertical' && neighbors.below) {
      const belowValue = neighbors.below.getEffectiveMetricValue(axis);
      if (cardValue <= belowValue) {
        return {
          valid: false,
          reason: `${card.name} (${card.getMetricName(axis)}: ${cardValue}) muss größer sein als ${neighbors.below.card.name} (${belowValue})`
        };
      }
    }

    // After insertion, the right/above neighbor will be shifted
    // We need to check if the new card fits between left/below and the card that will be at the new position
    const originalNeighbor = this.gameBoard.getCard(x, y);
    if (originalNeighbor) {
      const originalValue = originalNeighbor.getEffectiveMetricValue(axis);
      if (cardValue >= originalValue) {
        return {
          valid: false,
          reason: `${card.name} (${card.getMetricName(axis)}: ${cardValue}) muss kleiner sein als ${originalNeighbor.card.name} (${originalValue})`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate neighbors for standard placement
   * @param {Card} card - Card to place
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} axis - Axis of placement
   * @returns {Object} Validation result
   */
  validateNeighbors(card, x, y, axis) {
    const neighbors = this.gameBoard.getNeighbors(x, y);
    const cardValue = card.getMetricValue(axis);
    const metricName = card.getMetricName(axis);

    // Check all relevant neighbors based on axis
    if (axis === 'horizontal') {
      // Check left neighbor
      if (neighbors.left) {
        const leftValue = neighbors.left.getEffectiveMetricValue(axis);
        if (cardValue <= leftValue) {
          return {
            valid: false,
            reason: `${card.name} (${metricName}: ${cardValue}) muss größer sein als ${neighbors.left.card.name} (${leftValue})`
          };
        }
      }

      // Check right neighbor
      if (neighbors.right) {
        const rightValue = neighbors.right.getEffectiveMetricValue(axis);
        if (cardValue >= rightValue) {
          return {
            valid: false,
            reason: `${card.name} (${metricName}: ${cardValue}) muss kleiner sein als ${neighbors.right.card.name} (${rightValue})`
          };
        }
      }
    } else if (axis === 'vertical') {
      // Check below neighbor
      if (neighbors.below) {
        const belowValue = neighbors.below.getEffectiveMetricValue(axis);
        if (cardValue <= belowValue) {
          return {
            valid: false,
            reason: `${card.name} (${metricName}: ${cardValue}) muss größer sein als ${neighbors.below.card.name} (${belowValue})`
          };
        }
      }

      // Check above neighbor
      if (neighbors.above) {
        const aboveValue = neighbors.above.getEffectiveMetricValue(axis);
        if (cardValue >= aboveValue) {
          return {
            valid: false,
            reason: `${card.name} (${metricName}: ${cardValue}) muss kleiner sein als ${neighbors.above.card.name} (${aboveValue})`
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Validate relationship between two neighbor cards
   * @param {Card} card - The new card
   * @param {Object} neighbor - Neighbor card with position
   * @param {Object} position - Position of the new card
   * @returns {boolean}
   */
  _validateNeighborRelationship(card, neighbor, position) {
    const dx = neighbor.x - position.x;
    const dy = neighbor.y - position.y;

    console.log(`🔍 Validating neighbor relationship:`);
    console.log(`  New card: ${card.name} at (${position.x}, ${position.y})`);
    console.log(`  Neighbor: ${neighbor.card.name} at (${neighbor.x}, ${neighbor.y})`);
    console.log(`  Direction delta: dx=${dx}, dy=${dy}`);
    console.log(`  New card values: width=${card.width}, height=${card.height}`);
    console.log(`  Neighbor values: width=${neighbor.card.width}, height=${neighbor.card.height}`);

    // Horizontal neighbors (same y-coordinate)
    if (dy === 0 && Math.abs(dx) === 1) {
      if (dx === 1) {
        // Neighbor is to the RIGHT of new card
        // Regel: "wird eine Karte rechts neben eine andere karte gelegt, so muss sie einen höheren wert in der breite haben als die links neben ihr"
        // Das bedeutet: die neue Karte muss GRÖSSER sein als die linke Nachbarkarte
        // Da der Nachbar rechts ist, muss die neue Karte KLEINER sein als der rechte Nachbar
        if (!(card.width < neighbor.card.width)) {
          console.log(`❌ Failed: New card width (${card.width}) must be less than right neighbor (${neighbor.card.width})`);
          return false;
        }
      } else if (dx === -1) {
        // Neighbor is to the LEFT of new card
        // Die neue Karte ist rechts vom Nachbarn
        // Regel: neue Karte muss GRÖSSER sein als die linke Nachbarkarte
        if (!(card.width > neighbor.card.width)) {
          console.log(`❌ Failed: New card width (${card.width}) must be greater than left neighbor (${neighbor.card.width})`);
          return false;
        }
      }
      console.log(`✅ Horizontal validation passed`);
    }

    // Vertical neighbors (same x-coordinate)
    if (dx === 0 && Math.abs(dy) === 1) {
      if (dy === 1) {
        // Neighbor is ABOVE the new card
        // Regel: "wird eine karte unter eine andere Karte gelegt, so muss sie einen geringeren wert in der höhe haben als die über ihr"
        // Das bedeutet: die neue Karte muss KLEINER sein als die obere Nachbarkarte
        if (!(card.height < neighbor.card.height)) {
          console.log(`❌ Failed: New card height (${card.height}) must be less than upper neighbor (${neighbor.card.height})`);
          return false;
        }
      } else if (dy === -1) {
        // Neighbor is BELOW the new card
        // Regel: "wird ein karte über eine andere Karte gelegt, so muss sie einen größeren wert für die Höhe haben als die unter ihr"
        // Das bedeutet: die neue Karte muss GRÖSSER sein als die untere Nachbarkarte
        if (!(card.height > neighbor.card.height)) {
          console.log(`❌ Failed: New card height (${card.height}) must be greater than lower neighbor (${neighbor.card.height})`);
          return false;
        }
      }
      console.log(`✅ Vertical validation passed`);
    }

    return true;
  }

  /**
   * Execute insertion at a specific point
   * @param {Card} card - Card to insert
   * @param {Object} insertionPoint - Insertion point object
   * @returns {Object} Insertion result
   */
  executeInsertion(card, insertionPoint) {
    const { x, y, axis, type, shiftsCards } = insertionPoint;

    // Validate insertion first
    const validation = this.validateInsertion(card, insertionPoint);
    if (!validation.valid) {
      console.log(`DEBUG: executeInsertion validation failed for ${card.name} at (${x},${y}): ${validation.reason}`);
      return validation;
    }

    try {
      // If insertion requires shifting, do it before placing the card
      if (shiftsCards) {
        this._shiftCards(insertionPoint);
      }

      // Place the card
      const boardCard = this.gameBoard.placeCard(card, x, y, axis);

      logger.info(`Successfully inserted card ${card.name} at (${x},${y}) on ${axis} axis`, {
        type,
        shiftsCards: shiftsCards || false
      });

      return {
        valid: true,
        boardCard,
        insertionPoint
      };
    } catch (error) {
      return {
        valid: false,
        reason: `Fehler beim Einfügen: ${error.message}`
      };
    }
  }

  /**
   * Shift cards when inserting
   * @param {Object} position - The insertion position
   */
  _shiftCards(position) {
    const cards = this.gameBoard.getAllCards();
    const cardsToShift = [];

    if (position.axis === 'horizontal') {
      // Shift all cards to the right of the insertion position
      cardsToShift.push(...cards.filter(cardInfo => 
        cardInfo.y === position.y && cardInfo.x >= position.x
      ));
      
      // Sort from right to left to avoid conflicts
      cardsToShift.sort((a, b) => b.x - a.x);
      for (const cardInfo of cardsToShift) {
        this.gameBoard.moveCard(cardInfo.x, cardInfo.y, cardInfo.x + 1, cardInfo.y);
      }
    } else if (position.axis === 'vertical') {
      // Shift all cards above the insertion position
      cardsToShift.push(...cards.filter(cardInfo => 
        cardInfo.x === position.x && cardInfo.y >= position.y
      ));
      
      // Sort from top to bottom to avoid conflicts
      cardsToShift.sort((a, b) => b.y - a.y);
      for (const cardInfo of cardsToShift) {
        this.gameBoard.moveCard(cardInfo.x, cardInfo.y, cardInfo.x, cardInfo.y + 1);
      }
    }
  }
}

export default SmartInsertionService;
