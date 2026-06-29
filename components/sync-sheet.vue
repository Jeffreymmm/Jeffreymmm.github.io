<template>
  <view>
    <view class="cs-overlay" :class="{ show: visible }" @click="close"></view>
    <view class="cs-sheet" :class="{ show: visible }">
      <view class="cs-handle"></view>
      <view class="cs-title">云同步设置</view>
      <view class="cs-sub">通过 GitHub Gist 跨设备同步数据</view>

      <view class="cs-group">
        <view class="cs-label">GitHub Token（仅 gist 权限）</view>
        <view class="cs-input-row">
          <input class="cs-input ss-input" password v-model="token" placeholder="classic token，仅勾选 gist" />
        </view>
      </view>

      <view class="cs-group">
        <view class="cs-label">Gist ID（首次可留空）</view>
        <view class="cs-input-row">
          <input class="cs-input ss-input" v-model="gistId" placeholder="留空则首次上传自动生成" />
        </view>
      </view>

      <view class="cs-group">
        <view class="cs-label">加密口令（规划中）</view>
        <view class="cs-input-row ss-disabled">
          <input class="cs-input ss-input" disabled placeholder="加密功能规划中" />
        </view>
      </view>

      <view class="ss-tip">Token 仅本地存储，请勿在公共设备保留。建议设短有效期，不用时到 GitHub 删除。</view>

      <button class="cs-btn-ghost" :disabled="testing" @click="testConn">测试连接</button>
      <button class="cs-submit" @click="save">保存配置</button>
    </view>
  </view>
</template>

<script>
import cloud from '../store/cloud.js'

export default {
  name: 'SyncSheet',
  props: {
    visible: { type: Boolean, default: false }
  },
  emits: ['close', 'saved'],
  data() {
    return {
      token: '',
      gistId: '',
      testing: false
    }
  },
  watch: {
    visible(v) {
      // 打开时回填已存配置
      if (v) {
        const cfg = cloud.getConfig()
        this.token = cfg.token || ''
        this.gistId = cfg.gistId || ''
      }
    }
  },
  methods: {
    close() { this.$emit('close') },
    testConn() {
      if (!this.token || !this.token.trim()) {
        uni.showToast({ title: '请填写 Token', icon: 'none' })
        return
      }
      // 先存入输入的 token，request 依赖 getConfig().token
      cloud.saveConfig({ token: this.token.trim(), gistId: (this.gistId || '').trim() })
      this.testing = true
      uni.showLoading({ title: '测试中...', mask: true })
      cloud.testConnection().then(() => {
        uni.hideLoading()
        uni.showToast({ title: '连接正常', icon: 'success' })
      }).catch(e => {
        uni.hideLoading()
        uni.showToast({ title: (e && e.message) || '连接失败', icon: 'none' })
      }).then(() => {
        this.testing = false
      })
    },
    save() {
      if (!this.token || !this.token.trim()) {
        uni.showToast({ title: '请填写 Token', icon: 'none' })
        return
      }
      cloud.saveConfig({ token: this.token.trim(), gistId: (this.gistId || '').trim() })
      uni.showToast({ title: '已保存', icon: 'success' })
      this.$emit('saved')
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
/* 弹层骨架复用 checkin-sheet 的 .cs-* 体系（scoped 需各自定义）*/
.cs-overlay {
  position: fixed; left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 300; opacity: 0; pointer-events: none;
  transition: opacity .25s;
}
.cs-overlay.show { opacity: 1; pointer-events: auto; }
.cs-sheet {
  position: fixed; left: 0; right: 0; bottom: 0;
  z-index: 301;
  background: var(--surface);
  border-radius: 48rpx 48rpx 0 0;
  padding: 16rpx 40rpx calc(40rpx + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform .3s cubic-bezier(0.22,1,0.36,1);
}
.cs-sheet.show { transform: translateY(0); }
.cs-handle { width: 80rpx; height: 8rpx; background: var(--border-strong); border-radius: 999rpx; margin: 8rpx auto 0; }
.cs-title { font-size: 40rpx; font-weight: 800; color: var(--fg-strong); margin-top: 24rpx; }
.cs-sub { font-size: 26rpx; color: var(--muted); margin-top: 8rpx; }
.cs-group { margin-top: 32rpx; }
.cs-label { font-size: 26rpx; font-weight: 600; color: var(--muted); margin-bottom: 12rpx; }
.cs-input-row {
  display: flex; align-items: center;
  border: 4rpx solid var(--border); border-radius: 24rpx; overflow: hidden;
  background: var(--surface);
}
.cs-input { flex: 1; height: 96rpx; font-size: 40rpx; font-weight: 700; color: var(--fg-strong); padding: 0 24rpx; }
.cs-submit {
  width: 100%; height: 104rpx; line-height: 104rpx;
  margin-top: 24rpx; border-radius: 24rpx; border: 0;
  background: var(--accent); color: #fff;
  font-size: 32rpx; font-weight: 700;
}
.cs-submit::after { border: none; }

/* 同步弹层专属 */
.ss-input { font-size: 28rpx; font-weight: 500; }
.ss-disabled { opacity: 0.6; }
.ss-tip { font-size: 22rpx; color: var(--muted); line-height: 1.5; margin-top: 28rpx; }
.cs-btn-ghost {
  width: 100%; height: 88rpx; line-height: 88rpx;
  margin-top: 28rpx; border-radius: 24rpx;
  background: var(--surface); color: var(--accent);
  border: 2rpx solid var(--accent); font-size: 28rpx; font-weight: 600;
}
.cs-btn-ghost::after { border: none; }
.cs-btn-ghost[disabled] { opacity: 0.6; }
</style>
