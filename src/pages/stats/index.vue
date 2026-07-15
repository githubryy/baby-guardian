<template>
  <view class="page-stats page-enter">
    <!-- 日期选择 -->
    <view class="period-tabs">
      <view v-for="tab in periodTabs" :key="tab.value" class="tab-item tap-shrink"
        :class="{ active: activePeriod === tab.value }" @tap="activePeriod = tab.value">
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <!-- 概览卡片 - 环形进度 -->
    <view class="overview-card slide-up">
      <view class="ring-section">
        <!-- 环形进度 -->
        <view class="progress-ring">
          <view class="ring-bg" />
          <view class="ring-fill" :style="ringStyle" />
          <view class="ring-content">
            <text class="ring-num">{{ summary.todayCompletionRate }}</text>
            <text class="ring-percent">%</text>
            <text class="ring-label">完成率</text>
          </view>
        </view>
        <!-- 统计数据 -->
        <view class="ring-stats">
          <view class="ring-stat-item">
            <text class="rs-num">{{ summary.todayReminders }}</text>
            <text class="rs-label">总提醒</text>
          </view>
          <view class="ring-stat-item">
            <text class="rs-num green">{{ summary.todayCompleted }}</text>
            <text class="rs-label">已完成</text>
          </view>
          <view class="ring-stat-item">
            <text class="rs-num red">{{ summary.todayReminders - summary.todayCompleted }}</text>
            <text class="rs-label">未完成</text>
          </view>
          <view class="ring-stat-item">
            <text class="rs-num blue">{{ summary.activeTasks }}</text>
            <text class="rs-label">活跃事项</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 趋势图 -->
    <view class="chart-card slide-up" style="animation-delay: 0.1s">
      <view class="chart-title">
        <u-icon name="calendar-fill" :size="18" color="#FF7B7B" />
        <text>{{ periodLabel }}趋势</text>
      </view>
      <view class="bar-chart">
        <view v-for="(stat, index) in chartData" :key="index" class="bar-item">
          <view class="bar-track">
            <view class="bar-fill" :style="{
              height: getBarHeight(stat.completionRate) + '%',
              background: stat.completionRate >= 80 ? 'linear-gradient(180deg, #28b886, #1d9e75)' : stat.completionRate >= 50 ? 'linear-gradient(180deg, #f5b547, #ef9f27)' : 'linear-gradient(180deg, #ee6a69, #e24b4a)',
              animationDelay: index * 0.05 + 's'
            }" />
          </view>
          <text class="bar-label">{{ stat.date.slice(5) }}</text>
          <text class="bar-value" :style="{ color: stat.completionRate >= 80 ? '#1d9e75' : stat.completionRate >= 50 ? '#ef9f27' : '#e24b4a' }">{{ stat.completionRate }}%</text>
        </view>
      </view>
    </view>

    <!-- 事项类型分布 -->
    <view v-if="summary.typeStats.length > 0" class="type-card slide-up" style="animation-delay: 0.15s">
      <view class="card-title">
        <u-icon name="grid-fill" :size="18" color="#FF7B7B" />
        <text>事项类型分布</text>
      </view>
      <view class="type-list">
        <view v-for="item in summary.typeStats" :key="item.type" class="type-row">
          <view class="type-info">
            <view class="type-icon-box" :style="{ background: getTaskColor(item.type) + '18' }">
              <u-icon :name="getTaskUIcon(item.type as TaskType)" :size="18" :color="getTaskColor(item.type as TaskType)" />
            </view>
            <text class="type-name">{{ item.typeName }}</text>
          </view>
          <view class="type-bar-wrap">
            <view class="type-bar" :style="{
              width: item.percentage + '%',
              background: getTaskColor(item.type as TaskType)
            }" />
          </view>
          <text class="type-count">{{ item.count }}次</text>
          <text class="type-percent">{{ item.percentage }}%</text>
        </view>
      </view>
    </view>

    <!-- 宝宝概览 -->
    <view class="summary-card slide-up" style="animation-delay: 0.2s">
      <view class="card-title">
        <u-icon name="account-fill" :size="18" color="#FF7B7B" />
        <text>宝宝概览</text>
      </view>
      <view class="summary-grid">
        <view class="summary-box">
          <text class="sb-num">{{ summary.totalBabies }}</text>
          <text class="sb-label">宝宝数量</text>
        </view>
        <view class="summary-box">
          <text class="sb-num">{{ summary.totalTasks }}</text>
          <text class="sb-label">事项总数</text>
        </view>
        <view class="summary-box">
          <text class="sb-num primary">{{ summary.activeTasks }}</text>
          <text class="sb-label">活跃事项</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <EmptyState v-if="!loading && summary.todayReminders === 0 && summary.totalTasks === 0"
      uIcon="calendar-fill" text="暂无统计数据" subText="添加提醒事项后即可查看统计" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getStatsSummary, getDailyStats } from '@/api/stats';
