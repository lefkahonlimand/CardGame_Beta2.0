import { createApp } from 'vue'
import Dashboard from './Dashboard.vue'

// Create Vue app for Dashboard (REST API only)
const app = createApp(Dashboard)

// Mount the app
app.mount('#app')
