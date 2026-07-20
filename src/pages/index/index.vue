<template>
  <view class="page-index">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-left tap-shrink" @tap="goBabyList">
          <view class="baby-avatar" :style="{ background: avatarBg }">
            <image v-if="currentBaby?.avatarUrl" :src="currentBaby.avatarUrl" mode="aspectFill" class="avatar-img" />
            <u-icon v-else :name="babyIcon" :size="28" :color="babyIconColor" />
          </view>
          <view class="baby-meta">
            <text class="baby-name">{{ currentBaby?.name || '请添加宝宝' }}</text>
            <text v-if="currentBabyAge" class="baby-age">{{ currentBabyAge.text }}</text>
          </view>
          <u-icon name="arrow-right" :size="14" color="rgba(255,255,255,0.6)" />
        </view>
        <QuotaBadge />
      </view>
    </view>

    <!-- 占位 -->
    <view :style="{ height: (statusBarHeight + 56) + 'px' }" />

    <!-- 内容区 -->
    <scroll-view scroll-y class="content" @refresherrefresh="onRefresh" :refresher-enabled="true"
      :refresher-triggered="refreshing">
      <!-- 无宝宝引导 -->
      <EmptyState v-if="!hasBaby" uIcon="heart-fill" text="还没有添加宝宝信息" subText="添加宝宝后开始设置育儿提醒"
        actionText="添加宝宝" @action="goAddBaby" />

      <template v-else>
        <!-- 骨架屏 -->
        <template v-if="loading">
          <view class="skeleton-overview">
            <view class="skeleton skeleton-title" />
            <view class="skeleton-row">
              <view class="skeleton skeleton-stat" />
              <view class="skeleton skeleton-stat" />
              <view class="skeleton skeleton-stat" />
            </view>
          </view>
          <view class="skeleton-card" v-for="i in 3" :key="'sk-' + i">
            <view class="skeleton skeleton-line" />
            <view class="skeleton skeleton-line short" />
          </view>
        </template>

        <template v-else>
          <!-- 今日概览 -->
          <view class="overview-card fade-in">
            <view class="overview-header">
              <view class="overview-title-wrap">
                <u-icon name="list-dot" :size="18" color="#2d2d2d" />
                <text class="overview-title">今日事件</text>
              </view>
              <view class="overview-actions">
                <text class="all-task-link tap-shrink" @tap="goAllTasks">所有事项</text>
                <text class="overview-date">{{ todayText }}</text>
              </view>
            </view>
            <view class="overview-stats">
              <view class="stat-item">
                <text class="stat-num pending">{{ pendingCount }}</text>
                <text class="stat-label">待处理</text>
              </view>
              <view class="stat-divider" />
              <view class="stat-item">
                <text class="stat-num completed">{{ completedCount }}</text>
                <text class="stat-label">已完成</text>
              </view>
              <view class="stat-divider" />
              <view class="stat-item">
                <text class="stat-num overdue">{{ overdueCount }}</text>
                <text class="stat-label">已超时</text>
              </view>
            </view>
            <!-- 进度条 -->
            <view v-if="totalToday > 0" class="progress-bar">
              <view class="progress-fill" :style="{ width: progressPercent + '%' }" />
            </view>
          </view>

          <!-- 待处理事项 -->
          <view v-if="pendingItems.length > 0" class="section">
            <view class="section-header">
              <view class="section-title-wrap">
                <view class="section-dot pending-dot" />
                <text class="section-title">待处理</text>
              </view>
              <u-tag :text="String(pendingItems.length)" type="error" size="mini" shape="circle" plain />
            </view>
            <view class="section-list slide-up-stagger">
              <TimelineItemComp v-for="item in pendingItems" :key="item.taskId" :item="item"
                @complete="handleComplete" @delay="handleDelay" @ignore="handleIgnore"
                @item-tap="goTaskDetail" />
            </view>
          </view>

          <!-- 已超时事项 -->
          <view v-if="overdueItems.length > 0" class="section">
            <view class="section-header">
              <view class="section-title-wrap">
                <view class="section-dot overdue-dot" />
                <text class="section-title">已超时</text>
              </view>
              <u-tag :text="String(overdueItems.length)" type="error" size="mini" shape="circle" />
            </view>
            <view class="section-list slide-up-stagger">
              <TimelineItemComp v-for="item in overdueItems" :key="item.taskId" :item="item"
                @complete="handleComplete" @delay="handleDelay" @ignore="handleIgnore"
                @item-tap="goTaskDetail" />
            </view>
          </view>

          <!-- 已完成事项 -->
          <view v-if="completedItems.length > 0" class="section">
            <view class="section-header">
              <view class="section-title-wrap">
                <view class="section-dot completed-dot" />
                <text class="section-title">已完成</text>
              </view>
              <u-tag :text="String(completedItems.length)" type="success" size="mini" shape="circle" plain />
            </view>
            <view class="section-list slide-up-stagger">
              <TimelineItemComp v-for="item in completedItems" :key="item.taskId" :item="item"
                @item-tap="goTaskDetail" />
            </view>
          </view>

          <!-- 已结束事项 -->
          <view v-if="pausedItems.length > 0" class="section">
            <view class="section-header">
              <view class="section-title-wrap">
                <view class="section-dot paused-dot" />
                <text class="section-title">已结束</text>
              </view>
              <u-tag :text="String(pausedItems.length)" type="primary" size="mini" shape="circle" plain />
            </view>
            <view class="section-list fade-in">
              <TimelineItemComp v-for="item in pausedItems" :key="item.taskId" :item="item"
                @item-tap="goTaskDetail" />
            </view>
          </view>

          <!-- 无事项 -->
          <EmptyState v-if="timeline.length === 0" uIcon="checkmark-circle-fill" text="今日暂无提醒"
            subText="点击下方按钮添加提醒事项" actionText="添加事项" @action="goAddTask" />
        </template>
      </template>

      <!-- 底部间距 -->
      <view class="bottom-space" />
    </scroll-view>

    <!-- 浮动添加按钮 -->
    <view v-if="hasBaby" class="fab tap-feedback" @tap="goAddTask">
      <u-icon name="plus" :size="28" color="#fff" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { storeToRefs } from 'pinia';
