<template>
  <div class="notification-system">
    <transition-group name="notification" tag="div">
      <div 
        v-for="notification in notifications" 
        :key="notification.id"
        class="notification"
        :class="[`notification-${notification.type}`]"
      >
        <div class="notification-content">
          <div class="notification-icon">
            <span v-if="notification.type === 'success'">✅</span>
            <span v-else-if="notification.type === 'error'">❌</span>
            <span v-else-if="notification.type === 'warning'">⚠️</span>
            <span v-else>ℹ️</span>
          </div>
          <div class="notification-message">{{ notification.message }}</div>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script>
export default {
  name: 'NotificationSystem',
  props: {
    notifications: { type: Array, default: () => [] }
  }
}
</script>

<style scoped>
.notification-system {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  pointer-events: none;
}

.notification {
  margin-bottom: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  max-width: 300px;
  word-wrap: break-word;
}

.notification-success {
  background: rgba(76, 175, 80, 0.9);
}

.notification-error {
  background: rgba(244, 67, 54, 0.9);
}

.notification-warning {
  background: rgba(255, 193, 7, 0.9);
  color: #333;
}

.notification-info {
  background: rgba(33, 150, 243, 0.9);
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notification-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.notification-message {
  font-size: 14px;
  line-height: 1.4;
}

/* Transitions */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100px);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

.notification-move {
  transition: transform 0.3s ease;
}
</style>
