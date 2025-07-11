<template>
  <div class="game-board glassmorphism">
    <div class="board-container">
      <div class="board-grid">
        <div 
          v-for="cell in boardCells" 
          :key="cell.key"
          class="board-cell"
          :class="{
            'center': cell.x === 0 && cell.y === 0,
            'valid-drop': isValidMove(cell),
            'has-card': hasCard(cell)
          }"
          :style="{ left: cell.left, top: cell.top }"
          @click="$emit('cell-click', cell)"
          @dragover.prevent
          @drop="$emit('card-drop', $event, cell)"
        >
          <div v-if="cell.x === 0 && cell.y === 0" class="center-label">
            START
          </div>
          
          <GameCard 
            v-if="hasCard(cell)"
            :card="getCard(cell)"
            :isOnBoard="true"
            class="board-card"
          />
          
          <div v-if="isValidMove(cell)" class="valid-indicator">
            <div class="pulse-dot"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import GameCard from './GameCard.vue'

export default {
  name: 'GameBoard',
  components: {
    GameCard
  },
  props: {
    board: {
      type: Object,
      default: () => ({})
    },
    validMoves: {
      type: Array,
      default: () => []
    },
    selectedCard: {
      type: Object,
      default: null
    }
  },
  emits: ['cell-click', 'card-drop'],
  setup(props) {
    const boardCells = computed(() => {
      const cells = []
      const gridSize = 5
      const centerOffset = Math.floor(gridSize / 2)
      
      for (let x = -centerOffset; x <= centerOffset; x++) {
        for (let y = -centerOffset; y <= centerOffset; y++) {
          cells.push({
            x,
            y,
            key: `${x},${y}`,
            left: (250 + x * 100 - 40) + 'px',
            top: (250 - y * 120 - 50) + 'px'
          })
        }
      }
      
      return cells
    })
    
    const hasCard = (cell) => {
      return props.board[`${cell.x},${cell.y}`] !== undefined
    }
    
    const getCard = (cell) => {
      return props.board[`${cell.x},${cell.y}`]
    }
    
    const isValidMove = (cell) => {
      return props.validMoves.some(move => move.x === cell.x && move.y === cell.y)
    }
    
    return {
      boardCells,
      hasCard,
      getCard,
      isValidMove
    }
  }
}
</script>

<style scoped>
.game-board {
  padding: 20px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.board-container {
  position: relative;
  width: 600px;
  height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.board-grid {
  position: relative;
  width: 500px;
  height: 500px;
}

.board-cell {
  position: absolute;
  width: 80px;
  height: 100px;
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  background: rgba(255, 255, 255, 0.02);
}

.board-cell.center {
  background: rgba(255, 215, 0, 0.15);
  border-color: #FFD700;
  border-style: solid;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
}

.board-cell.valid-drop {
  background: rgba(76, 175, 80, 0.2);
  border-color: #4CAF50;
  border-style: solid;
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.4);
}

.board-cell.has-card {
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.05);
}

.board-cell:hover:not(.has-card) {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.02);
}

.center-label {
  font-size: 10px;
  font-weight: 600;
  color: #FFD700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.board-card {
  position: absolute;
  z-index: 10;
}

.valid-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
}

.pulse-dot {
  width: 12px;
  height: 12px;
  background: #4CAF50;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
  100% {
    transform: scale(0.8);
    opacity: 1;
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .board-container {
    width: 400px;
    height: 400px;
  }
  
  .board-grid {
    width: 350px;
    height: 350px;
  }
  
  .board-cell {
    width: 60px;
    height: 75px;
  }
  
  .board-cell {
    left: calc(175px + var(--x) * 70px - 30px) !important;
    top: calc(175px - var(--y) * 85px - 37px) !important;
  }
}
</style>
