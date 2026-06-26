import { createSSRApp } from 'vue'
import App from './App.vue'
import db from './store/db.js'

// 启动时初始化本地数据（按"今天"动态生成最近 6 个月种子数据）
db.load()

export function createApp() {
  const app = createSSRApp(App)
  return { app }
}
