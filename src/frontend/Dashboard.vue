<template>
  <div class="dashboard-container">
    <!-- Dashboard Header -->
    <header class="dashboard-header glassmorphism">
      <div class="header-content">
        <h1 class="dashboard-title">
          <span class="emoji">🎮</span>
          Card Estimation Game
          <span class="version">Dashboard v2.0</span>
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

    <!-- Main Dashboard Content -->
    <main class="dashboard-main">
      <!-- Player Setup Section -->
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

      <!-- Active Games List -->
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
  setup() {
    // State - PURE DASHBOARD (NO SOCKET.IO)
    const playerName = ref('')
    const sessionName = ref('')
    const maxPlayers = ref(4)
    const isLoading = ref(false)
    const lastUpdated = ref(null)
    const notifications = ref([])
    const sessions = ref([])
    const refreshInterval = ref(null)
    
    const dashboardData = reactive({
      totalActive: 0,
      totalJoinable: 0,
      serverInfo: {}
    })

    // Generate and persist player ID
    let storedPlayerId = localStorage.getItem('gamePlayerId')
    if (!storedPlayerId) {
      storedPlayerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('gamePlayerId', storedPlayerId)
    }
    const playerId = ref(storedPlayerId)

    // Computed
    const canCreateGame = computed(() => {
      return playerName.value.trim().length > 0 && sessionName.value.trim().length > 0
    })

    const canJoinGame = computed(() => {
      return playerName.value.trim().length > 0
    })

    // Methods - PURE REST API CALLS
    const refreshSessions = async () => {
      if (isLoading.value) return

      try {
        isLoading.value = true
        
        const response = await fetch('/api/dashboard/sessions')
        const data = await response.json()
        
        if (data.success) {
          sessions.value = data.sessions
          dashboardData.totalActive = data.totalActive
          dashboardData.totalJoinable = data.totalJoinable
          dashboardData.serverInfo = data.serverInfo
          lastUpdated.value = new Date()
          
          showNotification('Sessions aktualisiert', 'success')
        } else {
          throw new Error(data.error || 'Failed to fetch sessions')
        }
      } catch (error) {
        console.error('Failed to refresh sessions:', error)
        showNotification('Fehler beim Laden der Sessions', 'error')
      } finally {
        isLoading.value = false
      }
    }

    const createGame = async () => {
      if (!canCreateGame.value || isLoading.value) return

      try {
        isLoading.value = true
        
        const response = await fetch('/api/dashboard/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionName: sessionName.value.trim(),
            playerName: playerName.value.trim(),
            playerId: playerId.value,
            maxPlayers: maxPlayers.value
          })
        })
        
        const data = await response.json()
        
        if (data.success) {
          showNotification(`Spiel "${sessionName.value}" erstellt!`, 'success')
          
          // Open game room in new tab/window
          const gameUrl = `http://localhost:5174/game.html?sessionId=${data.session.id}&playerId=${playerId.value}&playerName=${encodeURIComponent(playerName.value)}`
          window.open(gameUrl, '_blank', 'width=1200,height=800')
          
          // Reset form
          sessionName.value = ''
          
          // Refresh sessions list
          await refreshSessions()
        } else {
          throw new Error(data.error || 'Failed to create session')
        }
      } catch (error) {
        console.error('Failed to create game:', error)
        showNotification('Fehler beim Erstellen des Spiels', 'error')
      } finally {
        isLoading.value = false
      }
    }

    const joinGame = async (sessionId) => {
      if (!canJoinGame.value || isLoading.value) return

      try {
        isLoading.value = true
        
        const response = await fetch(`/api/dashboard/sessions/${sessionId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerName: playerName.value.trim(),
            playerId: playerId.value
          })
        })
        
        const data = await response.json()
        
        if (data.success) {
          showNotification(`Session beigetreten als ${playerName.value}!`, 'success')
          
          // Open game room in new tab/window
          const gameUrl = `http://localhost:5174/game.html?sessionId=${sessionId}&playerId=${playerId.value}&playerName=${encodeURIComponent(playerName.value)}`
          window.open(gameUrl, '_blank', 'width=1200,height=800')
          
          // Refresh sessions list
          await refreshSessions()
        } else {
          throw new Error(data.error || 'Failed to join session')
        }
      } catch (error) {
        console.error('Failed to join game:', error)
        showNotification('Fehler beim Beitreten', 'error')
      } finally {
        isLoading.value = false
      }
    }

    const showNotification = (message, type = 'info') => {
      const notification = {
        id: Date.now(),
        message,
        type,
        timestamp: new Date()
      }
      notifications.value.push(notification)
      
      setTimeout(() => {
        notifications.value = notifications.value.filter(n => n.id !== notification.id)
      }, 5000)
    }

    const getStatusText = (status) => {
      const statusMap = {
        waiting: '⏳ Wartet',
        playing: '🎮 Läuft',
        ended: '✅ Beendet'
      }
      return statusMap[status] || status
    }

    const formatTime = (date) => {
      return date.toLocaleTimeString('de-DE')
    }

    // Lifecycle
    onMounted(async () => {
      await refreshSessions()
      
      // Auto-refresh every 10 seconds
      refreshInterval.value = setInterval(refreshSessions, 10000)
    })

    onUnmounted(() => {
      if (refreshInterval.value) {
        clearInterval(refreshInterval.value)
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
      refreshSessions,
      createGame,
      joinGame,
      getStatusText,
      formatTime
    }
  }
}
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.glassmorphism {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
}

.dashboard-header {
  margin-bottom: 30px;
  padding: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.dashboard-title {
  color: white;
  font-size: 2.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 15px;
  margin: 0;
}

.version {
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.2);
  padding: 5px 10px;
  border-radius: 20px;
}

.server-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  color: white;
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.9rem;
  opacity: 0.8;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
}

.dashboard-main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 30px;
}

.player-setup,
.create-game {
  padding: 25px;
  color: white;
}

.active-games {
  grid-column: 1 / -1;
  padding: 25px;
  color: white;
}

.setup-form,
.create-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.input-group input,
.input-group select {
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
}

.input-group input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.player-id-info {
  font-size: 0.8rem;
  opacity: 0.7;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
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

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-success {
  background: linear-gradient(45deg, #2196F3, #1976D2);
  color: white;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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
}

.last-updated {
  font-size: 0.9rem;
  opacity: 0.7;
}

.no-games {
  text-align: center;
  padding: 60px 20px;
  opacity: 0.8;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.game-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: transform 0.3s ease;
}

.game-card:hover {
  transform: translateY(-5px);
}

.game-card.joinable {
  border-color: #4CAF50;
}

.game-card.full {
  opacity: 0.7;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.game-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.game-status {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  background: rgba(255, 255, 255, 0.2);
}

.game-status.waiting {
  background: rgba(255, 193, 7, 0.3);
}

.game-status.playing {
  background: rgba(76, 175, 80, 0.3);
}

.game-info {
  margin-bottom: 15px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.icon {
  font-size: 1.1rem;
}

.game-actions {
  display: flex;
  gap: 10px;
}

.notifications {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.notification {
  padding: 12px 20px;
  border-radius: 8px;
  margin-bottom: 10px;
  color: white;
  font-weight: 500;
  animation: slideIn 0.3s ease;
}

.notification.success {
  background: rgba(76, 175, 80, 0.9);
}

.notification.error {
  background: rgba(244, 67, 54, 0.9);
}

.notification.info {
  background: rgba(33, 150, 243, 0.9);
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
  
  .games-grid {
    grid-template-columns: 1fr;
  }
}
</style>
