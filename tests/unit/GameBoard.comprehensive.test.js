/**
 * Comprehensive Unit Tests for GameBoard Component
 * Focus on rendering issues and edge cases
 */

import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import GameBoard from '../../src/frontend/components/GameBoard.vue';

describe('GameBoard.vue - Rendering Issues', () => {
  let wrapper;
  
  const createWrapper = (props = {}) => {
    const defaultProps = {
      board: {},
      validMoves: [],
      selectedCard: null
    };
    
    return mount(GameBoard, {
      props: { ...defaultProps, ...props },
      global: {
        components: {
          GameCard: {
            template: '<div class="mock-game-card">{{ card.name }}</div>',
            props: ['card', 'isOnBoard']
          }
        }
      }
    });
  };

  beforeEach(() => {
    wrapper = createWrapper();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Board Cell Generation', () => {
    it('should generate exactly 25 cells (5x5 grid)', () => {
      const cells = wrapper.findAll('.board-cell');
      expect(cells).toHaveLength(25);
    });

    it('should calculate cell positions correctly', () => {
      const { boardCells } = wrapper.vm;
      
      // Check center cell
      const centerCell = boardCells.find(cell => cell.x === 0 && cell.y === 0);
      expect(centerCell).toBeDefined();
      expect(centerCell.key).toBe('0,0');
      
      // Check corner cells
      const topLeft = boardCells.find(cell => cell.x === -2 && cell.y === 2);
      const bottomRight = boardCells.find(cell => cell.x === 2 && cell.y === -2);
      expect(topLeft).toBeDefined();
      expect(bottomRight).toBeDefined();
    });

    it('should apply correct CSS positioning', () => {
      const { boardCells } = wrapper.vm;
      
      // Check if left and top values are strings with 'px' unit
      boardCells.forEach(cell => {
        expect(cell.left).toMatch(/\d+px/);
        expect(cell.top).toMatch(/\d+px/);
      });
    });
  });

  describe('Card Rendering Logic', () => {
    it('should correctly identify cells with cards', async () => {
      const boardWithCards = {
        '0,0': { id: 'card1', name: 'Eiffel Tower', height: 330, width: 125 },
        '1,0': { id: 'card2', name: 'Burj Khalifa', height: 828, width: 39 }
      };
      
      wrapper = createWrapper({ board: boardWithCards });
      await nextTick();
      
      expect(wrapper.vm.hasCard({ x: 0, y: 0 })).toBe(true);
      expect(wrapper.vm.hasCard({ x: 1, y: 0 })).toBe(true);
      expect(wrapper.vm.hasCard({ x: 0, y: 1 })).toBe(false);
    });

    it('should retrieve correct card data', async () => {
      const testCard = { id: 'card1', name: 'Eiffel Tower', height: 330, width: 125 };
      const boardWithCards = { '0,0': testCard };
      
      wrapper = createWrapper({ board: boardWithCards });
      await nextTick();
      
      const retrievedCard = wrapper.vm.getCard({ x: 0, y: 0 });
      expect(retrievedCard).toEqual(testCard);
    });

    it('should render GameCard components for occupied cells', async () => {
      const boardWithCards = {
        '0,0': { id: 'card1', name: 'Eiffel Tower', height: 330, width: 125 }
      };
      
      wrapper = createWrapper({ board: boardWithCards });
      await nextTick();
      
      const gameCards = wrapper.findAll('.mock-game-card');
      expect(gameCards).toHaveLength(1);
      expect(gameCards[0].text()).toBe('Eiffel Tower');
    });
  });

  describe('Valid Move Indicators', () => {
    it('should correctly identify valid moves', async () => {
      const validMoves = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 }
      ];
      
      wrapper = createWrapper({ validMoves });
      await nextTick();
      
      expect(wrapper.vm.isValidMove({ x: 1, y: 0 })).toBe(true);
      expect(wrapper.vm.isValidMove({ x: -1, y: 0 })).toBe(true);
      expect(wrapper.vm.isValidMove({ x: 0, y: 1 })).toBe(true);
      expect(wrapper.vm.isValidMove({ x: 0, y: -1 })).toBe(false);
    });

    it('should render valid move indicators', async () => {
      const validMoves = [{ x: 1, y: 0 }];
      
      wrapper = createWrapper({ validMoves });
      await nextTick();
      
      const indicators = wrapper.findAll('.valid-indicator');
      expect(indicators).toHaveLength(1);
      
      const pulseElements = wrapper.findAll('.pulse-dot');
      expect(pulseElements).toHaveLength(1);
    });
  });

  describe('CSS Classes Application', () => {
    it('should apply center class to center cell', () => {
      const centerCell = wrapper.find('.board-cell.center');
      expect(centerCell.exists()).toBe(true);
      expect(centerCell.find('.center-label').exists()).toBe(true);
      expect(centerCell.find('.center-label').text()).toBe('START');
    });

    it('should apply valid-drop class to valid move cells', async () => {
      const validMoves = [{ x: 1, y: 0 }];
      
      wrapper = createWrapper({ validMoves });
      await nextTick();
      
      const validDropCells = wrapper.findAll('.board-cell.valid-drop');
      expect(validDropCells).toHaveLength(1);
    });

    it('should apply has-card class to occupied cells', async () => {
      const boardWithCards = {
        '0,0': { id: 'card1', name: 'Eiffel Tower', height: 330, width: 125 }
      };
      
      wrapper = createWrapper({ board: boardWithCards });
      await nextTick();
      
      const hasCardCells = wrapper.findAll('.board-cell.has-card');
      expect(hasCardCells).toHaveLength(1);
    });
  });

  describe('Event Handling', () => {
    it('should emit cell-click event with correct cell data', async () => {
      const cells = wrapper.findAll('.board-cell');
      const centerCell = cells.find(cell => 
        cell.attributes('style')?.includes('250px') // Center position
      );
      
      await centerCell.trigger('click');
      
      expect(wrapper.emitted('cell-click')).toBeTruthy();
      expect(wrapper.emitted('cell-click')[0]).toHaveLength(1);
      expect(wrapper.emitted('cell-click')[0][0]).toMatchObject({
        x: 0,
        y: 0,
        key: '0,0'
      });
    });

    it('should handle drag-over and drop events', async () => {
      const cells = wrapper.findAll('.board-cell');
      const testCell = cells[0];
      
      // Test dragover
      await testCell.trigger('dragover');
      expect(wrapper.emitted('cell-click')).toBeFalsy(); // dragover should not emit click
      
      // Test drop
      const mockEvent = { dataTransfer: { getData: jest.fn() } };
      await testCell.trigger('drop', mockEvent);
      
      expect(wrapper.emitted('card-drop')).toBeTruthy();
      expect(wrapper.emitted('card-drop')[0]).toHaveLength(2); // event and cell
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle empty board gracefully', () => {
      wrapper = createWrapper({ board: {} });
      
      const cells = wrapper.findAll('.board-cell');
      expect(cells).toHaveLength(25);
      
      const gameCards = wrapper.findAll('.mock-game-card');
      expect(gameCards).toHaveLength(0);
    });

    it('should handle null/undefined props gracefully', () => {
      wrapper = createWrapper({
        board: null,
        validMoves: null,
        selectedCard: null
      });
      
      expect(() => {
        wrapper.vm.hasCard({ x: 0, y: 0 });
        wrapper.vm.isValidMove({ x: 0, y: 0 });
      }).not.toThrow();
    });

    it('should handle large board data efficiently', async () => {
      const largeBoard = {};
      for (let x = -2; x <= 2; x++) {
        for (let y = -2; y <= 2; y++) {
          largeBoard[`${x},${y}`] = {
            id: `card-${x}-${y}`,
            name: `Card ${x},${y}`,
            height: 100,
            width: 100
          };
        }
      }
      
      wrapper = createWrapper({ board: largeBoard });
      await nextTick();
      
      const gameCards = wrapper.findAll('.mock-game-card');
      expect(gameCards).toHaveLength(25);
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle rapid prop changes', async () => {
      const initialBoard = { '0,0': { id: 'card1', name: 'Card 1' } };
      const updatedBoard = { '1,0': { id: 'card2', name: 'Card 2' } };
      
      wrapper = createWrapper({ board: initialBoard });
      await nextTick();
      
      // Rapid updates
      await wrapper.setProps({ board: updatedBoard });
      await wrapper.setProps({ board: initialBoard });
      await wrapper.setProps({ board: updatedBoard });
      
      expect(wrapper.findAll('.mock-game-card')).toHaveLength(1);
    });

    it('should handle invalid cell coordinates gracefully', () => {
      expect(() => {
        wrapper.vm.hasCard({ x: 'invalid', y: 'invalid' });
        wrapper.vm.getCard({ x: null, y: undefined });
        wrapper.vm.isValidMove({ x: 999, y: -999 });
      }).not.toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should clean up computed properties on unmount', () => {
      const initialCellCount = wrapper.vm.boardCells.length;
      expect(initialCellCount).toBe(25);
      
      wrapper.unmount();
      
      // After unmount, component should be cleaned up
      expect(wrapper.vm).toBeUndefined();
    });
  });
});