import { TASK_TYPE_CONFIG } from '@/utils/constants';
import { getRecentDates } from '@/utils/time';
import type { StatsSummary, TaskType } from '@/types';
import EmptyState from '@/components/EmptyState.vue';

const activePeriod = ref<'week' | 'month'>('week');
const loading = ref(false);
const summary = ref<StatsSummary>({
  totalBabies: 0,
  totalTasks: 0,
  activeTasks: 0,
  todayReminders: 0,
  todayCompleted: 0,
  todayCompletionRate: 0,
  weeklyStats: [],
  typeStats: [],
});

const periodTabs = [
  { label: '本周', value: 'week' as const },
  { label: '本月', value: 'month' as const },
];

const periodLabel = computed(() => activePeriod.value === 'week' ? '本周' : '本月');

const ringStyle = computed(() => {
  const percent = summary.value.todayCompletionRate;
  const color = percent >= 80 ? '#1d9e75' : percent >= 50 ? '#ef9f27' : '#e24b4a';
  return {
    background: `conic-gradient(${color} ${percent * 3.6}deg, #f0f0f0 ${percent * 3.6}deg)`,
  };
});

const chartData = computed(() => {
  return summary.value.weeklyStats.length > 0
    ? summary.value.weeklyStats
    : getRecentDates(7).map(date => ({ date, totalReminders: 0, completedCount: 0, delayedCount: 0, ignoredCount: 0, completionRate: 0 }));
});

onMounted(() => {
  loadData();
});

onShow(() => {
  loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const dates = activePeriod.value === 'week' ? getRecentDates(7) : getRecentDates(30);
    const [summaryData, dailyData] = await Promise.all([
      getStatsSummary(),
      getDailyStats({ startDate: dates[0], endDate: dates[dates.length - 1] }),
    ]);
    summary.value = summaryData;
    summary.value.weeklyStats = dailyData;
  } catch (err) {
    console.error('[加载统计数据失败]', err);
  } finally {
    loading.value = false;
  }
}

function getBarHeight(rate: number): number {
  return Math.max(5, rate);
}

function getTaskUIcon(type: TaskType): string {
  return TASK_TYPE_CONFIG[type]?.uIcon || 'edit-pen';
}

function getTaskColor(type: TaskType | string): string {
  return TASK_TYPE_CONFIG[type as TaskType]?.color || '#999';
}
</script>

<style lang="scss" scoped>
.page-stats {
  min-height: 100vh;
  background: #f8f8f8;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.period-tabs {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  padding: 6rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  .tab-item {
    flex: 1;
    text-align: center;
    padding: 16rpx 0;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: #999;
    transition: all 0.2s;

    &.active {
      background: linear-gradient(135deg, #ff7b7b, #ff9b9b);
      color: #fff;
      font-weight: 600;
      box-shadow: 0 4rpx 12rpx rgba(255, 123, 123, 0.3);
    }
  }
}

