<template>
  <div class="moves-panel">
    <h3>🎲 Aktuelle Züge</h3>
    <div class="moves-content">
      <div v-if="!selectedCard" class="no-selection">
        <p>Wähle eine Karte aus!</p>
      </div>
      <div v-else-if="validMoves.length === 0" class="no-moves">
        <p>Keine gültigen Züge für {{ selectedCard.name }}</p>
      </div>
      <div v-else class="moves-list">
        <div v-for="move in validMoves" :key="`${move.x}-${move.y}`" class="move-item">
          <div class="move-coords">{{ move.type }} ({{ move.x }}, {{ move.y }})</div>
          <div v-if="move.description" class="move-description">{{ move.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MovesPanel',
  props: {
    validMoves: { type: Array, default: () => [] },
    selectedCard: { type: Object, default: null }
  }
}
</script>

<style scoped>
.moves-panel h3 { margin-bottom: 15px; }
.moves-content { max-height: 200px; overflow-y: auto; }
.move-item { margin: 5px 0; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px; font-size: 12px; }
.move-coords { font-weight: 600; }
.move-description { opacity: 0.8; margin-top: 2px; }
.no-selection, .no-moves { padding: 20px; text-align: center; opacity: 0.6; }
</style>