import { useBabyStore } from '@/stores/baby';
import { useTaskStore } from '@/stores/task';
import { useUserStore } from '@/stores/user';
import { guideBatchAuthorization } from '@/utils/subscribe';
import type { TimelineItem } from '@/types';
import TimelineItemComp from '@/components/TimelineItem.vue';
import EmptyState from '@/components/EmptyState.vue';
import QuotaBadge from '@/components/QuotaBadge.vue';

const babyStore = useBabyStore();
const taskStore = useTaskStore();
const userStore = useUserStore();
const { currentBaby, hasBaby, currentBabyAge } = storeToRefs(babyStore);
const { timeline, pendingItems, completedItems, overdueItems, pausedItems } = storeToRefs(taskStore);

const statusBarHeight = ref(44);
const refreshing = ref(false);
const loading = ref(false);

const pendingCount = computed(() => pendingItems.value.length);
const completedCount = computed(() => completedItems.value.length);
const overdueCount = computed(() => overdueItems.value.length);

const todayText = computed(() => {
  const d = new Date();
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}月${day}日 ${weekDays[d.getDay()]}`;
});

const babyIcon = computed(() => {
  if (currentBaby.value?.gender === 'male') return 'man';
  if (currentBaby.value?.gender === 'female') return 'woman';
  return 'account-fill';
});

const babyIconColor = computed(() => {
  if (currentBaby.value?.gender === 'male') return '#378add';
  if (currentBaby.value?.gender === 'female') return '#FF7B7B';
  return '#999';
});

const avatarBg = computed(() => {
  if (currentBaby.value?.gender === 'male') return '#E8F2FC';
  if (currentBaby.value?.gender === 'female') return '#FFF0F0';
  return '#F5F5F5';
});

const totalToday = computed(() => pendingItems.value.length + completedItems.value.length + overdueItems.value.length);
const progressPercent = computed(() => {
  if (totalToday.value === 0) return 0;
  return Math.round((completedItems.value.length / totalToday.value) * 100);
});

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync();
  statusBarHeight.value = sysInfo.statusBarHeight || 44;
  // 首次加载等待 App 初始化完毕
  initLoad();
});

onShow(() => {
  // 非首次加载直接刷新数据
  if (hasInitLoaded) {
    loadData();
  }
});

onPullDownRefresh(() => {
  loadData().finally(() => uni.stopPullDownRefresh());
});

let hasInitLoaded = false;

// 首次加载：等待 App 就绪后再加载数据
function initLoad() {
  if (hasInitLoaded) return;
  // 如果 App 已就绪，直接加载
  if (uni.$appReady?.value) {
    hasInitLoaded = true;
    loadData();
    return;
  }
  // 否则等待 App 就绪后再加载（最多等 8 秒）
  const stopWatch = watch(
    () => uni.$appReady?.value,
    (ready) => {
      if (ready) {
        stopWatch();
        hasInitLoaded = true;
        nextTick(() => loadData());
      }
    },
    { immediate: false }
  );
  // 超时兜底：8 秒后无论如何都加载
  setTimeout(() => {
    stopWatch();
    if (!hasInitLoaded) {
      hasInitLoaded = true;
      loadData();
    }
  }, 8000);
}

async function loadData() {
  loading.value = true;
  try {
    // 并行加载宝宝列表、时间线和事项列表，提升加载速度
    await babyStore.loadBabyList();
    if (hasBaby.value && currentBaby.value?._id) {
      await Promise.all([
        taskStore.loadTimeline(currentBaby.value._id),
        taskStore.loadTaskList(currentBaby.value._id),
      ]);
    }
    userStore.refreshQuota();
  } catch (e: any) {
    console.error('[loadData] 加载失败:', e);
    // 只有非静默错误才弹提示（避免 toast 刷屏）
    if (e?.message && e.message !== '云函数调用超时: api-baby') {
      uni.showToast({ title: '加载失败，请下拉刷新', icon: 'none' });
    }
  } finally {
    loading.value = false;
  }
}

async function onRefresh() {
  refreshing.value = true;
  await loadData();
  refreshing.value = false;
}

function goBabyList() {
  uni.navigateTo({ url: '/pages/baby/list' });
}

function goAddBaby() {
  uni.navigateTo({ url: '/pages/baby/edit' });
}

function goAddTask() {
  uni.navigateTo({ url: '/pages/task/edit' });
}

function goAllTasks() {
  uni.navigateTo({ url: '/pages/task/list' });
}

function goTaskDetail(item: TimelineItem) {
  uni.navigateTo({ url: `/pages/confirm/index?taskId=${item.taskId}` });
}

async function handleComplete(item: TimelineItem) {
  // 在 tap 上下文中先发起订阅授权，避免 await 后丢失手势上下文
  const accepted = await guideBatchAuthorization('完成确认后');
  if (accepted === 0) return // 用户取消授权，不执行后续操作
  uni.showLoading({ title: '处理中...', mask: true });
  try {
    await taskStore.confirmTask({
      taskId: item.taskId,
      action: 'completed',
      taskType: item.type,
      taskName: item.typeName,
      taskMode: item.taskMode,
      completedCount: item.completedCount
    });
    userStore.refreshQuota();
    await loadData();
  } catch (e: any) {
    console.error('[handleComplete] 操作失败:', e);
    uni.showToast({ title: '操作失败，请重试', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
}

async function handleDelay(item: TimelineItem) {
  uni.showActionSheet({
    itemList: ['延迟15分钟', '延迟30分钟', '延迟1小时', '延迟2小时'],
    success: async (res) => {
      const minutes = [15, 30, 60, 120][res.tapIndex];
      uni.showLoading({ title: '处理中...', mask: true });
      try {
        await taskStore.confirmTask({
          taskId: item.taskId,
          action: 'delayed',
          delayMinutes: minutes,
          taskType: item.type,
          taskName: item.typeName,
          taskMode: item.taskMode,
          completedCount: item.completedCount
        });
        loadData();
      } catch (e: any) {
        console.error('[handleDelay] 操作失败:', e);
        uni.showToast({ title: '操作失败，请重试', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },
  });
}

async function handleIgnore(item: TimelineItem) {
  uni.showLoading({ title: '处理中...', mask: true });
  try {
    await taskStore.confirmTask({
      taskId: item.taskId,
      action: 'ignored',
      taskType: item.type,
      taskName: item.typeName,
      taskMode: item.taskMode,
      completedCount: item.completedCount
    });
    loadData();
  } catch (e: any) {
    console.error('[handleIgnore] 操作失败:', e);
    uni.showToast({ title: '操作失败，请重试', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
}
</script>

<style lang="scss" scoped>
.page-index {
  min-height: 100vh;
  background: #f8f8f8;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(135deg, #ff7b7b, #ff9b9b);
  box-shadow: 0 4rpx 16rpx rgba(255, 123, 123, 0.2);

  .nav-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
    padding: 0 24rpx;
  }

  .nav-left {
    display: flex;
    align-items: center;
    gap: 16rpx;

    .baby-avatar {
      width: 64rpx;
      height: 64rpx;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 2rpx solid rgba(255, 255, 255, 0.4);

      .avatar-img {
        width: 100%;
        height: 100%;
      }
    }

    .baby-meta {
      display: flex;
      flex-direction: column;

      .baby-name {
        font-size: 30rpx;
        font-weight: 600;
        color: #fff;
      }

      .baby-age {
        font-size: 22rpx;
        color: rgba(255, 255, 255, 0.8);
      }
    }
  }
}

.content {
  height: calc(100vh - 100px);
}

/* 骨架屏 */
.skeleton-overview {
  margin: 24rpx;
  padding: 32rpx;
  background: #fff;
  border-radius: 24rpx;

  .skeleton-title {
    width: 200rpx;
    height: 36rpx;
    margin-bottom: 24rpx;
  }

  .skeleton-row {
    display: flex;
    gap: 24rpx;

    .skeleton-stat {
      flex: 1;
      height: 80rpx;
    }
  }
}

.skeleton-card {
  margin: 0 24rpx 16rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 20rpx;

  .skeleton-line {
    width: 100%;
    height: 32rpx;
    margin-bottom: 12rpx;

    &.short {
      width: 60%;
    }
  }
}

/* 概览卡片 */
.overview-card {
  background: #fff;
  margin: 24rpx;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  .overview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28rpx;

    .overview-title-wrap {
      display: flex;
      align-items: center;
      gap: 8rpx;

      .overview-title {
        font-size: 34rpx;
        font-weight: 700;
        color: #2d2d2d;
      }
    }

    .overview-actions {
      display: flex;
      align-items: center;
      gap: 20rpx;

      .all-task-link {
        font-size: 24rpx;
        color: #ff7b7b;
        padding: 6rpx 16rpx;
        background: rgba(255, 123, 123, 0.08);
        border-radius: 20rpx;
      }

      .overview-date {
        font-size: 24rpx;
        color: #aaa;
      }
    }

  }

  .overview-stats {
    display: flex;
    align-items: center;

    .stat-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;

      .stat-num {
        font-size: 48rpx;
        font-weight: 700;
        font-variant-numeric: tabular-nums;

        &.pending {
          color: #ff7b7b;
        }

        &.completed {
          color: #1d9e75;
        }

        &.overdue {
          color: #e24b4a;
        }
      }

      .stat-label {
        font-size: 22rpx;
        color: #999;
        margin-top: 6rpx;
      }
    }

    .stat-divider {
      width: 1rpx;
      height: 60rpx;
      background: #f0f0f0;
    }
  }

  .progress-bar {
    margin-top: 24rpx;
    height: 8rpx;
    background: #f5f5f5;
    border-radius: 999rpx;
    overflow: hidden;

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #ff7b7b, #ff9b9b);
      border-radius: 999rpx;
      transition: width 0.5s ease;
    }
  }
}

/* 分区 */
.section {
  padding: 0 24rpx;
  margin-bottom: 24rpx;

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20rpx;

    .section-title-wrap {
      display: flex;
      align-items: center;
      gap: 12rpx;

      .section-dot {
        width: 12rpx;
        height: 12rpx;
        border-radius: 50%;

        &.pending-dot {
          background: #ff7b7b;
          box-shadow: 0 0 0 4rpx rgba(255, 123, 123, 0.15);
        }

        &.overdue-dot {
          background: #e24b4a;
          box-shadow: 0 0 0 4rpx rgba(226, 75, 74, 0.15);
        }

        &.completed-dot {
          background: #1d9e75;
          box-shadow: 0 0 0 4rpx rgba(29, 158, 117, 0.15);
        }

        &.paused-dot {
          background: #7f77dd;
          box-shadow: 0 0 0 4rpx rgba(127, 119, 221, 0.15);
        }
      }

      .section-title {
        font-size: 30rpx;
        font-weight: 600;
        color: #2d2d2d;
      }
    }
  }
}

/* FAB */
.fab {
  position: fixed;
  right: 40rpx;
  bottom: 200rpx;
  width: 104rpx;
  height: 104rpx;
  background: linear-gradient(135deg, #ff7b7b, #ff6464);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 28rpx rgba(255, 123, 123, 0.45);
  z-index: 99;
  animation: fab-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes fab-in {
  from {
    opacity: 0;
    transform: scale(0) rotate(-90deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}

.bottom-space {
  height: 200rpx;
}
</style>
