<template>
  <div class="game-stats">
    <h3>📊 Spielinfo</h3>
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-label">Session:</span>
        <span class="stat-value">{{ stats.sessionId || '-' }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Karten auf Board:</span>
        <span class="stat-value">{{ stats.cardsOnBoard || 0 }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Mögliche Züge:</span>
        <span class="stat-value">{{ stats.possibleMoves || 0 }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GameStats',
  props: {
    stats: { type: Object, default: () => ({}) }
  }
}
</script>

<style scoped>
.game-stats { margin-top: 30px; }
.game-stats h3 { margin-bottom: 15px; }
.stat-item { padding: 8px 0; display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); }
.stat-label { font-size: 14px; }
.stat-value { font-weight: 600; color: #FFD700; }
</style>
