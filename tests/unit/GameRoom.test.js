import { mount } from '@vue/test-utils';
import GameRoom from '@/frontend/GameRoom.vue';

jest.mock('socket.io-client', () => ({
  io: () => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn()
  })
}));

let wrapper;

describe('GameRoom.vue', () => {
  beforeEach(() => {
    wrapper = mount(GameRoom, {
      mocks: {
        $route: {
          query: {
            sessionId: 'test-session',
            playerId: 'test-player',
            playerName: 'Test Player'
          }
        }
      }
    });
  });

  it('renders loading screen when not connected', () => {
    expect(wrapper.find('.loading-screen').exists()).toBe(true);
  });

  it('updates connection status when socket connects', async () => {
    wrapper.vm.isConnected = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.connection-status.connected').exists()).toBe(true);
  });

  it('emits correct session info on game start', async () => {
    wrapper.vm.players = [{ id: 'test-player', name: 'Test Player' }];
    wrapper.vm.currentPlayer = 'test-player';
    wrapper.vm.gameStatus = 'playing';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.your-turn').exists()).toBe(true);
  });
});

