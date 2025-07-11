<template>
  <div class="game-dashboard">
    <!-- Header -->
    <header class="dashboard-header glassmorphism">
      <div class="header-content">
        <h1 class="dashboard-title">
          <span class="emoji">🎮</span>
          Card Estimation Game
          <span class="version">Dashboard</span>
        </h1>
        <div class="server-stats">
          <div class="stat-item">
            <span class="stat-label">Aktive Spiele:</span>
            <span class="stat-value">{{ dashboardData.totalActive || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Beitretbar:</span>
            <span class="stat-value">{{ dashboardData.totalJoinable || 0 }}</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="dashboard-main">
      <!-- Player Setup -->
      <section class="player-setup glassmorphism">
        <h2>🎭 Spieler Setup</h2>
        <div class="setup-form">
          <div class="input-group">
            <label for="playerName">Dein Name:</label>
            <input 
              id="playerName"
              v-model="playerName" 
              type="text" 
              placeholder="Gib deinen Namen ein"
              @keyup.enter="createGame"
              :disabled="isLoading"
            >
          </div>
          <div class="player-id-info">
            <small>Spieler ID: {{ playerId }}</small>
          </div>
        </div>
      </section>

      <!-- Create Game Section -->
      <section class="create-game glassmorphism">
        <h2>🎯 Neues Spiel erstellen</h2>
        <div class="create-form">
          <div class="input-group">
            <label for="sessionName">Spielname:</label>
            <input 
              id="sessionName"
              v-model="sessionName" 
              type="text" 
              placeholder="Gib dem Spiel einen Namen"
              @keyup.enter="createGame"
              :disabled="isLoading"
            >
          </div>
          <div class="input-group">
            <label for="maxPlayers">Max. Spieler:</label>
            <select id="maxPlayers" v-model="maxPlayers" :disabled="isLoading">
              <option value="2">2 Spieler</option>
              <option value="4">4 Spieler</option>
              <option value="6">6 Spieler</option>
              <option value="8">8 Spieler</option>
            </select>
          </div>
          <button 
            @click="createGame" 
            :disabled="!canCreateGame || isLoading"
            class="btn btn-primary"
          >
            {{ isLoading ? 'Erstelle...' : '🎮 Spiel erstellen' }}
          </button>
        </div>
      </section>

      <!-- Active Games -->
      <section class="active-games glassmorphism">
        <h2>🎲 Aktive Spiele</h2>
        <div class="games-header">
          <button @click="refreshSessions" :disabled="isLoading" class="btn btn-secondary">
            {{ isLoading ? 'Lädt...' : '🔄 Aktualisieren' }}
          </button>
          <span class="last-updated">
            {{ lastUpdated ? `Zuletzt aktualisiert: ${formatTime(lastUpdated)}` : '' }}
          </span>
        </div>
        
        <div class="games-list">
          <div v-if="sessions.length === 0" class="no-games">
            <p>🎭 Keine aktiven Spiele gefunden</p>
            <p>Erstelle ein neues Spiel, um zu beginnen!</p>
          </div>
          
          <div v-else class="games-grid">
            <div 
              v-for="session in sessions" 
              :key="session.id"
              class="game-card"
              :class="{ 'joinable': session.isJoinable, 'full': !session.isJoinable }"
            >
              <div class="game-header">
                <h3>{{ session.name || `Spiel ${session.id.slice(-8)}` }}</h3>
                <span class="game-status" :class="session.status">
                  {{ getStatusText(session.status) }}
                </span>
              </div>
              
              <div class="game-info">
                <div class="info-row">
                  <span class="icon">👥</span>
                  <span>{{ session.playerCount }}/{{ session.maxPlayers }} Spieler</span>
                </div>
                <div class="info-row">
                  <span class="icon">🎯</span>
                  <span>{{ session.gameType }}</span>
                </div>
                <div class="info-row">
                  <span class="icon">⏱️</span>
                  <span>{{ session.estimatedDuration }}</span>
                </div>
                <div class="info-row">
                  <span class="icon">👑</span>
                  <span>{{ session.createdBy || 'Unbekannt' }}</span>
                </div>
              </div>
              
              <div class="game-actions">
                <button 
                  v-if="session.isJoinable"
                  @click="joinGame(session.id)"
                  :disabled="!canJoinGame || isLoading"
                  class="btn btn-success"
                >
                  {{ isLoading ? 'Trete bei...' : '🚀 Beitreten' }}
                </button>
                <button 
                  v-else
                  disabled
                  class="btn btn-disabled"
                >
                  {{ session.status === 'playing' ? '🎮 Spiel läuft' : '🚫 Voll' }}
                </button>
                <button 
                  @click="viewGameDetails(session.id)"
                  class="btn btn-info"
                >
                  👁️ Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Notifications -->
    <div class="notifications">
      <div 
        v-for="notification in notifications" 
        :key="notification.id"
        class="notification"
        :class="notification.type"
      >
        {{ notification.message }}
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

export default {
  name: 'GameDashboard',
  emits: ['join-game', 'game-created'],
  setup(props, { emit }) {
    // Reactive state
    const playerName = ref('')
    const sessionName = ref('')
    const maxPlayers = ref(4)
    const isLoading = ref(false)
    const lastUpdated = ref(null)
    const notifications = ref([])
    const sessions = ref([])
    const dashboardData = reactive({
      totalActive: 0,
      totalJoinable: 0,
      serverInfo: {}
    })

    // Generate unique player ID and store persistently
    let storedPlayerId = localStorage.getItem('gamePlayerId')
    if (!storedPlayerId) {
      storedPlayerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('gamePlayerId', storedPlayerId)
    }
    const playerId = ref(storedPlayerId)

    // Computed properties
    const canCreateGame = computed(() => {
      return playerName.value.trim().length > 0 && 
             sessionName.value.trim().length > 0 && 
             !isLoading.value
    })

    const canJoinGame = computed(() => {
      return playerName.value.trim().length > 0 && !isLoading.value
    })

    // Auto-refresh interval
    let refreshInterval = null

    // Methods
    const showNotification = (message, type = 'info') => {
      const notification = {
        id: Date.now(),
        message,
        type
      }
      notifications.value.push(notification)
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        const index = notifications.value.findIndex(n => n.id === notification.id)
        if (index > -1) {
          notifications.value.splice(index, 1)
        }
      }, 5000)
    }

    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString()
    }

    const getStatusText = (status) => {
      switch (status) {
        case 'waiting': return '⏳ Wartet'
        case 'playing': return '🎮 Spielt'
        case 'ended': return '✅ Beendet'
        default: return '❓ Unbekannt'
      }
    }

    const refreshSessions = async () => {
      if (isLoading.value) return
      
      isLoading.value = true
      try {
        const response = await fetch('/api/dashboard/sessions')
        const data = await response.json()
        
        if (data.success) {
          sessions.value = data.sessions
          dashboardData.totalActive = data.totalActive
          dashboardData.totalJoinable = data.totalJoinable
          dashboardData.serverInfo = data.serverInfo
          lastUpdated.value = Date.now()
        } else {
          showNotification('Fehler beim Laden der Spiele: ' + data.error, 'error')
        }
      } catch (error) {
        showNotification('Netzwerkfehler beim Laden der Spiele', 'error')
      } finally {
        isLoading.value = false
      }
    }

    const createGame = async () => {
      if (!canCreateGame.value) return
      
      isLoading.value = true
      try {
        const response = await fetch('/api/dashboard/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionName: sessionName.value.trim(),
            playerName: playerName.value.trim(),
            playerId: playerId.value,
            maxPlayers: maxPlayers.value
          })
        })
        
        const data = await response.json()
        
        if (data.success) {
          showNotification(`Spiel "${sessionName.value}" erfolgreich erstellt!`, 'success')
          emit('game-created', data.session)
          emit('join-game', data.session.id)
          
          // Reset form
          sessionName.value = ''
          
          // Refresh sessions
          await refreshSessions()
        } else {
          showNotification('Fehler beim Erstellen des Spiels: ' + data.error, 'error')
        }
      } catch (error) {
        showNotification('Netzwerkfehler beim Erstellen des Spiels', 'error')
      } finally {
        isLoading.value = false
      }
    }

    const joinGame = async (sessionId) => {
      if (!canJoinGame.value) return
      
      isLoading.value = true
      try {
        const response = await fetch(`/api/dashboard/sessions/${sessionId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            playerName: playerName.value.trim(),
            playerId: playerId.value
          })
        })
        
        const data = await response.json()
        
        if (data.success) {
          showNotification(`Erfolgreich dem Spiel beigetreten!`, 'success')
          emit('join-game', sessionId)
          
          // Refresh sessions
          await refreshSessions()
        } else {
          showNotification('Fehler beim Beitreten: ' + data.error, 'error')
        }
      } catch (error) {
        showNotification('Netzwerkfehler beim Beitreten', 'error')
      } finally {
        isLoading.value = false
      }
    }

    const viewGameDetails = async (sessionId) => {
      // TODO: Implement game details modal
      showNotification('Details-Ansicht wird noch implementiert', 'info')
    }

    // Lifecycle
    onMounted(() => {
      // Initial load
      refreshSessions()
      
      // Set up auto-refresh every 10 seconds
      refreshInterval = setInterval(refreshSessions, 10000)
    })

    onUnmounted(() => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    })

    return {
      // State
      playerName,
      sessionName,
      maxPlayers,
      isLoading,
      lastUpdated,
      notifications,
      sessions,
      dashboardData,
      playerId,
      
      // Computed
      canCreateGame,
      canJoinGame,
      
      // Methods
      showNotification,
      formatTime,
      getStatusText,
      refreshSessions,
      createGame,
      joinGame,
      viewGameDetails
    }
  }
}
</script>

<style scoped>
.game-dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.dashboard-header {
  margin-bottom: 30px;
  padding: 20px;
  border-radius: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.dashboard-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  margin: 0;
}

.dashboard-title .emoji {
  font-size: 3rem;
  margin-right: 15px;
}

.dashboard-title .version {
  font-size: 1rem;
  background: rgba(255,255,255,0.2);
  padding: 4px 12px;
  border-radius: 20px;
  margin-left: 15px;
}

.server-stats {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 15px;
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  min-width: 100px;
}

.stat-label {
  font-size: 0.9rem;
  color: rgba(255,255,255,0.8);
  margin-bottom: 5px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
}

.dashboard-main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 30px;
}

.active-games {
  grid-column: 1 / -1;
}

.glassmorphism {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 25px;
}

.glassmorphism h2 {
  color: white;
  font-size: 1.8rem;
  margin-bottom: 20px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.setup-form, .create-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.input-group label {
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
}

.input-group input, .input-group select {
  padding: 12px 15px;
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 12px;
  background: rgba(255,255,255,0.1);
  color: white;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.input-group input:focus, .input-group select:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 3px rgba(76,175,80,0.1);
}

.input-group input::placeholder {
  color: rgba(255,255,255,0.6);
}

.player-id-info {
  color: rgba(255,255,255,0.7);
  font-size: 0.8rem;
  margin-top: 5px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary {
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(45deg, #45a049, #4CAF50);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76,175,80,0.3);
}

.btn-secondary {
  background: linear-gradient(45deg, #2196F3, #1976D2);
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: linear-gradient(45deg, #1976D2, #2196F3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(33,150,243,0.3);
}

.btn-success {
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: linear-gradient(45deg, #45a049, #4CAF50);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76,175,80,0.3);
}

.btn-info {
  background: linear-gradient(45deg, #17a2b8, #138496);
  color: white;
}

.btn-info:hover:not(:disabled) {
  background: linear-gradient(45deg, #138496, #17a2b8);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(23,162,184,0.3);
}

.btn-disabled {
  background: rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.6);
  cursor: not-allowed;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.games-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.last-updated {
  color: rgba(255,255,255,0.7);
  font-size: 0.9rem;
}

.no-games {
  text-align: center;
  color: rgba(255,255,255,0.8);
  padding: 40px;
}

.no-games p {
  font-size: 1.2rem;
  margin: 10px 0;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.game-card {
  background: rgba(255,255,255,0.1);
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 15px;
  padding: 20px;
  transition: all 0.3s ease;
}

.game-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.2);
}

.game-card.joinable {
  border-color: #4CAF50;
}

.game-card.full {
  border-color: #f44336;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.game-header h3 {
  color: white;
  margin: 0;
  font-size: 1.3rem;
}

.game-status {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.game-status.waiting {
  background: rgba(255,193,7,0.2);
  color: #FFC107;
}

.game-status.playing {
  background: rgba(76,175,80,0.2);
  color: #4CAF50;
}

.game-status.ended {
  background: rgba(158,158,158,0.2);
  color: #9E9E9E;
}

.game-info {
  margin-bottom: 15px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  color: rgba(255,255,255,0.9);
  font-size: 0.9rem;
}

.info-row .icon {
  width: 20px;
  text-align: center;
}

.game-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.game-actions .btn {
  flex: 1;
  min-width: 120px;
}

.notifications {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 350px;
}

.notification {
  padding: 15px 20px;
  border-radius: 12px;
  color: white;
  font-weight: 500;
  animation: slideIn 0.3s ease;
}

.notification.success {
  background: linear-gradient(45deg, #4CAF50, #45a049);
}

.notification.error {
  background: linear-gradient(45deg, #f44336, #d32f2f);
}

.notification.info {
  background: linear-gradient(45deg, #2196F3, #1976D2);
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .dashboard-main {
    grid-template-columns: 1fr;
  }
  
  .header-content {
    flex-direction: column;
    text-align: center;
  }
  
  .dashboard-title {
    font-size: 2rem;
  }
  
  .games-grid {
    grid-template-columns: 1fr;
  }
  
  .game-actions {
    flex-direction: column;
  }
  
  .game-actions .btn {
    min-width: auto;
  }
}
</style>