.overview-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  .ring-section {
    display: flex;
    align-items: center;
    gap: 32rpx;

    .progress-ring {
      position: relative;
      width: 160rpx;
      height: 160rpx;
      flex-shrink: 0;

      .ring-bg {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: #f5f5f5;
      }

      .ring-fill {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        transition: background 0.5s ease;
      }

      .ring-content {
        position: absolute;
        inset: 16rpx;
        border-radius: 50%;
        background: #fff;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        .ring-num {
          font-size: 48rpx;
          font-weight: 700;
          color: #2d2d2d;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }

        .ring-percent {
          font-size: 24rpx;
          color: #999;
          line-height: 1;
        }

        .ring-label {
          font-size: 20rpx;
          color: #aaa;
          margin-top: 4rpx;
        }
      }
    }

    .ring-stats {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16rpx;

      .ring-stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;

        .rs-num {
          font-size: 36rpx;
          font-weight: 700;
          color: #2d2d2d;
          font-variant-numeric: tabular-nums;

          &.green { color: #1d9e75; }
          &.red { color: #e24b4a; }
          &.blue { color: #378add; }
        }

        .rs-label {
          font-size: 22rpx;
          color: #999;
          margin-top: 4rpx;
        }
      }
    }
  }
}

.chart-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  .chart-title {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 30rpx;
    font-weight: 600;
    color: #2d2d2d;
    margin-bottom: 24rpx;
  }

  .bar-chart {
    display: flex;
    gap: 8rpx;
    height: 260rpx;
    align-items: flex-end;

    .bar-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;

      .bar-track {
        width: 100%;
        height: 180rpx;
        display: flex;
        align-items: flex-end;
        justify-content: center;

        .bar-fill {
          width: 70%;
          border-radius: 8rpx 8rpx 0 0;
          min-height: 8rpx;
          animation: barGrow 0.5s ease both;
        }
      }

      .bar-label {
        font-size: 18rpx;
        color: #aaa;
        margin-top: 8rpx;
      }

      .bar-value {
        font-size: 18rpx;
        font-weight: 600;
      }
    }
  }
}

@keyframes barGrow {
  from {
    height: 0 !important;
    opacity: 0;
  }
}

.type-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  .card-title {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 30rpx;
    font-weight: 600;
    color: #2d2d2d;
    margin-bottom: 24rpx;
  }

  .type-list {
    .type-row {
      display: flex;
      align-items: center;
      gap: 16rpx;
      padding: 16rpx 0;

      .type-info {
        width: 180rpx;
        display: flex;
        align-items: center;
        gap: 8rpx;

        .type-icon-box {
          width: 44rpx;
          height: 44rpx;
          border-radius: 12rpx;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .type-name {
          font-size: 26rpx;
          color: #666;
        }
      }

      .type-bar-wrap {
        flex: 1;
        height: 16rpx;
        background: #f5f5f5;
        border-radius: 8rpx;
        overflow: hidden;

        .type-bar {
          height: 100%;
          border-radius: 8rpx;
          transition: width 0.5s ease;
        }
      }

      .type-count {
        font-size: 24rpx;
        color: #999;
        width: 80rpx;
        text-align: right;
      }

      .type-percent {
        font-size: 24rpx;
        color: #666;
        width: 80rpx;
        text-align: right;
        font-weight: 600;
      }
    }
  }
}

.summary-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  .card-title {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 30rpx;
    font-weight: 600;
    color: #2d2d2d;
    margin-bottom: 24rpx;
  }

  .summary-grid {
    display: flex;
    gap: 16rpx;

    .summary-box {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24rpx 0;
      background: #f9f9f9;
      border-radius: 16rpx;

      .sb-num {
        font-size: 40rpx;
        font-weight: 700;
        color: #2d2d2d;
        font-variant-numeric: tabular-nums;

        &.primary {
          color: #ff7b7b;
        }
      }

      .sb-label {
        font-size: 22rpx;
        color: #999;
        margin-top: 4rpx;
      }
    }
  }
}
</style>
