import { createApp } from 'vue'
import GameRoom from './GameRoom.vue'

// Create Vue app for Game Room (Socket.IO only)
const app = createApp(GameRoom)

// Mount the app
app.mount('#app')
