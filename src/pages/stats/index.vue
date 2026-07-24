<template>
  <view class="page-stats page-enter">
    <!-- 日期选择 -->
    <view class="period-tabs">
      <view
        v-for="tab in periodTabs"
        :key="tab.value"
        class="tab-item tap-shrink"
        :class="{ active: activePeriod === tab.value }"
        @tap="activePeriod = tab.value"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <!-- 概览卡片 - 四类事件统计 -->
    <view class="overview-card slide-up">
      <view class="card-title">
        <u-icon name="calendar-fill" :size="18" color="#FF7B7B" />
        <text>事件统计概览</text>
        <text class="title-hint">{{ periodLabel }} / 总计</text>
      </view>
      <view class="event-grid">
        <!-- 显著超时事件 -->
        <view class="event-card critical">
          <view
            class="ec-icon-box"
            style="background: linear-gradient(135deg, #ee6a69, #e24b4a)"
          >
            <u-icon name="error-circle-fill" :size="28" color="#fff" />
          </view>
          <view class="ec-body">
            <text class="ec-num critical">{{
              periodStats.criticallyOverdue
            }}</text>
            <text class="ec-total"
              >总计 {{ summary.totalCriticallyOverdue }}</text
            >
            <text class="ec-label">显著超时事件</text>
          </view>
        </view>
        <!-- 结束事件 -->
        <view class="event-card ended">
          <view
            class="ec-icon-box"
            style="background: linear-gradient(135deg, #f5b547, #ef9f27)"
          >
            <u-icon name="pause-circle-fill" :size="28" color="#fff" />
          </view>
          <view class="ec-body">
            <text class="ec-num ended">{{ periodStats.ended }}</text>
            <text class="ec-total">总计 {{ summary.totalEnded }}</text>
            <text class="ec-label">主动结束事件</text>
          </view>
        </view>
        <!-- 已完成事件 -->
        <view class="event-card completed">
          <view
            class="ec-icon-box"
            style="background: linear-gradient(135deg, #28b886, #1d9e75)"
          >
            <u-icon name="checkmark-circle-fill" :size="28" color="#fff" />
          </view>
          <view class="ec-body">
            <text class="ec-num completed">{{ periodStats.completed }}</text>
            <text class="ec-total">总计 {{ summary.totalCompleted }}</text>
            <text class="ec-label">已完成事件</text>
          </view>
        </view>
        <!-- 总事件统计 -->
        <view class="event-card total">
          <view
            class="ec-icon-box"
            style="background: linear-gradient(135deg, #5b7fff, #3d5bdb)"
          >
            <u-icon name="grid-fill" :size="28" color="#fff" />
          </view>
          <view class="ec-body">
            <text class="ec-num total">{{ periodStats.totalEvents }}</text>
            <text class="ec-total"
              >{{ periodLabel }}完成率 {{ periodStats.completionRate }}%</text
            >
            <text class="ec-label">总事件统计</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 事件趋势图 -->
    <view class="chart-card slide-up" style="animation-delay: 0.1s">
      <view class="chart-title">
        <u-icon name="calendar-fill" :size="18" color="#FF7B7B" />
        <text>{{ periodLabel }}事件趋势</text>
      </view>
      <view class="bar-chart">
        <view v-for="(stat, index) in chartData" :key="index" class="bar-item">
          <!-- 总数标签 -->
          <text class="bar-total-num">{{ totalForDay(stat) }}</text>
          <!-- 堆叠柱 -->
          <view class="bar-track">
            <view class="bar-stack-wrap">
              <view
                class="bar-fill-comp"
                :style="{
                  height: getStackHeight(stat.completedCount, stat) + '%',
                  background: 'linear-gradient(180deg, #28b886, #1d9e75)',
                  animationDelay: index * 0.05 + 's',
                }"
              />
              <view
                class="bar-fill-comp"
                :style="{
                  height: getStackHeight(stat.endedCount || 0, stat) + '%',
                  background: 'linear-gradient(180deg, #f5b547, #ef9f27)',
                  animationDelay: index * 0.05 + 0.1 + 's',
                }"
              />
              <view
                class="bar-fill-comp"
                :style="{
                  height:
                    getStackHeight(stat.criticallyOverdueCount || 0, stat) +
                    '%',
                  background: 'linear-gradient(180deg, #ee6a69, #e24b4a)',
                  animationDelay: index * 0.05 + 0.2 + 's',
                }"
              />
            </view>
          </view>
          <text class="bar-label">{{ stat.date.slice(5) }}</text>
        </view>
      </view>
      <!-- 图例 -->
      <view class="chart-legend">
        <view class="legend-item">
          <view class="legend-dot comp" /><text>已完成</text>
        </view>
        <view class="legend-item">
          <view class="legend-dot pause" /><text>暂停</text>
        </view>
        <view class="legend-item">
          <view class="legend-dot crit" /><text>显著超时</text>
        </view>
      </view>
    </view>

    <!-- 事项类型分布 -->
    <view
      v-if="summary.typeStats.length > 0"
      class="type-card slide-up"
      style="animation-delay: 0.15s"
    >
      <view class="card-title">
        <u-icon name="grid-fill" :size="18" color="#FF7B7B" />
        <text>事项类型分布</text>
      </view>
      <view class="type-list">
        <view
          v-for="item in summary.typeStats"
          :key="item.type"
          class="type-row"
        >
          <view class="type-info">
            <view
              class="type-icon-box"
              :style="{ background: getTaskColor(item.type) + '18' }"
            >
              <u-icon
                :name="getTaskUIcon(item.type as TaskType)"
                :size="18"
                :color="getTaskColor(item.type as TaskType)"
              />
            </view>
            <text class="type-name">{{ item.typeName }}</text>
          </view>
          <view class="type-bar-wrap">
            <view
              class="type-bar"
              :style="{
                width: item.percentage + '%',
                background: getTaskColor(item.type as TaskType),
              }"
            />
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
    <EmptyState
      v-if="
        !loading && periodStats.totalEvents === 0 && summary.totalTasks === 0
      "
      uIcon="calendar-fill"
      text="暂无统计数据"
      subText="添加提醒事项后即可查看统计"
    />
  </view>

  <!-- 浮动添加按钮 -->
  <FabButton />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getStatsSummary, getDailyStats } from "@/api/stats";
