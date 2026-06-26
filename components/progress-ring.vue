<template>
  <view class="pr-ring" :style="ringStyle">
    <view class="pr-hole" :style="holeStyle">
      <slot />
    </view>
  </view>
</template>

<script>
export default {
  name: 'ProgressRing',
  props: {
    pct: { type: Number, default: 0 },        // 0-100
    size: { type: Number, default: 200 },      // rpx
    stroke: { type: Number, default: 16 },     // rpx
    color: { type: String, default: 'var(--accent)' },
    track: { type: String, default: 'var(--surface-2)' }
  },
  computed: {
    deg() { return Math.max(0, Math.min(100, this.pct)) * 3.6 },
    ringStyle() {
      return {
        width: this.size + 'rpx',
        height: this.size + 'rpx',
        borderRadius: '50%',
        background: 'conic-gradient(' + this.color + ' ' + this.deg + 'deg, ' + this.track + ' 0deg)'
      }
    },
    holeStyle() {
      const inner = Math.max(0, this.size - this.stroke * 2)
      return { width: inner + 'rpx', height: inner + 'rpx' }
    }
  }
}
</script>

<style scoped>
.pr-ring { display: flex; align-items: center; justify-content: center; }
.pr-hole {
  border-radius: 50%;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
</style>
