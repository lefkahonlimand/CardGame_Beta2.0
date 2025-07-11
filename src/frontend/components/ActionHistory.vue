<template>
  <div class="action-history">
    <h3>📋 Aktionen</h3>
    <div class="history-content">
      <div v-if="history.length === 0" class="no-history">
        <p>Noch keine Aktionen</p>
      </div>
      <div v-else class="history-list">
        <div v-for="action in history.slice(0, 10)" :key="action.timestamp" class="history-item">
          <div class="action-text">{{ action.card }} → {{ action.position }}</div>
          <div class="action-time">{{ action.timestamp }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ActionHistory',
  props: {
    history: { type: Array, default: () => [] }
  }
}
</script>

<style scoped>
.action-history { margin-top: 30px; }
.action-history h3 { margin-bottom: 15px; }
.history-content { max-height: 200px; overflow-y: auto; }
.history-item { margin: 5px 0; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px; font-size: 12px; }
.action-text { font-weight: 500; }
.action-time { opacity: 0.6; margin-top: 2px; }
.no-history { padding: 20px; text-align: center; opacity: 0.6; }
</style>