import { TASK_TYPE_CONFIG } from "@/utils/constants";
import { getRecentDates } from "@/utils/time";
import type { StatsSummary, TaskType } from "@/types";
import EmptyState from "@/components/EmptyState.vue";

const activePeriod = ref<"week" | "month">("week");
const loading = ref(false);
const summary = ref<StatsSummary>({
  totalBabies: 0,
  totalTasks: 0,
  activeTasks: 0,
  totalCriticallyOverdue: 0,
  totalEnded: 0,
  totalCompleted: 0,
  weeklyStats: [],
  typeStats: [],
});

const periodTabs = [
  { label: "本周", value: "week" as const },
  { label: "本月", value: "month" as const },
];

const periodLabel = computed(() =>
  activePeriod.value === "week" ? "本周" : "本月",
);

// 切换周期时重新加载
watch(activePeriod, () => {
  loadData();
});

const chartData = computed(() => {
  return summary.value.weeklyStats.length > 0
    ? summary.value.weeklyStats
    : getRecentDates(7).map((date) => ({
        date,
        totalReminders: 0,
        completedCount: 0,
        endedCount: 0,
        criticallyOverdueCount: 0,
        completionRate: 0,
      }));
});

onMounted(() => {
  loadData();
});

onShow(() => {
  loadData();
});

// 根据当前周期聚合 dailyData
const periodStats = computed(() => {
  const stats = summary.value.weeklyStats;
  if (stats.length === 0)
    return {
      completed: 0,
      ended: 0,
      criticallyOverdue: 0,
      totalEvents: 0,
      completionRate: 0,
    };
  return {
    completed: stats.reduce((sum, s) => sum + (s.completedCount || 0), 0),
    ended: stats.reduce((sum, s) => sum + (s.endedCount || 0), 0),
    criticallyOverdue: stats.reduce(
      (sum, s) => sum + (s.criticallyOverdueCount || 0),
      0,
    ),
    totalEvents: stats.reduce((sum, s) => {
      const curCount =
        (s.completedCount || (s.criticallyOverdueCount ? 1 : 0)) +
        (s.endedCount || 0);
      return sum + (curCount > s.totalReminders ? curCount : s.totalReminders);
    }, 0),
    completionRate: Math.round(
      stats.reduce((sum, s) => sum + (s.completionRate || 0), 0) / stats.length,
    ),
  };
});

