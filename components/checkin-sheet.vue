<template>
  <view>
    <view class="cs-overlay" :class="{ show: visible }" @click="close"></view>
    <view class="cs-sheet" :class="{ show: visible }">
      <view class="cs-handle"></view>
      <view class="cs-title">存钱打卡</view>
      <view class="cs-sub">{{ todayLabel }} · 目标 {{ fmtFull(target) }} 元</view>

      <view class="cs-group">
        <view class="cs-label">存入金额</view>
        <view class="cs-input-row">
          <text class="cs-prefix">¥</text>
          <input class="cs-input" type="number" v-model="amount" placeholder="输入金额" />
        </view>
      </view>

      <view class="cs-group">
        <view class="cs-label">存入账户</view>
        <view class="cs-cats">
          <view
            v-for="a in accounts"
            :key="a.id"
            class="cs-cat"
            :class="{ selected: selected === a.id }"
            :style="selected === a.id ? catActiveStyle(a.color) : catNormalStyle(a.color)"
            @click="selected = a.id"
          >
            <text class="cs-cat-ico">{{ emoji(a.color) }}</text>
            <text class="cs-cat-name">{{ a.name }}</text>
          </view>
        </view>
      </view>

      <view class="cs-group">
        <view class="cs-label">日期</view>
        <picker mode="date" :value="date" @change="date = $event.detail.value">
          <view class="cs-date">{{ date }}</view>
        </picker>
      </view>

      <button class="cs-submit" @click="submit">确认存入 {{ fmtFull(+amount || 0) }} 元</button>
    </view>
  </view>
</template>

<script>
import db from '../store/db.js'
import calc from '../utils/calc.js'

export default {
  name: 'CheckinSheet',
  props: {
    visible: { type: Boolean, default: false }
  },
  emits: ['close', 'saved'],
  data() {
    return {
      amount: '',
      selected: 'down',
      date: this.todayStr(),
      accounts: db.getAccounts()
    }
  },
  computed: {
    target() { return db.getProfile().monthlyTarget || 8000 },
    todayLabel() {
      const d = new Date()
      return d.getFullYear() + '年' + (d.getMonth() + 1) + '月'
    }
  },
  watch: {
    visible(v) {
      if (v) {
        // 每次打开重置为当前目标金额
        this.amount = String(this.target)
        this.selected = 'down'
        this.date = this.todayStr()
        this.accounts = db.getAccounts()
      }
    }
  },
  methods: {
    fmtFull: calc.fmtFull,
    todayStr() {
      const d = new Date()
      const p = n => (n < 10 ? '0' + n : '' + n)
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    },
    emoji(color) {
      return { accent: '🏠', warm: '👶', success: '🛡️', info: '📈' }[color] || '💰'
    },
    catActiveStyle(color) {
      return { borderColor: db.colorVar(color), background: db.colorVar(color + '-soft'), color: db.colorVar(color) }
    },
    catNormalStyle(color) {
      return { borderColor: 'var(--border)' }
    },
    close() { this.$emit('close') },
    submit() {
      const amt = +this.amount || 0
      if (amt <= 0) {
        uni.showToast({ title: '请输入金额', icon: 'none' })
        return
      }
      db.addCheckin({ date: this.date, account: this.selected, amount: amt, category: '月度储蓄' })
      uni.showToast({ title: '打卡成功', icon: 'success' })
      this.$emit('saved')
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
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
.cs-prefix { padding: 0 20rpx; height: 96rpx; line-height: 96rpx; font-size: 34rpx; color: var(--muted); background: var(--surface-2); }
.cs-input { flex: 1; height: 96rpx; font-size: 40rpx; font-weight: 700; color: var(--fg-strong); padding: 0 24rpx; }
.cs-cats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }
.cs-cat {
  padding: 24rpx 8rpx; border: 4rpx solid var(--border); border-radius: 24rpx;
  text-align: center; background: var(--surface); transition: all .15s;
}
.cs-cat-ico { display: block; font-size: 40rpx; margin-bottom: 8rpx; }
.cs-cat-name { font-size: 22rpx; font-weight: 700; color: var(--fg); }
.cs-date {
  height: 88rpx; line-height: 88rpx; padding: 0 24rpx;
  border: 4rpx solid var(--border); border-radius: 24rpx;
  font-size: 32rpx; font-weight: 700; color: var(--fg-strong);
}
.cs-submit {
  width: 100%; height: 104rpx; line-height: 104rpx;
  margin-top: 40rpx; border-radius: 24rpx; border: 0;
  background: var(--accent); color: #fff;
  font-size: 32rpx; font-weight: 700;
}
.cs-submit::after { border: none; }
</style>
