import { mount } from '@vue/test-utils';
import GameCard from '@/frontend/components/GameCard.vue';

describe('GameCard.vue', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(GameCard, {
      propsData: {
        card: { id: 'card1', name: 'Eiffel Tower' },
      },
    });
  });

  it('renders card details', () => {
    expect(wrapper.find('.card-name').text()).toContain('Eiffel Tower');
  });

  it('emits click event when card is clicked', async () => {
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
  });

  it('handles dragstart correctly', async () => {
    const event = { dataTransfer: { setData: jest.fn() } };
    await wrapper.trigger('dragstart', event);
    expect(event.dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'card1');
  });
});

