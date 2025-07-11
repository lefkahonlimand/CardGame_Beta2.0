<template>
  <div class="game-rules">
    <h3>ℹ️ Spielregeln</h3>
    <ul class="rules-list">
      <li>📏 Karten mit Breite → Horizontal</li>
      <li>📐 Karten mit Höhe → Vertikal</li>
      <li>🎯 Erste Karte benötigt beide Werte</li>
      <li>📊 Größere Werte weiter außen</li>
      <li>🔄 Karten können verschoben werden</li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'GameRules'
}
</script>

<style scoped>
.game-rules { margin-top: 30px; }
.game-rules h3 { margin-bottom: 15px; }
.rules-list { list-style: none; padding: 0; }
.rules-list li { padding: 8px 0; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.1); }
</style>
