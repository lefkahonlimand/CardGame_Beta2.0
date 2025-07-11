import { mount } from '@vue/test-utils';
import GameBoard from '@/frontend/components/GameBoard.vue';

describe('GameBoard.vue', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(GameBoard, {
      propsData: {
        board: {
          '0,0': { id: 'card1', name: 'Eiffel Tower' },
        },
        validMoves: [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
        ],
        selectedCard: { id: 'card2', name: 'Liberty Statue' },
      },
    });
  });

  it('renders board cells correctly', () => {
    expect(wrapper.findAll('.board-cell')).toHaveLength(25);
  });

  it('checks valid move indicators', async () => {
    wrapper.setProps({ validMoves: [{ x: 0, y: 1 }] });
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.valid-indicator')).toHaveLength(1);
  });

  it('emits cell-click event when a board cell is clicked', async () => {
    const cell = wrapper.find('.board-cell');
    await cell.trigger('click');
    expect(wrapper.emitted('cell-click')).toBeTruthy();
  });

  it('correctly associates cards with board positions', () => {
    const card = wrapper.find('.board-card');
    expect(card.exists()).toBe(true);
  });
});

