<template>
  <div class="game-room-container">
    <!-- Connection Status Bar -->
    <div class="connection-status" :class="{ 'connected': isConnected, 'disconnected': !isConnected }">
      <div class="status-indicator"></div>
      <span class="status-text">{{ connectionStatusText }}</span>
      <div class="session-info">
        <span>Session: {{ sessionId?.slice(-8) || 'N/A' }}</span>
        <span>Player: {{ playerName }}</span>
      </div>
    </div>

    <!-- Loading Screen -->
    <div v-if="!isConnected" class="loading-screen">
      <div class="loading-spinner"></div>
      <h2>Verbinde mit Spiel...</h2>
      <p>Session: {{ sessionId?.slice(-8) }}</p>
      <p>Spieler: {{ playerName }}</p>
    </div>

    <!-- Game Layout -->
    <div v-else class="game-layout">
      <!-- Sidebar -->
      <aside class="game-sidebar glassmorphism">
        <!-- Game Header -->
        <div class="sidebar-header">
          <h1 class="game-title">🎴 Card Game</h1>
          <button @click="returnToDashboard" class="dashboard-btn">
            🏠 Dashboard
          </button>
        </div>

        <!-- Session Info -->
        <div class="session-section">
          <h3>🎯 Session Info</h3>
          <div class="session-details">
            <div class="detail-row">
              <span>Status:</span>
              <span class="status-badge" :class="gameStatus">{{ getStatusText(gameStatus) }}</span>
            </div>
            <div class="detail-row">
              <span>Spieler:</span>
              <span>{{ players.length }}/8</span>
            </div>
            <div class="detail-row" v-if="currentPlayer">
              <span>Am Zug:</span>
              <span>{{ getCurrentPlayerName() }}</span>
            </div>
          </div>
          
          <!-- Start Game Button -->
          <button 
            v-if="gameStatus === 'waiting' && players.length >= 2"
            @click="startGame"
            :disabled="isLoading"
            class="btn btn-primary start-btn"
          >
            {{ isLoading ? 'Startet...' : '🚀 Spiel starten' }}
          </button>
          
          <div v-else-if="gameStatus === 'waiting'" class="waiting-message">
            ⏳ Warten auf mehr Spieler (min. 2)
          </div>
        </div>

        <!-- Players List -->
        <div class="players-section">
          <h3>👥 Spieler</h3>
          <div class="players-list">
            <div 
              v-for="player in players" 
              :key="player.id"
              class="player-item"
              :class="{ 
                'current-player': player.id === currentPlayer,
                'my-player': player.id === playerId 
              }"
            >
              <div class="player-avatar">{{ getPlayerInitials(player.name) }}</div>
              <div class="player-info">
                <div class="player-name">{{ player.name }}</div>
                <div class="player-status">
                  <span v-if="player.id === currentPlayer">🎯 Am Zug</span>
                  <span v-else-if="player.id === playerId">👤 Du</span>
                  <span v-else>⏳ Wartet</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Game Stats -->
        <div class="stats-section">
          <h3>📊 Statistiken</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Session:</span>
              <span class="stat-value">{{ sessionId?.slice(-8) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Status:</span>
              <span class="stat-value">{{ gameStatus }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Spieler:</span>
              <span class="stat-value">{{ players.length }}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Game Area -->
      <main class="game-main">
        <!-- Game Board Section -->
        <section class="game-board-section glassmorphism">
          <div class="board-header">
            <h2>🎮 Spielbrett</h2>
            <div v-if="gameStatus === 'playing'" class="turn-info">
              <span class="current-turn">Am Zug: {{ getCurrentPlayerName() }}</span>
              <span v-if="currentPlayer === playerId" class="your-turn">🎯 Du bist dran!</span>
            </div>
          </div>
          
          <!-- Waiting State -->
          <div v-if="gameStatus === 'waiting'" class="game-waiting">
            <div class="waiting-content">
              <div class="waiting-icon">⏳</div>
              <h3>Warten auf Spielstart...</h3>
              <p>Spieler: {{ players.length }}/8</p>
              <p>Mindestens 2 Spieler benötigt</p>
            </div>
          </div>
          
          <!-- Playing State - Game Board -->
          <div v-else-if="gameStatus === 'playing'" class="game-board">
            <GameBoard 
              :board="gameBoard"
              :validMoves="validMovesArray"
              :selectedCard="selectedCard"
              @cell-click="handleCellClick"
              @card-drop="handleCardDrop"
            />
          </div>
          
          <!-- Round Ended State -->
          <div v-else-if="gameStatus === 'round_ended'" class="round-ended">
            <div class="round-result">
              <h3>🎯 Runde beendet!</h3>
              <div v-if="lastRoundLoser" class="round-info">
                <p><strong>Verlierer:</strong> {{ getPlayerName(lastRoundLoser) }}</p>
                <p><strong>Grund:</strong> {{ lastRoundReason }}</p>
              </div>
              <div class="revealed-cards" v-if="cardsRevealed">
                <h4>📋 Aufgedeckte Karten:</h4>
                <div class="revealed-grid">
                  <!-- Show revealed card values -->
                </div>
              </div>
              <button @click="startNewRound" class="btn btn-primary" :disabled="isLoading">
                {{ isLoading ? 'Startet...' : '🔄 Neue Runde starten' }}
              </button>
            </div>
          </div>
          
          <!-- Game Ended State -->
          <div v-else class="game-ended">
            <div class="game-over">
              <h3>🏁 Spiel beendet</h3>
              <button @click="returnToDashboard" class="btn btn-secondary">
                🏠 Zurück zum Dashboard
              </button>
            </div>
          </div>
        </section>

        <!-- Player Actions -->
        <footer class="player-actions-section glassmorphism">
          <!-- Player Hand Cards -->
          <div v-if="gameStatus === 'playing' && playerHand.length > 0" class="player-hand-section">
            <h4>🎴 Deine Karten</h4>
            <div class="hand-cards">
              <GameCard
                v-for="card in playerHand"
                :key="card.id"
                :card="card"
                :isSelected="selectedCard?.id === card.id"
                :isOnBoard="false"
                @click="selectCard(card)"
                @dragstart="handleCardDragStart(card)"
                class="hand-card"
                draggable="true"
              />
            </div>
          </div>
          
          <div class="actions-header">
            <h3>⚡ Aktionen</h3>
          </div>
          
          <div class="actions-container">
            <button 
              v-if="gameStatus === 'playing' && currentPlayer === playerId"
              @click="makeMoveFromButton"
              :disabled="isLoading || !selectedCard || !selectedInsertionPoint"
              class="btn btn-success"
            >
              {{ isLoading ? 'Zug wird ausgeführt...' : '🎯 Zug machen' }}
            </button>
            
            <button 
              @click="leaveGame"
              :disabled="isLoading"
              class="btn btn-danger"
            >
              {{ isLoading ? 'Verlässt...' : '🚪 Spiel verlassen' }}
            </button>
          </div>
        </footer>
      </main>
    </div>

    <!-- Game Messages -->
    <div class="game-messages">
      <div 
        v-for="message in gameMessages" 
        :key="message.id"
        class="game-message"
        :class="message.type"
      >
        <div class="message-content">
          <strong>{{ message.title }}</strong>
          <p>{{ message.text }}</p>
        </div>
        <button @click="dismissMessage(message.id)" class="dismiss-btn">×</button>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import GameBoard from './components/GameBoard.vue'
import GameCard from './components/GameCard.vue'

export default {
  name: 'GameRoom',
  components: {
    GameBoard,
    GameCard
  },
  setup() {
    // URL Parameters
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = ref(urlParams.get('sessionId'))
    const playerId = ref(urlParams.get('playerId'))
    const playerName = ref(decodeURIComponent(urlParams.get('playerName') || ''))

    // Connection state
    const socket = ref(null)
    const isConnected = ref(false)
    const isLoading = ref(false)
    const loadingMessage = ref('Verbinde...')

    // Game state
    const gameStatus = ref('waiting')
    const players = ref([])
    const currentPlayer = ref(null)
    const gameMessages = ref([])
    const gameBoard = ref({})
    const playerHand = ref([])
    const insertionPoints = ref({ horizontal: [], vertical: [], origin: [] })
    const selectedCard = ref(null)
    const selectedInsertionPoint = ref(null)
    const roundNumber = ref(0)
    const cardsRevealed = ref(false)
    const lastRoundLoser = ref(null)
    const lastRoundReason = ref(null)

    // Computed
    const connectionStatusText = computed(() => {
      return isConnected.value ? '🟢 Verbunden' : '🔴 Verbinde...'
    })

    // Board position calculations
    const verticalPositions = computed(() => {
      const positions = []
      // Generate vertical positions for the cross layout (center column)
      for (let y = -3; y <= 3; y++) {
        if (y !== 0) { // Skip center position to avoid overlap
          positions.push({ x: 0, y })
        }
      }
      return positions
    })

    const horizontalPositions = computed(() => {
      const positions = []
      // Generate horizontal positions for the cross layout (center row)
      for (let x = -3; x <= 3; x++) {
        positions.push({ x, y: 0 })
      }
      return positions
    })

    // Create validMoves array for GameBoard component
    const validMovesArray = computed(() => {
      if (!insertionPoints.value) return []
      
      return [
        ...(insertionPoints.value.horizontal || []),
        ...(insertionPoints.value.vertical || []),
        ...(insertionPoints.value.origin || [])
      ]
    })

    // Socket.IO connection and events
    const connectSocket = () => {
      try {
        socket.value = io('http://localhost:3002', {
          transports: ['websocket', 'polling'],
          timeout: 5000
        })

        socket.value.on('connect', () => {
          console.log('Socket connected:', socket.value.id)
          isConnected.value = true
          joinSession()
        })

        socket.value.on('disconnect', () => {
          console.log('Socket disconnected')
          isConnected.value = false
          showMessage('Verbindung verloren', 'Versuche zu reconnecten...', 'error')
        })

        socket.value.on('connect_error', (error) => {
          console.error('Socket connection error:', error)
          showMessage('Verbindungsfehler', 'Kann nicht mit Server verbinden', 'error')
        })

        // Game events
        socket.value.on('gameState', (gameState) => {
          console.log('Game state received:', gameState)
          updateGameState(gameState)
        })

        socket.value.on('playerJoined', (data) => {
          console.log('Player joined:', data)
          showMessage('Spieler beigetreten', `${data.playerName} ist dem Spiel beigetreten`, 'success')
        })

        socket.value.on('playerLeft', (data) => {
          console.log('Player left:', data)
          showMessage('Spieler verlassen', `${data.playerName} hat das Spiel verlassen`, 'info')
        })

        socket.value.on('playerConnected', (data) => {
          console.log('Player connected:', data)
          // Request updated game state
          socket.value.emit('getGameState')
        })

        socket.value.on('playerDisconnected', (data) => {
          console.log('Player disconnected:', data)
          // Request updated game state
          socket.value.emit('getGameState')
        })

        socket.value.on('gameStarted', (data) => {
          console.log('🎮 Game started event received:', data)
          console.log('Previous game status:', gameStatus.value)
          gameStatus.value = 'playing'
          console.log('New game status:', gameStatus.value)
          isLoading.value = false  // Stop loading spinner
          loadingMessage.value = ''
          showMessage('Spiel gestartet', 'Das Spiel hat begonnen!', 'success')
          
          // Request fresh game state after game start
          console.log('🔄 Requesting fresh game state after game start...')
          setTimeout(() => {
            if (socket.value) {
              socket.value.emit('getGameState')
            }
          }, 100)
        })

        socket.value.on('error', (error) => {
          console.error('Socket error:', error)
          showMessage('Fehler', error.message || 'Ein unbekannter Fehler ist aufgetreten', 'error')
          isLoading.value = false
          loadingMessage.value = ''
          // Keep selections on error for retry - don't clear selectedCard and selectedInsertionPoint
        })
        
        socket.value.on('moveConfirmed', (data) => {
          console.log('✅ Move confirmed:', data)
          
          // Clear selections and loading state only on successful moves
          isLoading.value = false
          loadingMessage.value = ''
          
          if (data.valid === false) {
            // On failed moves, keep selections for retry
            showMessage('Ungültiger Zug', data.reason || 'Zug war nicht gültig', 'error')
          } else {
            // On successful moves, clear selections
            selectedCard.value = null
            selectedInsertionPoint.value = null
            showMessage('Zug erfolgreich', 'Karte wurde platziert', 'success')
          }
        })
        
        socket.value.on('gameEnded', (data) => {
          console.log('🏁 Game ended:', data)
          showMessage('Spiel beendet', `Gewinner: ${data.winnerName || 'Unbekannt'}`, 'info')
          isLoading.value = false
          loadingMessage.value = ''
          // Clear selections when game ends
          selectedCard.value = null
          selectedInsertionPoint.value = null
        })

      } catch (error) {
        console.error('Failed to create socket connection:', error)
        showMessage('Verbindungsfehler', 'Kann Socket.IO Verbindung nicht erstellen', 'error')
      }
    }

    const joinSession = () => {
      if (!socket.value || !sessionId.value || !playerId.value) {
        console.error('Missing required data for joining session')
        return
      }

      const joinData = {
        sessionId: sessionId.value,
        playerId: playerId.value,
        playerName: playerName.value
      }

      console.log('Joining room:', joinData)
      socket.value.emit('joinRoom', joinData)
    }

    const updateGameState = (gameState) => {
      console.log('Updating game state:', gameState)
      if (gameState.status) {
        gameStatus.value = gameState.status
      }
      if (gameState.players && Array.isArray(gameState.players)) {
        players.value = gameState.players
        console.log('Players updated:', players.value)
      }
      if (gameState.currentPlayer) {
        currentPlayer.value = gameState.currentPlayer
      }
      if (gameState.board) {
        gameBoard.value = gameState.board
      }
      if (gameState.playerHand) {
        playerHand.value = gameState.playerHand
      }
      if (gameState.insertionPoints) {
        insertionPoints.value = gameState.insertionPoints
      }
      if (gameState.roundNumber !== undefined) {
        roundNumber.value = gameState.roundNumber
      }
      if (gameState.cardsRevealed !== undefined) {
        cardsRevealed.value = gameState.cardsRevealed
      }
      if (gameState.lastRoundLoser) {
        lastRoundLoser.value = gameState.lastRoundLoser
      }
      if (gameState.lastRoundReason) {
        lastRoundReason.value = gameState.lastRoundReason
      }
    }

    // Game methods
    const startGame = () => {
      console.log('🚀 Starting game...', { 
        socketConnected: !!socket.value,
        sessionId: sessionId.value,
        playerId: playerId.value,
        playerCount: players.value.length,
        gameStatus: gameStatus.value
      })
      
      if (!socket.value) {
        console.error('❌ No socket connection!')
        showMessage('Fehler', 'Keine Verbindung zum Server', 'error')
        return
      }
      
      if (gameStatus.value !== 'waiting') {
        console.error('❌ Game not in waiting state:', gameStatus.value)
        showMessage('Fehler', 'Spiel ist nicht im Wartezustand', 'error')
        return
      }
      
      if (players.value.length < 2) {
        console.error('❌ Not enough players:', players.value.length)
        showMessage('Fehler', 'Nicht genügend Spieler', 'error')
        return
      }
      
      isLoading.value = true
      loadingMessage.value = 'Starte Spiel...'
      
      console.log('📤 Emitting startGame event...', { sessionId: sessionId.value })
      socket.value.emit('startGame', { sessionId: sessionId.value })
      
      // Set timeout for loading state
      setTimeout(() => {
        if (isLoading.value) {
          console.warn('⚠️ Game start timeout - still loading after 5 seconds')
          isLoading.value = false
          if (gameStatus.value === 'waiting') {
            showMessage('Warnung', 'Spielstart dauert länger als erwartet...', 'warning')
          }
        }
      }, 5000)
    }

    const makeMove = (cardId, insertionPoint) => {
      if (!socket.value) return;

      isLoading.value = true;
      loadingMessage.value = 'Führe Zug aus...';

      // Emit the playerMove event instead of placeholder
      socket.value.emit('playerMove', {
        sessionId: sessionId.value,
        playerId: playerId.value,
        cardId: cardId,
        insertionPoint: insertionPoint
      });

      // Don't automatically clear loading state - wait for server response
      // Loading state will be cleared by moveConfirmed or error events
    };
    
    const handleCardDrop = (event, cell) => {
      if (!selectedCard.value) {
        showMessage('Fehler', 'Keine Karte ausgewählt', 'error')
        return
      }
      
      const cardId = selectedCard.value.id;

      console.log('Card dropped on cell:', cell, event);
      console.log('Selected card:', selectedCard.value);
      
      // Store the insertion point for potential clearing later
      selectedInsertionPoint.value = { x: cell.x, y: cell.y };
      
      // Convert event data into move action - DIRECT EXECUTION
      makeMove(cardId, { x: cell.x, y: cell.y });
      
      // DON'T clear selections here - wait for server confirmation!
      // selectedCard.value = null;
      // selectedInsertionPoint.value = null;
    }
    
    const makeMoveFromButton = () => {
      if (!selectedCard.value) {
        showMessage('Fehler', 'Keine Karte ausgewählt', 'error')
        return
      }
      
      if (!selectedInsertionPoint.value) {
        showMessage('Fehler', 'Kein Einfügepunkt ausgewählt', 'error')
        return
      }
      
      console.log('Making move from button:', {
        cardId: selectedCard.value.id,
        insertionPoint: selectedInsertionPoint.value
      })
      
      // Execute the move
      makeMove(selectedCard.value.id, selectedInsertionPoint.value)
      
      // DON'T clear selections here - wait for server confirmation!
      // selectedCard.value = null
      // selectedInsertionPoint.value = null
    }

    const leaveGame = () => {
      if (socket.value) {
        socket.value.emit('leaveRoom', { 
          sessionId: sessionId.value,
          playerId: playerId.value
        })
        socket.value.disconnect()
      }
      returnToDashboard()
    }

    const returnToDashboard = () => {
      window.location.href = 'http://localhost:5173'
    }

    // Helper methods
    const getStatusText = (status) => {
      const statusMap = {
        waiting: '⏳ Wartet',
        playing: '🎮 Läuft',
        ended: '✅ Beendet'
      }
      return statusMap[status] || status
    }

    const getCurrentPlayerName = () => {
      const player = players.value.find(p => p.id === currentPlayer.value)
      return player ? player.name : 'Unbekannt'
    }

    const getPlayerInitials = (name) => {
      return name ? name.slice(0, 2).toUpperCase() : '??'
    }

    const showMessage = (title, text, type = 'info') => {
      const message = {
        id: Date.now(),
        title,
        text,
        type,
        timestamp: new Date()
      }
      gameMessages.value.push(message)
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        dismissMessage(message.id)
      }, 5000)
    }

    const dismissMessage = (messageId) => {
      gameMessages.value = gameMessages.value.filter(m => m.id !== messageId)
    }

    // Lifecycle
    onMounted(() => {
      console.log('GameRoom mounted:', { sessionId: sessionId.value, playerId: playerId.value, playerName: playerName.value })
      
      if (!sessionId.value || !playerId.value) {
        showMessage('Fehler', 'Fehlende Session-Daten. Kehre zum Dashboard zurück.', 'error')
        setTimeout(returnToDashboard, 3000)
        return
      }
      
      connectSocket()
    })

    onUnmounted(() => {
      if (socket.value) {
        socket.value.disconnect()
      }
    })

    // Board helper methods
    const hasCardAt = (x, y) => {
      return gameBoard.value && gameBoard.value[`${x},${y}`]
    }

    const getBoardCard = (x, y) => {
      return gameBoard.value && gameBoard.value[`${x},${y}`]
    }

    const isInsertionPoint = (x, y) => {
      if (!insertionPoints.value) return false
      
      // Check all insertion point types
      const allPoints = [
        ...(insertionPoints.value.horizontal || []),
        ...(insertionPoints.value.vertical || []),
        ...(insertionPoints.value.origin || [])
      ]
      
      return allPoints.some(point => point.x === x && point.y === y)
    }

    const handlePositionClick = (cellData) => {
      // Extract x, y coordinates from cell object
      const x = cellData.x || 0
      const y = cellData.y || 0
      
      console.log('Position clicked:', { x, y, cellData })
      if (currentPlayer.value !== playerId.value) {
        showMessage('Nicht dein Zug', 'Du bist nicht am Zug', 'warning')
        return
      }
      
      if (isInsertionPoint(x, y)) {
        selectedInsertionPoint.value = { x, y }
        console.log('Insertion point selected:', selectedInsertionPoint.value)
        showMessage('Einfügepunkt gewählt', `Position (${x}, ${y}) ausgewählt`, 'info')
      }
    }
    
    const selectCard = (card) => {
      console.log('Card selected:', card)
      selectedCard.value = card
      showMessage('Karte gewählt', `${card.name} ausgewählt`, 'info')
    }
    
    const handleCardDragStart = (card) => {
      console.log('🖱️ Card drag started:', card)
      // Automatically select the card when dragging starts
      selectedCard.value = card
      showMessage('Drag gestartet', `${card.name} wird gezogen`, 'info')
    }

    const getPlayerName = (playerId) => {
      const player = players.value.find(p => p.id === playerId)
      return player ? player.name : 'Unbekannt'
    }

    const startNewRound = () => {
      if (!socket.value) return
      
      isLoading.value = true
      loadingMessage.value = 'Starte neue Runde...'
      
      socket.value.emit('startNewRound', { sessionId: sessionId.value })
      
      setTimeout(() => {
        isLoading.value = false
      }, 2000)
    }

    return {
      // State
      sessionId,
      playerId,
      playerName,
      isConnected,
      isLoading,
      loadingMessage,
      gameStatus,
      players,
      currentPlayer,
      gameMessages,
      gameBoard,
      playerHand,
      insertionPoints,
      selectedCard,
      selectedInsertionPoint,
      roundNumber,
      cardsRevealed,
      lastRoundLoser,
      lastRoundReason,
      
      // Computed
      connectionStatusText,
      verticalPositions,
      horizontalPositions,
      
      // Methods
      startGame,
      makeMove,
      makeMoveFromButton,
      leaveGame,
      returnToDashboard,
      getStatusText,
      getCurrentPlayerName,
      getPlayerInitials,
      dismissMessage,
      hasCardAt,
      getBoardCard,
      isInsertionPoint,
      handlePositionClick,
      getPlayerName,
      startNewRound,
      validMovesArray,
      selectCard,
      handleCardDragStart,
      handleCellClick: handlePositionClick,
      handleCardDrop
    }
  }
}
</script>

<style scoped>
.game-room-container {
  height: 100vh;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  color: white;
  overflow: hidden;
}

.connection-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.connection-status.connected {
  background: rgba(76, 175, 80, 0.3);
}

.connection-status.disconnected {
  background: rgba(244, 67, 54, 0.3);
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff4444;
  margin-right: 10px;
}

.connected .status-indicator {
  background: #4CAF50;
}

.session-info {
  display: flex;
  gap: 20px;
  font-size: 0.9rem;
  opacity: 0.8;
}

.loading-screen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: calc(100vh - 60px);
  text-align: center;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.game-layout {
  display: flex;
  height: calc(100vh - 60px);
}

.game-sidebar {
  width: 350px;
  padding: 20px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.game-title {
  font-size: 1.5rem;
  margin: 0;
}

.dashboard-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
}

.session-section,
.players-section,
.stats-section {
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.session-section h3,
.players-section h3,
.stats-section h3 {
  margin: 0 0 15px 0;
  font-size: 1.1rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  background: rgba(255, 255, 255, 0.2);
}

.status-badge.waiting {
  background: rgba(255, 193, 7, 0.3);
}

.status-badge.playing {
  background: rgba(76, 175, 80, 0.3);
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.player-item {
  display: flex;
  align-items: center;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  border: 1px solid transparent;
}

.player-item.current-player {
  border-color: #4CAF50;
  background: rgba(76, 175, 80, 0.2);
}

.player-item.my-player {
  border-color: #2196F3;
  background: rgba(33, 150, 243, 0.2);
}

.player-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 12px;
}

.player-name {
  font-weight: 600;
}

.player-status {
  font-size: 0.8rem;
  opacity: 0.8;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
}

.stat-label {
  opacity: 0.8;
}

.stat-value {
  font-weight: bold;
}

.game-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 20px;
}

.game-board-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
}

