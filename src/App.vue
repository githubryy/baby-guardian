<script setup lang="ts">
import { ref } from 'vue';
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
import { useUserStore } from '@/stores/user';
import { useFamilyStore } from '@/stores/family';

// 全局就绪状态：页面可据此判断云开发是否初始化完成
const appReady = ref(false);
const initError = ref('');

onLaunch(() => {
  console.log('App Launch - 宝宝守护者');
  initApp();
});

async function initApp() {
  try {
    // 1. 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloudbase-d8g1n7nag24fc86c3',
        traceUser: true,
      });
      console.log('[App] 云开发初始化完成');
    } else {
      console.warn('[App] wx.cloud 不可用');
    }

    // 2. 静默登录
    const userStore = useUserStore();
    const familyStore = useFamilyStore();
    await userStore.initLogin();
    console.log('[App] 登录完成, isLogin:', userStore.isLogin);

    // 3. 登录成功后加载家庭信息
    if (userStore.isLogin) {
      familyStore.loadFamily();

      // 4. 检查是否需要角色引导（新用户未设置身份）
      if (userStore.needsOnboarding) {
        console.log('[App] 新用户，跳转角色设置页');
        setTimeout(() => {
          uni.navigateTo({ url: '/pages/onboarding/role' });
        }, 300);
      }
    }
  } catch (e: any) {
    console.error('[App] 初始化失败:', e);
    initError.value = e?.message || '初始化失败';
  } finally {
    appReady.value = true;
  }
}

// 暴露给子组件使用
uni.$appReady = appReady;

onShow(() => {
  console.log('App Show');
});

onHide(() => {
  console.log('App Hide');
});
</script>

<style lang="scss">
/* uview-plus 基础样式 */
@import "uview-plus/index.scss";

/* 全局样式重置 */
page {
  background-color: #f8f8f8;
  font-family: -apple-system, "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;
  font-size: 28rpx;
  color: #2d2d2d;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* 去除按钮默认样式 */
button {
  padding: 0;
  margin: 0;
  background: none;
  border: none;
  line-height: normal;
  font-size: inherit;
  color: inherit;

  &::after {
    border: none;
  }
}

/* ========== 通用工具类 ========== */
.flex {
  display: flex;
}
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.flex-col {
  display: flex;
  flex-direction: column;
}
.flex-1 {
  flex: 1;
}
.text-center {
  text-align: center;
}
.text-right {
  text-align: right;
}
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ========== 通用卡片 ========== */
.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

/* ========== 安全区 ========== */
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* ========== Tap 反馈 ========== */
.tap-feedback {
  transition: all 0.15s ease;

  &:active {
    transform: scale(0.97);
    opacity: 0.85;
  }
}

.tap-shrink {
  transition: transform 0.12s ease;

  &:active {
    transform: scale(0.95);
  }
}

/* ========== 骨架屏 ========== */
.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e8e8e8 37%,
    #f0f0f0 63%
  );
  background-size: 400% 100%;
  animation: skeleton-loading 1.4s ease infinite;
  border-radius: 8rpx;
}

.skeleton-circle {
  border-radius: 50%;
}

@keyframes skeleton-loading {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}

/* ========== 入场动画 ========== */
.fade-in {
  animation: fadeIn 0.3s ease both;
}

.slide-up {
  animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.slide-up-stagger > view:nth-child(1) {
  animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.slide-up-stagger > view:nth-child(2) {
  animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 0.06s both;
}
.slide-up-stagger > view:nth-child(3) {
  animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 0.12s both;
}
.slide-up-stagger > view:nth-child(4) {
  animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 0.18s both;
}
.slide-up-stagger > view:nth-child(5) {
  animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 0.24s both;
}
.slide-up-stagger > view:nth-child(6) {
  animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 0.30s both;
}
.slide-up-stagger > view:nth-child(n+7) {
  animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 0.36s both;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== 全局页面过渡 ========== */
.page-enter {
  animation: pageEnter 0.3s ease both;
}

@keyframes pageEnter {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== 遮罩层 ========== */
.overlay-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 400;
  animation: fadeIn 0.2s ease both;
}
</style>
