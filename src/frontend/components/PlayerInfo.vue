<template>
  <div class="player-info">
    <h3>🎮 Spieler</h3>
    <div class="players-list">
      <div v-if="players.length === 0" class="no-players">
        <span>🔄 Warte auf Spieler...</span>
      </div>
      <div v-else>
        <div class="player-count">👥 {{ players.length }} Spieler im Room</div>
        <div v-for="player in players" :key="player.id" class="player" :class="{ 'current': player.id === currentPlayer }">
          <div class="player-info">
            <span class="player-name">{{ player.name }}</span>
            <span class="player-status">{{ gameStatus === 'playing' ? (player.cardsCount || 0) + ' 🎴' : '✓ Bereit' }}</span>
          </div>
          <div class="player-indicator">
            <span v-if="player.id === currentPlayer" class="current-turn">🎯</span>
            <span v-else class="ready">✅</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="game-actions">
      <button 
        v-if="gameStatus === 'waiting'"
        @click="$emit('start-game')"
        :disabled="players.length < 2"
        class="start-button"
        :class="{ 'disabled': players.length < 2 }"
      >
        <span v-if="players.length < 2">🚫 Warte auf mehr Spieler</span>
        <span v-else>🚀 Spiel starten</span>
      </button>
      
      <div v-if="gameStatus === 'playing'" class="game-status">
        <span class="status-indicator playing"></span>
        <span>Spiel läuft</span>
      </div>
      
      <div v-if="gameStatus === 'ended'" class="game-status">
        <span class="status-indicator ended"></span>
        <span>Spiel beendet</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PlayerInfo',
  props: {
    players: { type: Array, default: () => [] },
    currentPlayer: { type: String, default: null },
    gameStatus: { type: String, default: 'waiting' }
  },
  emits: ['start-game']
}
</script>

<style scoped>
.player-info h3 { margin-bottom: 15px; }

.no-players {
  text-align: center;
  padding: 20px;
  color: rgba(255,255,255,0.6);
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
}

.player-count {
  font-size: 0.9rem;
  color: #FFD700;
  margin-bottom: 10px;
  text-align: center;
  font-weight: 600;
}

.player { 
  padding: 12px; 
  margin: 8px 0; 
  background: rgba(255,255,255,0.1); 
  border-radius: 8px; 
  display: flex; 
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
}

.player:hover {
  background: rgba(255,255,255,0.15);
  transform: translateY(-1px);
}

.player.current { 
  background: rgba(255,215,0,0.2); 
  border: 1px solid #FFD700;
  box-shadow: 0 0 10px rgba(255,215,0,0.3);
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.player-name {
  font-weight: 600;
  color: white;
}

.player-status {
  font-size: 0.8rem;
  color: rgba(255,255,255,0.7);
}

.player-indicator {
  display: flex;
  align-items: center;
}

.current-turn {
  animation: bounce 2s infinite;
}

.ready {
  opacity: 0.7;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-3px); }
  60% { transform: translateY(-2px); }
}

.game-actions {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.start-button {
  width: 100%;
  padding: 12px;
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.start-button:hover:not(.disabled) {
  background: linear-gradient(45deg, #45a049, #4CAF50);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.start-button.disabled {
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5);
  cursor: not-allowed;
}

.game-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255,255,255,0.05);
  border-radius: 6px;
  font-size: 0.9rem;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.playing {
  background: #4CAF50;
  animation: pulse 2s infinite;
}

.status-indicator.ended {
  background: #f44336;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
</style>
