import { describe, it, expect, beforeEach } from '@jest/globals';
import { SmartInsertionService } from '../../src/server/services/SmartInsertionService.js';
import { GameBoard } from '../../src/server/models/GameBoard.js';
import { Card } from '../../src/server/models/Card.js';

describe('SmartInsertionService', () => {
  let gameBoard;
  let insertionService;
  let testCards;

  beforeEach(() => {
    gameBoard = new GameBoard();
    insertionService = new SmartInsertionService(gameBoard);
    
    // Create test cards
    testCards = {
      eiffel: new Card({
        id: 'eiffel',
        name: 'Eiffelturm',
        height: 330,
        width: 125,
        image_url: '/images/eiffel.jpg'
      }),
      burj: new Card({
        id: 'burj',
        name: 'Burj Khalifa',
        height: 828,
        width: 39,
        image_url: '/images/burj.jpg'
      }),
      football: new Card({
        id: 'football',
        name: 'Fußballfeld',
        height: null,
        width: 105,
        image_url: '/images/football.jpg'
      }),
      zugspitze: new Card({
        id: 'zugspitze',
        name: 'Zugspitze',
        height: 2962,
        width: null,
        image_url: '/images/zugspitze.jpg'
      })
    };
  });

  describe('Empty Board', () => {
    it('should provide origin position for empty board', () => {
      const insertionPoints = insertionService.calculateInsertionPoints();
      
      expect(insertionPoints.origin).toHaveLength(1);
      expect(insertionPoints.origin[0]).toEqual({
        x: 0,
        y: 0,
        type: 'origin',
        description: 'Erste Karte (Zentrum)'
      });
      expect(insertionPoints.horizontal).toHaveLength(0);
      expect(insertionPoints.vertical).toHaveLength(0);
    });

    it('should validate origin card placement', () => {
      const originPoint = { x: 0, y: 0, type: 'origin', axis: 'origin' };
      
      // Valid origin card (has both metrics)
      const validResult = insertionService.validateInsertion(testCards.eiffel, originPoint);
      expect(validResult.valid).toBe(true);
      
      // Invalid origin card (only has one metric)
      const invalidResult = insertionService.validateInsertion(testCards.football, originPoint);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.reason).toContain('kann nicht als erste Karte gelegt werden');
    });
  });

  describe('Single Card Board', () => {
    beforeEach(() => {
      // Place origin card
      gameBoard.placeCard(testCards.eiffel, 0, 0, 'origin');
    });

    it('should provide 4 extension points after placing origin card', () => {
      const insertionPoints = insertionService.calculateInsertionPoints();
      
      expect(insertionPoints.origin).toHaveLength(0);
      expect(insertionPoints.horizontal).toHaveLength(2); // left and right extensions
      expect(insertionPoints.vertical).toHaveLength(2); // up and down extensions
      
      // Check horizontal extensions
      expect(insertionPoints.horizontal).toContainEqual({
        x: -1,
        y: 0,
        type: 'extend',
        axis: 'horizontal',
        description: 'Links von Eiffelturm erweitern'
      });
      expect(insertionPoints.horizontal).toContainEqual({
        x: 1,
        y: 0,
        type: 'extend',
        axis: 'horizontal',
        description: 'Rechts von Eiffelturm erweitern'
      });
      
      // Check vertical extensions
      expect(insertionPoints.vertical).toContainEqual({
        x: 0,
        y: -1,
        type: 'extend',
        axis: 'vertical',
        description: 'Unter Eiffelturm erweitern'
      });
      expect(insertionPoints.vertical).toContainEqual({
        x: 0,
        y: 1,
        type: 'extend',
        axis: 'vertical',
        description: 'Über Eiffelturm erweitern'
      });
    });

    it('should validate axis-specific card placement', () => {
      const horizontalExtension = { x: 1, y: 0, type: 'extend', axis: 'horizontal' };
      const verticalExtension = { x: 0, y: 1, type: 'extend', axis: 'vertical' };
      
      // Valid placements
      expect(insertionService.validateInsertion(testCards.burj, horizontalExtension).valid).toBe(true);
      expect(insertionService.validateInsertion(testCards.burj, verticalExtension).valid).toBe(true);
      
      // Invalid placements (axis restriction)
      expect(insertionService.validateInsertion(testCards.football, verticalExtension).valid).toBe(false);
      expect(insertionService.validateInsertion(testCards.zugspitze, horizontalExtension).valid).toBe(false);
    });
  });

  describe('Multiple Cards Board', () => {
    beforeEach(() => {
      // Create a cross with multiple cards
      gameBoard.placeCard(testCards.eiffel, 0, 0, 'origin');
      gameBoard.placeCard(testCards.burj, 1, 0, 'horizontal');
      gameBoard.placeCard(testCards.zugspitze, 0, 1, 'vertical');
    });

    it('should provide extension points at the ends of axes', () => {
      const insertionPoints = insertionService.calculateInsertionPoints();
      
      // Should have extensions at both ends of each axis
      expect(insertionPoints.horizontal.filter(p => p.type === 'extend')).toHaveLength(2);
      expect(insertionPoints.vertical.filter(p => p.type === 'extend')).toHaveLength(2);
    });

    it('should validate neighbor relationships', () => {
      const rightExtension = { x: 2, y: 0, type: 'extend', axis: 'horizontal' };
      
      // Card that would be valid (smaller than Burj Khalifa's width)
      const validCard = new Card({
        id: 'small',
        name: 'Small Building',
        height: 100,
        width: 50,
        image_url: '/test.jpg'
      });
      
      expect(insertionService.validateInsertion(validCard, rightExtension).valid).toBe(true);
      
      // Card that would be invalid (larger than Burj Khalifa's width)
      const invalidCard = new Card({
        id: 'large',
        name: 'Large Building',
        height: 100,
        width: 200,
        image_url: '/test.jpg'
      });
      
      expect(insertionService.validateInsertion(invalidCard, rightExtension).valid).toBe(false);
    });
  });

  describe('Insertion with Shifting', () => {
    beforeEach(() => {
      // Create a horizontal line with gaps
      gameBoard.placeCard(testCards.eiffel, 0, 0, 'origin');
      gameBoard.placeCard(testCards.burj, 1, 0, 'horizontal');
      gameBoard.placeCard(testCards.football, 2, 0, 'horizontal');
    });

    it('should provide insertion points between consecutive cards', () => {
      const insertionPoints = insertionService.calculateInsertionPoints();
      
      // Should have insertion points between consecutive cards
      const insertionTypes = insertionPoints.horizontal.filter(p => p.type === 'insert');
      expect(insertionTypes.length).toBeGreaterThan(0);
      
      // Should indicate that cards will be shifted
      const shiftingInsertion = insertionTypes.find(p => p.shiftsCards);
      expect(shiftingInsertion).toBeDefined();
    });

    it('should execute insertion with shifting correctly', () => {
      const insertionPoint = {
        x: 2,
        y: 0,
        type: 'insert',
        axis: 'horizontal',
        shiftsCards: true
      };
      
      const newCard = new Card({
        id: 'middle',
        name: 'Middle Building',
        height: 200,
        width: 80,
        image_url: '/test.jpg'
      });
      
      const result = insertionService.executeInsertion(newCard, insertionPoint);
      
      expect(result.valid).toBe(true);
      expect(gameBoard.getCard(2, 0)).toBeDefined();
      expect(gameBoard.getCard(2, 0).card.name).toBe('Middle Building');
      expect(gameBoard.getCard(3, 0)).toBeDefined(); // Football field should be shifted
    });
  });

  describe('Edge Cases', () => {
    it('should handle position already occupied', () => {
      gameBoard.placeCard(testCards.eiffel, 0, 0, 'origin');
      
      const occupiedPoint = { x: 0, y: 0, type: 'origin', axis: 'origin' };
      const result = insertionService.validateInsertion(testCards.burj, occupiedPoint);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('bereits belegt');
    });

    it('should handle cards with null metrics correctly', () => {
      const horizontalPoint = { x: 1, y: 0, type: 'extend', axis: 'horizontal' };
      const verticalPoint = { x: 0, y: 1, type: 'extend', axis: 'vertical' };
      
      // Card with only width should not be placeable on vertical axis
      const widthOnlyResult = insertionService.validateInsertion(testCards.football, verticalPoint);
      expect(widthOnlyResult.valid).toBe(false);
      
      // Card with only height should not be placeable on horizontal axis
      const heightOnlyResult = insertionService.validateInsertion(testCards.zugspitze, horizontalPoint);
      expect(heightOnlyResult.valid).toBe(false);
    });
  });
});
