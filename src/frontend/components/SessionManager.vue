<template>
  <div class="session-info-panel">
    <!-- Current Session Info -->
    <div v-if="currentSessionId" class="current-session">
      <div class="session-header">
        <h3>🎮 Session Info</h3>
      </div>
      
      <div class="session-details">
        <div class="detail-row">
          <span class="label">Room ID:</span>
          <span class="value session-id">{{ currentSessionId.substring(0, 8) }}...</span>
          <button @click="copySessionId" class="copy-btn" title="ID kopieren">
            📋
          </button>
        </div>
        
        <div class="detail-row">
          <span class="label">Status:</span>
          <span class="value session-status" :class="gameStatus">{{ statusText }}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">Spieler:</span>
          <span class="value">{{ playerCount || 0 }}/{{ maxPlayers || 8 }}</span>
        </div>
      </div>
      
      <!-- Admin Controls (nur für Spiel-Admin) -->
      <div v-if="isAdmin && gameStatus === 'waiting'" class="admin-controls">
        <button 
          @click="startGame" 
          :disabled="!canStartGame"
          class="start-game-btn"
        >
          🚀 Spiel starten
        </button>
      </div>
      
      <div v-if="gameStatus === 'ended'" class="game-ended">
        <button @click="restartGame" class="restart-btn">
          🔄 Neues Spiel
        </button>
      </div>
    </div>
    
    <!-- No Session - redirect to dashboard -->
    <div v-else class="no-session">
      <p>Nicht in einem Spiel</p>
      <button @click="returnToDashboard" class="dashboard-btn">
        🏠 Zum Dashboard
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, inject } from 'vue'

export default {
  name: 'SessionManager',
  props: {
    currentSessionId: { type: String, default: null },
    gameStatus: { type: String, default: 'waiting' },
    players: { type: Array, default: () => [] },
    currentPlayer: { type: String, default: null }
  },
  emits: ['start-game'],
  setup(props, { emit }) {
    // Get player ID from localStorage (synchronized with Dashboard)
    const playerId = ref(localStorage.getItem('gamePlayerId') || null)
    
    const statusText = computed(() => {
      switch (props.gameStatus) {
        case 'waiting': return '⏳ Wartet auf Spieler'
        case 'playing': return '🎮 Spiel läuft'
        case 'ended': return '✅ Spiel beendet'
        default: return '❓ Unbekannt'
      }
    })
    
    const playerCount = computed(() => props.players.length)
    const maxPlayers = computed(() => 8) // Could be dynamic from session metadata
    
    // Check if current user is session admin (first player who created it)
    const isAdmin = computed(() => {
      return props.players.length > 0 && props.players[0]?.id === playerId.value
    })
    
    const canStartGame = computed(() => {
      return isAdmin.value && 
             props.gameStatus === 'waiting' && 
             props.players.length >= 2
    })
    
    const copySessionId = async () => {
      if (props.currentSessionId) {
        try {
          await navigator.clipboard.writeText(props.currentSessionId)
          // TODO: Show success notification
        } catch (error) {
          console.error('Failed to copy session ID:', error)
        }
      }
    }
    
    const startGame = () => {
      if (canStartGame.value) {
        emit('start-game')
      }
    }
    
    const restartGame = () => {
      // TODO: Implement restart functionality
      console.log('Restart game requested')
    }
    
    const returnToDashboard = () => {
      // Emit to parent to switch to dashboard view
      emit('return-to-dashboard')
    }
    
    return {
      statusText,
      playerCount,
      maxPlayers,
      isAdmin,
      canStartGame,
      copySessionId,
      startGame,
      restartGame,
      returnToDashboard
    }
  }
}
</script>

<style scoped>
.session-info-panel {
  margin-bottom: 20px;
}

.session-header h3 {
  margin: 0 0 15px 0;
  font-size: 1.1rem;
  color: white;
  font-weight: 600;
}

.current-session {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
}

.session-details {
  margin-bottom: 15px;
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 4px 0;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.value {
  font-size: 0.9rem;
  color: white;
  font-weight: 600;
}

.session-id {
  font-family: 'Courier New', monospace;
  background: rgba(255, 215, 0, 0.1);
  color: #FFD700;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.copy-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  margin-left: 8px;
}

.copy-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.session-status {
  font-size: 0.8rem;
  padding: 3px 8px;
  border-radius: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.session-status.waiting {
  background: rgba(255, 193, 7, 0.2);
  color: #FFC107;
  border: 1px solid rgba(255, 193, 7, 0.3);
}

.session-status.playing {
  background: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.session-status.ended {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.admin-controls {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 15px;
  margin-top: 15px;
}

.start-game-btn {
  width: 100%;
  background: linear-gradient(45deg, #4CAF50, #45a049);
  border: none;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
}

.start-game-btn:hover:not(:disabled) {
  background: linear-gradient(45deg, #45a049, #4CAF50);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.3);
}

.start-game-btn:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.4);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.game-ended {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 15px;
  margin-top: 15px;
}

.restart-btn {
  width: 100%;
  background: linear-gradient(45deg, #FF9800, #F57C00);
  border: none;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.restart-btn:hover {
  background: linear-gradient(45deg, #F57C00, #FF9800);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(255, 152, 0, 0.3);
}

.no-session {
  text-align: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.no-session p {
  margin: 0 0 15px 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.dashboard-btn {
  background: linear-gradient(45deg, #2196F3, #1976D2);
  border: none;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.dashboard-btn:hover {
  background: linear-gradient(45deg, #1976D2, #2196F3);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(33, 150, 243, 0.3);
}

.session-actions {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.join-section,
.create-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 15px;
}

.join-form,
.create-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.session-input {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 8px 12px;
  color: white;
  font-size: 0.9rem;
}

.session-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.session-input:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.join-button,
.create-button {
  background: linear-gradient(45deg, #2196F3, #21CBF3);
  border: none;
  color: white;
  padding: 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.create-button {
  background: linear-gradient(45deg, #4CAF50, #45a049);
}

.join-button:hover:not(:disabled),
.create-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

.create-button:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.join-button:disabled,
.create-button:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  cursor: not-allowed;
  transform: none;
}

.session-list {
  margin-top: 15px;
}

.no-sessions {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.sessions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.session-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.session-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.session-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.session-short-id {
  font-family: monospace;
  font-size: 0.8rem;
  color: #FFD700;
}

.player-count {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
}

.quick-join-button {
  background: rgba(33, 150, 243, 0.2);
  border: 1px solid #2196F3;
  color: #2196F3;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.3s ease;
}

.quick-join-button:hover {
  background: rgba(33, 150, 243, 0.3);
  color: white;
}

.refresh-button {
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.refresh-button:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
