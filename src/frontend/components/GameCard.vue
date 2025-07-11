<template>
  <div 
    class="game-card"
    :class="{ 
      'selected': isSelected, 
      'on-board': isOnBoard,
      'dragging': isDragging 
    }"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @click="$emit('click')"
  >
    <div class="card-header">
      <h4 class="card-name">{{ card.name }}</h4>
      <div class="card-id">#{{ card.id }}</div>
    </div>
    
    <div class="card-content">
      <div class="card-image">
        <img v-if="card.image_url" :src="card.image_url" :alt="card.name" />
        <div v-else class="placeholder-image">
          <span class="placeholder-icon">🏗️</span>
        </div>
      </div>
      
      <div class="card-metrics">
        <div class="metric" :class="{ 'active': card.height }">
          <div class="metric-label">Höhe</div>
          <div class="metric-value">
            {{ card.height ? formatMetric(card.height) : '-' }}
          </div>
        </div>
        
        <div class="metric" :class="{ 'active': card.width }">
          <div class="metric-label">Breite</div>
          <div class="metric-value">
            {{ card.width ? formatMetric(card.width) : '-' }}
          </div>
        </div>
      </div>
    </div>
    
    <div class="card-footer">
      <div class="card-type">
        <span v-if="card.height && card.width" class="type-badge origin">Origin</span>
        <span v-else-if="card.height" class="type-badge vertical">Vertikal</span>
        <span v-else-if="card.width" class="type-badge horizontal">Horizontal</span>
        <span v-else class="type-badge invalid">Invalid</span>
      </div>
    </div>
    
    <div v-if="isSelected" class="selection-ring"></div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'GameCard',
  props: {
    card: {
      type: Object,
      required: true
    },
    isSelected: {
      type: Boolean,
      default: false
    },
    isOnBoard: {
      type: Boolean,
      default: false
    }
  },
  emits: ['click', 'dragstart'],
  setup(props, { emit }) {
    const isDragging = ref(false)
    
    const handleDragStart = (event) => {
      isDragging.value = true
      event.dataTransfer.setData('text/plain', props.card.id)
      emit('dragstart', event, props.card)
    }
    
    const handleDragEnd = () => {
      isDragging.value = false
    }
    
    const formatMetric = (value) => {
      if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'k'
      }
      return value.toString()
    }
    
    return {
      isDragging,
      handleDragStart,
      handleDragEnd,
      formatMetric
    }
  }
}
</script>

<style scoped>
.game-card {
  width: 120px;
  height: 160px;
  background: linear-gradient(145deg, #ffffff, #f0f0f0);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  border: 2px solid transparent;
  color: #333;
  display: flex;
  flex-direction: column;
}

.game-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
}

.game-card.selected {
  border-color: #4CAF50;
  box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.3);
}

.game-card.on-board {
  width: 80px;
  height: 100px;
  transform: scale(0.8);
}

.game-card.dragging {
  opacity: 0.8;
  transform: rotate(5deg) scale(1.05);
  z-index: 1000;
}

.card-header {
  padding: 8px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  text-align: center;
  position: relative;
}

.card-name {
  font-size: 11px;
  font-weight: 600;
  margin: 0;
  line-height: 1.2;
  max-height: 24px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-id {
  font-size: 8px;
  opacity: 0.8;
  margin-top: 2px;
}

.card-content {
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-image {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

.placeholder-icon {
  font-size: 24px;
}

.card-metrics {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.metric {
  flex: 1;
  text-align: center;
  background: #f8f9fa;
  border-radius: 6px;
  padding: 4px 2px;
  opacity: 0.5;
  transition: opacity 0.3s ease;
}

.metric.active {
  opacity: 1;
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
}

.metric-label {
  font-size: 8px;
  font-weight: 600;
  color: #666;
  margin-bottom: 2px;
}

.metric-value {
  font-size: 10px;
  font-weight: 700;
  color: #333;
}

.card-footer {
  padding: 4px 8px;
  display: flex;
  justify-content: center;
}

.type-badge {
  font-size: 8px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.type-badge.origin {
  background: linear-gradient(45deg, #FFD700, #FFA500);
  color: #333;
}

.type-badge.horizontal {
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
}

.type-badge.vertical {
  background: linear-gradient(45deg, #2196F3, #1976D2);
  color: white;
}

.type-badge.invalid {
  background: linear-gradient(45deg, #f44336, #d32f2f);
  color: white;
}

.selection-ring {
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border: 3px solid #4CAF50;
  border-radius: 20px;
  pointer-events: none;
  animation: pulse-ring 2s infinite;
}

@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* On-board specific styles */
.game-card.on-board .card-name {
  font-size: 9px;
}

.game-card.on-board .card-id {
  font-size: 7px;
}

.game-card.on-board .metric-label {
  font-size: 7px;
}

.game-card.on-board .metric-value {
  font-size: 8px;
}

.game-card.on-board .type-badge {
  font-size: 7px;
  padding: 1px 4px;
}

.game-card.on-board .placeholder-icon {
  font-size: 18px;
}
</style>
