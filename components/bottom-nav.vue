<template>
  <view class="bn-bar">
    <view
      v-for="item in items"
      :key="item.key"
      class="bn-item"
      :class="{ center: item.center, active: active === item.key }"
      @click="onClick(item)"
    >
      <template v-if="item.center">
        <view class="bn-fab">
          <text class="bn-fab-plus">+</text>
        </view>
        <text class="bn-label" style="color: var(--accent)">打卡</text>
      </template>
      <template v-else>
        <text class="bn-ico">{{ item.icon }}</text>
        <text class="bn-label">{{ item.label }}</text>
      </template>
    </view>
  </view>
</template>

<script>
export default {
  name: 'BottomNav',
  props: {
    active: { type: String, default: 'home' }
  },
  emits: ['checkin'],
  data() {
    return {
      items: [
        { key: 'home', label: '首页', icon: '🏠', url: '/pages/index/index' },
        { key: 'planner', label: '规划', icon: '📊', url: '/pages/planner/planner' },
        { key: 'checkin', label: '打卡', center: true },
        { key: 'savings', label: '趋势', icon: '📈', url: '/pages/savings/savings' },
        { key: 'me', label: '我的', icon: '👤', url: '/pages/me/me' }
      ]
    }
  },
  methods: {
    onClick(item) {
      if (item.center) { this.$emit('checkin'); return }
      if (this.active === item.key) return
      uni.reLaunch({ url: item.url })
    }
  }
}
</script>

<style scoped>
.bn-bar {
  position: fixed; left: 0; right: 0; bottom: 0;
  height: 120rpx;
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--surface);
  border-top: 2rpx solid var(--border);
  display: flex;
  z-index: 200;
}
.bn-item {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: flex-end;
  padding-bottom: 12rpx;
  gap: 4rpx;
}
.bn-ico { font-size: 44rpx; line-height: 1; }
.bn-label { font-size: 20rpx; font-weight: 600; color: var(--muted); }
.bn-item.active .bn-label,
.bn-item.active .bn-ico { color: var(--accent); }

.bn-fab {
  width: 96rpx; height: 96rpx; border-radius: 50%;
  background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
  margin-top: -48rpx;
  box-shadow: var(--shadow-fab);
}
.bn-fab-plus { color: #fff; font-size: 56rpx; font-weight: 300; line-height: 56rpx; margin-top: -8rpx; }
</style>
