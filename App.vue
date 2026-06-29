<script>
import cloud from './store/cloud.js'

export default {
  onLaunch() {
    // 数据已在 main.js 同步加载（保证秒开）；此处异步启用云端同步，不阻塞首屏
    try {
      cloud.startAutoPush()    // 注册写后自动上传
      cloud.autoSyncOnLaunch() // 已配置则静默拉取云端较新数据
    } catch (e) {
      console.warn('启动同步初始化失败', e)
    }
  },
  onShow() {},
  onHide() {}
}
</script>

<style>
/* ===== 全局主题（hex，兼容各机型 WebView）===== */
page,
:root {
  --bg: #f5f7fb;
  --surface: #ffffff;
  --surface-2: #eef1f7;
  --fg: #2b3242;
  --fg-strong: #161a22;
  --muted: #6b7484;
  --muted-2: #8a91a1;
  --border: #e6e9f0;
  --border-strong: #d4d9e3;

  --accent: #2f6bff;
  --accent-light: #5a8dff;
  --accent-soft: #e9f0ff;

  --warm: #f1813a;
  --warm-light: #f5a263;
  --warm-soft: #fdebe0;

  --success: #1faa6c;
  --success-soft: #e3f5ec;

  --danger: #e5484d;
  --danger-soft: #fbe6e7;

  --info: #3d7fe8;
  --info-soft: #e8f1fd;

  --shadow-card: 0 8rpx 24rpx rgba(15, 23, 42, 0.06);
  --shadow-fab: 0 8rpx 24rpx rgba(47, 107, 255, 0.32);
}

page {
  background: var(--bg);
  color: var(--fg);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
}

view, text, scroll-view, input, button { box-sizing: border-box; }

.font-num { font-variant-numeric: tabular-nums; }
</style>
