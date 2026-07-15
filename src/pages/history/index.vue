<template>
  <view class="page-history page-enter">
    <!-- 筛选栏 -->
    <view class="filter-bar">
      <picker mode="date" :value="filterStartDate" fields="day" @change="onStartDateChange">
        <view class="date-picker tap-shrink">
          <text class="date-label">开始</text>
          <text class="date-value">{{ filterStartDate || '选择日期' }}</text>
        </view>
      </picker>
      <text class="date-separator">~</text>
      <picker mode="date" :value="filterEndDate" fields="day" @change="onEndDateChange">
        <view class="date-picker tap-shrink">
          <text class="date-label">结束</text>
          <text class="date-value">{{ filterEndDate || '至今' }}</text>
        </view>
      </picker>
      <view class="filter-reset tap-feedback" @tap="resetFilter">
        <u-icon name="reload" :size="14" color="#999" />
        <text>重置</text>
      </view>
    </view>

    <!-- 类型筛选 -->
    <scroll-view scroll-x class="type-filter" :show-scrollbar="false">
      <view class="type-chip tap-shrink" :class="{ active: !filterType }" @tap="filterType = ''">
        <text>全部</text>
      </view>
      <view v-for="opt in TASK_TYPE_OPTIONS" :key="opt.value" class="type-chip tap-shrink"
        :class="{ active: filterType === opt.value }" @tap="filterType = opt.value">
        <u-icon :name="opt.icon" :size="13" :color="filterType === opt.value ? '#fff' : opt.color" />
        <text>{{ opt.label }}</text>
      </view>
    </scroll-view>

    <!-- 骨架屏 -->
    <template v-if="loading && historyList.length === 0">
      <view class="skeleton-group" v-for="i in 3" :key="i">
        <view class="skeleton skeleton-date" />
        <view class="skeleton-item" v-for="j in 3" :key="j">
          <view class="skeleton skeleton-icon" />
          <view class="skeleton-lines">
            <view class="skeleton skeleton-line" />
            <view class="skeleton skeleton-line short" />
          </view>
        </view>
      </view>
    </template>

    <!-- 历史记录列表 -->
    <view v-if="historyList.length > 0" class="history-list">
      <view v-for="group in groupedHistory" :key="group.date" class="date-group">
        <view class="date-header">
          <text class="date-text">{{ group.dateText }}</text>
          <u-tag :text="group.items.length + ' 条'" type="info" size="mini" shape="circle" plain />
        </view>
        <view class="group-items slide-up-stagger">
          <view v-for="item in group.items" :key="item._id" class="history-item">
            <view class="item-time">
              <text class="time">{{ formatTime(item.completedTime) }}</text>
            </view>
            <view class="item-icon" :style="{ background: getTypeConfig(item).bgColor }">
              <u-icon :name="getTypeConfig(item).icon" :size="22" :color="getTypeConfig(item).color" />
            </view>
            <view class="item-info">
              <text class="item-name">{{ getTypeConfig(item).name }}</text>
              <view class="item-action-wrap">
                <view class="action-dot" :class="item.action" />
                <text class="item-action" :class="item.action">{{ actionText(item.action) }}</text>
              </view>
            </view>
            <u-tag v-if="item.delayMinutes" :text="'+' + item.delayMinutes + 'min'" type="warning" size="mini" shape="circle" plain />
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <EmptyState v-if="!loading && historyList.length === 0" uIcon="list-dot" text="暂无历史记录"
      subText="完成提醒操作后将在此显示" />

    <!-- 加载更多 -->
    <view v-if="hasMore" class="load-more tap-feedback" @tap="loadMore">
      <u-icon v-if="loadingMore" name="loading" :size="16" color="#FF7B7B" />
      <text>{{ loadingMore ? '加载中...' : '加载更多' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getConfirmHistory } from '@/api/confirm';
import { TASK_TYPE_CONFIG, TASK_TYPE_OPTIONS } from '@/utils/constants';
import { formatTime, formatDate } from '@/utils/time';
import type { ConfirmLog, TaskType, ConfirmAction } from '@/types';
import EmptyState from '@/components/EmptyState.vue';

const loading = ref(false);
const loadingMore = ref(false);
const historyList = ref<ConfirmLog[]>([]);
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const hasMore = computed(() => historyList.value.length < total.value);

const filterStartDate = ref('');
const filterEndDate = ref('');
const filterType = ref<TaskType | ''>('');

onMounted(() => {
  loadHistory();
});

onShow(() => {
  loadHistory();
});

async function loadHistory(reset = true) {
  if (reset) {
    page.value = 1;
    historyList.value = [];
  }
  loading.value = true;
  try {
    const result = await getConfirmHistory({
      startDate: filterStartDate.value || undefined,
      endDate: filterEndDate.value || undefined,
      page: page.value,
      pageSize,
    });
    historyList.value.push(...result.list);
    total.value = result.total;
  } catch (err) {
    console.error('[加载历史记录失败]', err);
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  if (hasMore.value && !loadingMore.value) {
    loadingMore.value = true;
    page.value++;
    loadHistory(false).finally(() => {
      loadingMore.value = false;
    });
  }
}

const groupedHistory = computed(() => {
  const groups: { date: string; dateText: string; items: ConfirmLog[] }[] = [];
  const groupMap: Record<string, ConfirmLog[]> = {};

  historyList.value.forEach((item) => {
    const date = formatDate(item.completedTime);
    if (!groupMap[date]) {
      groupMap[date] = [];
    }
    groupMap[date].push(item);
  });

  Object.keys(groupMap)
    .sort((a, b) => b.localeCompare(a))
    .forEach((date) => {
      const today = formatDate(new Date());
      const yesterday = formatDate(new Date(Date.now() - 86400000));
      let dateText = date;
      if (date === today) dateText = '今天';
      else if (date === yesterday) dateText = '昨天';
      groups.push({ date, dateText, items: groupMap[date] });
    });

  return groups;
});

function getTypeConfig(item: ConfirmLog) {
  return TASK_TYPE_CONFIG.custom;
}

function actionText(action: ConfirmAction): string {
  const map: Record<ConfirmAction, string> = {
    completed: '已完成',
    delayed: '已延迟',
    ignored: '已忽略',
  };
  return map[action];
}

function onStartDateChange(e: any) {
  filterStartDate.value = e.detail.value;
  loadHistory();
}

function onEndDateChange(e: any) {
  filterEndDate.value = e.detail.value;
  loadHistory();
}

function resetFilter() {
  filterStartDate.value = '';
  filterEndDate.value = '';
  filterType.value = '';
  loadHistory();
}
</script>

<style lang="scss" scoped>
.page-history {
  min-height: 100vh;
  background: #f8f8f8;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 60rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  .date-picker {
    flex: 1;
    display: flex;
    flex-direction: column;

    .date-label {
      font-size: 20rpx;
      color: #aaa;
    }

    .date-value {
      font-size: 26rpx;
      color: #2d2d2d;
      font-weight: 500;
    }
  }

  .date-separator {
    font-size: 24rpx;
    color: #ccc;
  }

  .filter-reset {
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 10rpx 24rpx;
    background: #f5f5f5;
    border-radius: 999rpx;
    font-size: 24rpx;
    color: #999;
  }
}

.type-filter {
  display: flex;
  gap: 12rpx;
  margin-bottom: 24rpx;
  white-space: nowrap;

  .type-chip {
    display: inline-flex;
    align-items: center;
    gap: 4rpx;
    padding: 12rpx 28rpx;
    background: #fff;
    border-radius: 999rpx;
    font-size: 24rpx;
    color: #666;
    border: 1rpx solid #f0f0f0;
    transition: all 0.2s;

    &.active {
      background: linear-gradient(135deg, #ff7b7b, #ff9b9b);
      color: #fff;
      border-color: transparent;
      box-shadow: 0 4rpx 12rpx rgba(255, 123, 123, 0.3);
    }
  }
}

/* 骨架屏 */
.skeleton-group {
  margin-bottom: 24rpx;

  .skeleton-date {
    width: 160rpx;
    height: 30rpx;
    margin: 0 8rpx 16rpx;
  }

  .skeleton-item {
    display: flex;
    align-items: center;
    gap: 16rpx;
    background: #fff;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 12rpx;

    .skeleton-icon {
      width: 64rpx;
      height: 64rpx;
      border-radius: 16rpx;
      flex-shrink: 0;
    }

    .skeleton-lines {
      flex: 1;

      .skeleton-line {
        width: 100%;
        height: 28rpx;
        margin-bottom: 8rpx;

        &.short {
          width: 50%;
        }
      }
    }
  }
}

.history-list {
  .date-group {
    margin-bottom: 24rpx;

    .date-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 8rpx 16rpx;

      .date-text {
        font-size: 28rpx;
        font-weight: 600;
        color: #2d2d2d;
      }
    }
  }
}

.history-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  .item-time {
    width: 72rpx;
    flex-shrink: 0;

    .time {
      font-size: 22rpx;
      color: #aaa;
      font-variant-numeric: tabular-nums;
    }
  }

  .item-icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .item-info {
    flex: 1;

    .item-name {
      display: block;
      font-size: 28rpx;
      color: #2d2d2d;
      font-weight: 500;
    }

    .item-action-wrap {
      display: flex;
      align-items: center;
      gap: 8rpx;
      margin-top: 4rpx;

      .action-dot {
        width: 10rpx;
        height: 10rpx;
        border-radius: 50%;

        &.completed { background: #1d9e75; }
        &.delayed { background: #ef9f27; }
        &.ignored { background: #ccc; }
      }

      .item-action {
        font-size: 22rpx;

        &.completed { color: #1d9e75; }
        &.delayed { color: #ef9f27; }
        &.ignored { color: #aaa; }
      }
    }
  }
}

.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  text-align: center;
  padding: 24rpx;
  color: #ff7b7b;
  font-size: 26rpx;
}
</style>
