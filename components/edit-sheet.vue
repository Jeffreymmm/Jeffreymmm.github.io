<template>
  <view>
    <view class="cs-overlay" :class="{ show: visible }" @click="close"></view>
    <view class="cs-sheet" :class="{ show: visible }">
      <view class="cs-handle"></view>
      <view class="cs-title">编辑记录</view>
      <view class="cs-sub">{{ date }} · {{ accountName }}</view>

      <view class="cs-group">
        <view class="cs-label">金额</view>
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
        <view class="cs-label">类别</view>
        <view class="cs-cats">
          <view
            v-for="cat in categories"
            :key="cat"
            class="cs-cat-tag"
            :class="{ selected: category === cat }"
            @click="category = cat"
          >
            <text class="cs-cat-name">{{ cat }}</text>
          </view>
        </view>
      </view>

      <view class="cs-group">
        <view class="cs-label">备注</view>
        <input class="cs-note-input" v-model="note" placeholder="选填，如工资 / 定投..." />
      </view>

      <view class="cs-group">
        <view class="cs-label">日期</view>
        <picker mode="date" :value="date" :end="todayStr()" @change="date = $event.detail.value">
          <view class="cs-date">{{ date }}</view>
        </picker>
      </view>

      <view class="es-btn-row">
        <button class="es-del" @click="remove">删除</button>
        <button class="cs-submit es-save" @click="save">保存修改</button>
      </view>
    </view>
  </view>
</template>

<script>
import db from '../store/db.js'
import calc from '../utils/calc.js'

export default {
  name: 'EditSheet',
  props: {
    visible: { type: Boolean, default: false },
    // 待编辑记录（来自 db.history() 的项：含 id/accountId/date/amount/category/note）
    record: { type: Object, default: () => ({}) }
  },
  emits: ['close', 'saved', 'deleted'],
  data() {
    return {
      id: '',
      amount: '',
      selected: 'down',
      category: '月度储蓄',
      note: '',
      date: this.todayStr(),
      accounts: db.getAccounts(),
      categories: ['月度储蓄', '定投', '奖金', '其他']
    }
  },
  computed: {
    accountName() {
      const a = this.accounts.find(x => x.id === this.selected)
      return a ? a.name : ''
    }
  },
  watch: {
    visible(v) {
      // 打开时按传入记录回填各字段
      if (v && this.record && this.record.id) {
        this.id = this.record.id
        this.amount = String(this.record.amount || '')
        this.selected = this.record.accountId || this.record.account || 'down'
        this.category = this.record.category || '月度储蓄'
        this.note = this.record.note || ''
        this.date = this.record.date || this.todayStr()
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
    save() {
      const amt = +this.amount || 0
      if (amt <= 0) {
        uni.showToast({ title: '请输入金额', icon: 'none' })
        return
      }
      // 编辑不改 opening，余额由打卡累计自动派生，严守 SSOT
      db.updateCheckin(this.id, { date: this.date, account: this.selected, amount: amt, category: this.category, note: this.note })
      uni.vibrateShort()
      uni.showToast({ title: '已保存', icon: 'success' })
      this.$emit('saved')
      this.$emit('close')
    },
    remove() {
      uni.showModal({
        title: '删除记录',
        content: '确定删除这条 ' + fmtFull(+this.amount || 0) + ' 元记录？',
        confirmColor: '#e5484d',
        success: r => {
          if (r.confirm) {
            db.deleteCheckin(this.id)
            uni.vibrateShort()
            uni.showToast({ title: '已删除', icon: 'none' })
            this.$emit('deleted')
            this.$emit('close')
          }
        }
      })
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
.cs-prefix { padding: 0 20rpx; height: 96rpx; line-height: 96rpx; font-size: 34rpx; color: var(--muted); background: var(--surface-2); }
.cs-input { flex: 1; height: 96rpx; font-size: 40rpx; font-weight: 700; color: var(--fg-strong); padding: 0 24rpx; }
.cs-cats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }
.cs-cat {
  padding: 24rpx 8rpx; border: 4rpx solid var(--border); border-radius: 24rpx;
  text-align: center; background: var(--surface); transition: all .15s;
}
.cs-cat-ico { display: block; font-size: 40rpx; margin-bottom: 8rpx; }
.cs-cat-name { font-size: 22rpx; font-weight: 700; color: var(--fg); }

/* 类别 chip */
.cs-cat-tag {
  padding: 16rpx 8rpx; border: 4rpx solid var(--border); border-radius: 999rpx;
  text-align: center; background: var(--surface); transition: all .15s;
}
.cs-cat-tag.selected { border-color: var(--accent); background: var(--accent-soft); }
.cs-cat-tag.selected .cs-cat-name { color: var(--accent); }

/* 备注 */
.cs-note-input {
  height: 88rpx; border: 4rpx solid var(--border); border-radius: 24rpx;
  padding: 0 24rpx; font-size: 28rpx; color: var(--fg-strong); background: var(--surface);
}

.cs-date {
  height: 88rpx; line-height: 88rpx; padding: 0 24rpx;
  border: 4rpx solid var(--border); border-radius: 24rpx;
  font-size: 32rpx; font-weight: 700; color: var(--fg-strong);
}
.cs-submit {
  height: 104rpx; line-height: 104rpx;
  border-radius: 24rpx; border: 0;
  background: var(--accent); color: #fff;
  font-size: 32rpx; font-weight: 700;
}
.cs-submit::after { border: none; }

/* 按钮行：删除 + 保存 */
.es-btn-row { display: flex; gap: 20rpx; margin-top: 40rpx; }
.es-del {
  flex: 1; height: 104rpx; line-height: 104rpx; border-radius: 24rpx;
  border: 2rpx solid var(--danger); background: var(--surface); color: var(--danger);
  font-size: 30rpx; font-weight: 700;
}
.es-del::after { border: none; }
.es-save { flex: 2; }
</style>