async function loadData() {
  loading.value = true;
  try {
    const dates =
      activePeriod.value === "week" ? getRecentDates(7) : getRecentDates(30);
    const [summaryData, dailyData] = await Promise.all([
      getStatsSummary(),
      getDailyStats({ startDate: dates[0], endDate: dates[dates.length - 1] }),
    ]);
    summary.value = summaryData;
    summary.value.weeklyStats = dailyData;
  } catch (err) {
    console.error("[加载统计数据失败]", err);
  } finally {
    loading.value = false;
  }
}

function getMaxForDay(stat: Record<string, any>): number {
  const comp = Number(stat.completedCount) || 0;
  const pause = Number(stat.endedCount) || 0;
  const crit = Number(stat.criticallyOverdueCount) || 0;
  return Math.max(comp + pause + crit, 1);
}

function getStackHeight(count: number, stat: Record<string, any>): number {
  const max = getMaxForDay(stat);
  return Math.max((count / max) * 100, count > 0 ? 5 : 0);
}

function totalForDay(stat: Record<string, any>): number {
  return (
    (Number(stat.completedCount) || 0) +
    (Number(stat.endedCount) || 0) +
    (Number(stat.criticallyOverdueCount) || 0)
  );
}

function getTaskUIcon(type: TaskType): string {
  return TASK_TYPE_CONFIG[type]?.uIcon || "edit-pen";
}

function getTaskColor(type: TaskType | string): string {
  return TASK_TYPE_CONFIG[type as TaskType]?.color || "#999";
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

  .card-title {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 30rpx;
    font-weight: 600;
    color: #2d2d2d;
    margin-bottom: 24rpx;

    .title-hint {
      margin-left: auto;
      font-size: 22rpx;
      font-weight: 400;
      color: #aaa;
    }
  }

  .event-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16rpx;

    .event-card {
      background: #fafafa;
      border-radius: 16rpx;
      padding: 20rpx;
      display: flex;
      align-items: center;
      gap: 16rpx;
      transition:
        transform 0.2s,
        box-shadow 0.2s;

      &:active {
        transform: scale(0.97);
      }

      .ec-icon-box {
        width: 64rpx;
        height: 64rpx;
        border-radius: 16rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .ec-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
        text-align: center;

        .ec-num {
          font-size: 40rpx;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          line-height: 1.1;

          &.critical {
            color: #e24b4a;
          }

          &.ended {
            color: #ef9f27;
          }

          &.completed {
            color: #1d9e75;
          }

          &.total {
            color: #5b7fff;
          }
        }

        .ec-total {
          font-size: 20rpx;
          color: #bbb;
          margin-top: 2rpx;
          line-height: 1.3;
        }

        .ec-label {
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
    height: 280rpx;
    align-items: flex-end;

    .bar-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;

      .bar-total-num {
        font-size: 18rpx;
        font-weight: 600;
        color: #666;
        margin-bottom: 4rpx;
        font-variant-numeric: tabular-nums;
      }

      .bar-track {
        width: 100%;
        height: 200rpx;
        display: flex;
        align-items: flex-end;
        justify-content: center;

        .bar-stack-wrap {
          width: 70%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          border-radius: 8rpx 8rpx 0 0;
          overflow: hidden;

          .bar-fill-comp {
            width: 100%;
            min-height: 0;
            transition: height 0.4s ease;
            animation: barGrow 0.5s ease both;
          }
        }
      }

      .bar-label {
        font-size: 18rpx;
        color: #aaa;
        margin-top: 8rpx;
      }
    }
  }

  .chart-legend {
    display: flex;
    justify-content: center;
    gap: 32rpx;
    margin-top: 20rpx;
    padding-top: 16rpx;
    border-top: 1rpx solid #f0f0f0;

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6rpx;
      font-size: 22rpx;
      color: #999;

      .legend-dot {
        width: 14rpx;
        height: 14rpx;
        border-radius: 4rpx;

        &.comp {
          background: #1d9e75;
        }

        &.pause {
          background: #ef9f27;
        }

        &.crit {
          background: #e24b4a;
        }
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