.player-actions-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 15px 15px 0 0;
  transition: height 0.3s ease-in-out;
  overflow: hidden;
  height: 100px; /* minimized height */
  padding: 15px;
}

.player-actions-section:hover {
  height: 30%; /* expanded height */
}

.actions-header {
  display: flex;
  justify-content: center;
  margin-top: 15px;
}

.game-waiting,
.game-playing,
.game-ended {
  padding: 40px;
}

.actions-container {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
}

.btn-success {
  background: linear-gradient(45deg, #2196F3, #1976D2);
  color: white;
}

.btn-danger {
  background: linear-gradient(45deg, #f44336, #d32f2f);
  color: white;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.game-messages {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 1000;
  max-width: 400px;
}

.game-message {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 8px;
  background: rgba(33, 150, 243, 0.9);
  animation: slideIn 0.3s ease;
}

.game-message.success {
  background: rgba(76, 175, 80, 0.9);
}

.game-message.error {
  background: rgba(244, 67, 54, 0.9);
}

.message-content {
  flex: 1;
}

.dismiss-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  margin-left: 10px;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.waiting-message {
  text-align: center;
  padding: 15px;
  background: rgba(255, 193, 7, 0.2);
  border-radius: 8px;
  margin-top: 15px;
}

.start-btn {
  width: 100%;
  margin-top: 15px;
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

.glassmorphism {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
}

/* Player Hand Cards Styles */
.player-hand-section {
  margin-bottom: 20px;
  text-align: center;
}

.player-hand-section h4 {
  margin: 0 0 15px 0;
  color: white;
  font-size: 1.1rem;
}

.hand-cards {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  max-width: 100%;
  margin: 0 auto;
}

.hand-card {
  cursor: pointer;
  transition: all 0.3s ease;
  transform: scale(0.9);
}

.hand-card:hover {
  transform: scale(0.95) translateY(-5px);
  z-index: 10;
}

.hand-card.selected {
  transform: scale(0.95) translateY(-10px);
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.5);
}

@media (max-width: 768px) {
  .hand-cards {
    gap: 5px;
  }
  
  .hand-card {
    transform: scale(0.8);
  }
  
  .hand-card:hover {
    transform: scale(0.85) translateY(-3px);
  }
}
</style>
