<template>
  <view class="page-confirm">
    <!-- 事项信息卡片 -->
    <view v-if="task" class="task-card slide-up">
      <view class="task-type" :style="{ background: typeConfig.bgColor }">
        <view class="type-icon-wrap" :style="{ background: typeConfig.color }">
          <u-icon :name="typeConfig.uIcon" :size="28" color="#fff" />
        </view>
        <text class="type-name">{{ task?.customName || typeConfig.name }}</text>
        <u-tag :text="priorityConfig.name" :type="priorityTagType" size="mini" shape="circle" />
      </view>
      <view class="task-info">
        <view class="info-row">
          <view class="info-left">
            <u-icon name="account-fill" :size="15" color="#aaa" />
            <text class="info-label">宝宝</text>
          </view>
          <text class="info-value">{{ babyName }}</text>
        </view>
        <view class="info-row" v-if="task?.taskMode === 'recurring'">
          <view class="info-left">
            <u-icon name="reload" :size="15" color="#aaa" />
            <text class="info-label">事件模式</text>
          </view>
          <text class="info-value" style="color: #ff7b7b">
            {{ recurringModeText }}
          </text>
        </view>
        <view class="info-row">
          <view class="info-left">
            <u-icon name="clock-fill" :size="15" color="#aaa" />
            <text class="info-label">提醒时间</text>
          </view>
          <text class="info-value highlight">{{ remindTimeText }}</text>
        </view>
        <view class="info-row" v-if="lastDurationText">
          <view class="info-left">
            <u-icon name="reload" :size="15" color="#aaa" />
            <text class="info-label">距上次</text>
          </view>
          <text class="info-value">{{ lastDurationText }}</text>
        </view>
        <view class="info-row" v-if="lastCompletedByText">
          <view class="info-left">
            <u-icon name="account-fill" :size="15" color="#aaa" />
            <text class="info-label">上次完成</text>
          </view>
          <view class="info-value operator-info">
            <text class="operator-name-text" :style="{ color: getRelationColor(task?.lastCompletedByRelation) }">{{ lastCompletedByText }}</text>
            <text class="operator-relation-tag" :style="{ color: getRelationColor(task?.lastCompletedByRelation), background: getRelationColor(task?.lastCompletedByRelation) + '15' }" v-if="task?.lastCompletedByRelation">{{ getRelationShortName(task.lastCompletedByRelation) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 已完成提示 -->
    <view v-if="isCompleted" class="action-card completed-card slide-up" style="animation-delay: 0.1s">
      <view class="completed-content">
        <view class="completed-icon-wrap">
          <u-icon name="checkmark-circle-fill" :size="56" color="#1d9e75" />
        </view>
        <text class="completed-title">该事件已完成</text>
        <text class="completed-desc">{{ completedDescText }}</text>
      </view>
    </view>

    <!-- 操作区域 -->
    <view v-else class="action-card slide-up" style="animation-delay: 0.1s">
      <view class="action-title">请选择操作</view>
      <view class="action-list">
        <!-- 完成 -->
        <view class="action-item complete tap-feedback" @tap="onComplete">
          <view class="action-icon-wrap complete-bg">
            <u-icon name="checkmark-circle-fill" :size="28" color="#fff" />
          </view>
          <view class="action-text">
            <text class="action-name">已完成</text>
            <text class="action-desc">{{ completeActionDesc }}</text>
          </view>
          <u-icon name="arrow-right" :size="16" color="#ccc" />
        </view>

        <!-- 延迟 -->
        <view class="action-item tap-feedback" @tap="onDelay">
          <view class="action-icon-wrap delay-bg">
            <u-icon name="clock-fill" :size="28" color="#d88e1a" />
          </view>
          <view class="action-text">
            <text class="action-name">稍后提醒</text>
            <text class="action-desc">延迟 15/30/60/120 分钟</text>
          </view>
          <u-icon name="arrow-right" :size="16" color="#ccc" />
        </view>

        <!-- 忽略 -->
        <view class="action-item tap-feedback" @tap="onIgnore">
          <view class="action-icon-wrap ignore-bg">
            <u-icon name="close-circle-fill" :size="28" color="#aaa" />
          </view>
          <view class="action-text">
            <text class="action-name">忽略本次</text>
            <text class="action-desc">跳过本次提醒</text>
          </view>
          <u-icon name="arrow-right" :size="16" color="#ccc" />
        </view>

        <!-- 结束该事件 -->
        <view class="action-item pause tap-feedback" @tap="onPause">
          <view class="action-icon-wrap pause-bg">
            <u-icon name="pause-circle-fill" :size="28" color="#7f77dd" />
          </view>
          <view class="action-text">
            <text class="action-name">结束该事件</text>
            <text class="action-desc">永久结束该事件，不可恢复</text>
          </view>
          <u-icon name="arrow-right" :size="16" color="#ccc" />
        </view>
      </view>
    </view>

    <!-- 订阅配额提示 -->
    <view v-if="availableQuota <= 2" class="quota-tip slide-up" @tap="onSupplementQuota" style="animation-delay: 0.2s">
      <view class="quota-tip-icon-wrap">
        <u-icon name="bell-fill" :size="22" color="#d88e1a" />
      </view>
      <view class="quota-tip-text">
        <text class="quota-tip-title">提醒配额不足 ({{ availableQuota }} 次)</text>
        <text class="quota-tip-desc">授权后可获得更多提醒次数</text>
      </view>
      <view class="quota-tip-action tap-feedback">
        <text>去授权</text>
        <u-icon name="arrow-right" :size="12" color="#d88e1a" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { storeToRefs } from 'pinia';
import { useTaskStore } from '@/stores/task';
import { useBabyStore } from '@/stores/baby';
import { useUserStore } from '@/stores/user';
import { TASK_TYPE_CONFIG, PRIORITY_CONFIG, FAMILY_RELATION_CONFIG } from '@/utils/constants';
import { formatTime, relativeTime } from '@/utils/time';
import { guideBatchAuthorization } from '@/utils/subscribe';
import { getTaskDetail } from '@/api/task';
import type { ReminderTask, FamilyRelation } from '@/types';

const taskStore = useTaskStore();
const babyStore = useBabyStore();
const userStore = useUserStore();
const { availableQuota } = storeToRefs(userStore);

const task = ref<ReminderTask>({
  _id: '',
  babyId: '',
  userId: '',
  type: 'feeding',
  enabled: false,
  firstTime: '',
  intervalMinutes: 0,
  nextRemindTime: '',
  reminderWindowStart: '',
  reminderWindowEnd: '',
  windowSkipStrategy: 'delay_to_next_window',
  retryCount: 0,
  processingLock: false,
  priority: 'p0',
  taskMode: 'once',
  repeatCount: 0,
  completedCount: 0,
  createdAt: ''
});
const taskId = ref('');
const submitting = ref(false);

onLoad((options) => {
  if (options?.taskId) {
    taskId.value = options.taskId;
    loadTask();
  }
});

async function loadTask() {
  try {
    const localTask = taskStore.taskList.find((t) => t._id === taskId.value);
    if (localTask) {
      task.value = localTask;
    } else {
      task.value = await getTaskDetail(taskId.value);
    }
  } catch (err) {
    console.error('[加载事项详情失败]', err);
  }
}

const typeConfig = computed(() => {
  if (!task.value) return TASK_TYPE_CONFIG.custom;
  return TASK_TYPE_CONFIG[task.value.type];
});

const priorityConfig = computed(() => {
  if (!task.value) return PRIORITY_CONFIG.p1;
  return PRIORITY_CONFIG[task.value.priority];
});

const priorityTagType = computed<'error' | 'warning' | 'primary'>(() => {
  if (!task.value) return 'warning' as const;
  const map = { p0: 'error' as const, p1: 'warning' as const, p2: 'primary' as const };
  return map[task.value.priority];
});

const babyName = computed(() => {
  if (!task.value) return '';
  const baby = babyStore.babyList.find((b) => b._id === task.value!.babyId);
  return baby?.name || '';
});

const remindTimeText = computed(() => {
  if (!task.value) return '';
  return formatTime(task.value.nextRemindTime);
});

const lastDurationText = computed(() => {
  if (!task.value?.lastCompletedTime) return '';
  return relativeTime(task.value.lastCompletedTime);
});

const lastCompletedByText = computed(() => {
  if (!task.value?.lastCompletedByName) return '';
  return task.value.lastCompletedByName;
});

// 循环模式显示文本
const recurringModeText = computed(() => {
  const t = task.value;
  if (!t || t.taskMode !== 'recurring') return '';
  const count = t.completedCount || 0;
  if (t.repeatCount === -1) return `循环执行 · 第 ${count} 次`;
  return `循环执行 · 第 ${count}/${t.repeatCount} 次`;
});

// 是否已完成（一次性任务已完成 或 循环任务已完成全部次数）
const isCompleted = computed(() => {
  const t = task.value;
  if (!t) return false;
  // 一次性任务: lastCompletedTime 存在即为已完成
  if (t.taskMode === 'once' && t.lastCompletedTime) return true;
  // 循环任务: repeatCount > 0 且 completedCount >= repeatCount 表示全部完成
  if (t.taskMode === 'recurring' && t.repeatCount > 0 && (t.completedCount || 0) >= t.repeatCount) return true;
  return false;
});

// 已完成描述文字
const completedDescText = computed(() => {
  const t = task.value;
  if (!t) return '';
  if (t.taskMode === 'once') return '该一次性事件已确认完成';
  if (t.taskMode === 'recurring') return `已完成全部 ${t.repeatCount} 次循环`;
  return '';
});

// 完成操作描述（循环事件显示下次执行时间）
const completeActionDesc = computed(() => {
  if (task.value?.taskMode !== 'recurring') return '确认完成本次提醒';
  const nextTime = getNextRemindTime();
  if (nextTime) return `完成后下次提醒: ${nextTime}`;
  return '确认完成本次循环提醒';
});

function getRelationShortName(relation?: FamilyRelation): string {
  if (!relation) return '';
  return FAMILY_RELATION_CONFIG[relation]?.shortName || '';
}

function getRelationColor(relation?: FamilyRelation): string {
  if (!relation) return '#999';
  return FAMILY_RELATION_CONFIG[relation]?.color || '#999';
}

/** 获取事项名称（用于日志记录） */
function getTaskName(): string {
  if (!task.value) return '未命名';
  if (task.value.type === 'custom') return task.value.customName || '自定义事项';
  return TASK_TYPE_CONFIG[task.value.type]?.name || task.value.type || '未命名';
}

async function onComplete() {
  if (submitting.value) return;
  submitting.value = true;
  uni.showLoading({ title: '处理中...' });

  // 必须在 await confirmTask 之前调用，否则丢失 TAP 手势上下文导致授权失败
  const accepted = await guideBatchAuthorization('完成确认后', task.value?.type);
  if (accepted === 0) {
    submitting.value = false;
    uni.hideLoading();
    return;
  }

  try {
    const ok = await taskStore.confirmTask({
      taskId: taskId.value,
      action: 'completed',
      taskType: task.value?.type,
      taskName: getTaskName(),
      taskMode: task.value?.taskMode,
      completedCount: task.value?.completedCount,
    });
    if (ok) {
      userStore.refreshQuota();
      // 循环事件: 提示下次执行时间
      if (task.value?.taskMode === 'recurring') {
        const nextTime = getNextRemindTime();
        if (nextTime) {
          uni.showToast({ title: `已完成，下次 ${nextTime}`, icon: 'success', duration: 2500 });
        } else {
          uni.showToast({ title: '已完成', icon: 'success' });
        }
      } else {
        uni.showToast({ title: '已完成', icon: 'success' });
      }
      setTimeout(() => uni.navigateBack(), 800);
    }
  } finally {
    submitting.value = false;
    uni.hideLoading();
  }
}

// 计算下次提醒时间(用于toast提示)
function getNextRemindTime(): string {
  const t = task.value;
  if (!t || t.taskMode !== 'recurring' || !t.intervalMinutes) return '';
  const remindDate = new Date(t.nextRemindTime);
  if (isNaN(remindDate.getTime())) return '';
  const next = new Date(remindDate.getTime() + t.intervalMinutes * 60 * 1000);
  const hh = String(next.getHours()).padStart(2, '0');
  const mm = String(next.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function onDelay() {
  if (submitting.value) return;
  uni.showActionSheet({
    itemList: ['延迟 15 分钟', '延迟 30 分钟', '延迟 1 小时', '延迟 2 小时'],
    success: async (res) => {
      const minutes = [15, 30, 60, 120][res.tapIndex];
      submitting.value = true;
      uni.showLoading({ title: '处理中...' });
      try {
        const ok = await taskStore.confirmTask({
          taskId: taskId.value,
          action: 'delayed',
          delayMinutes: minutes,
          taskType: task.value?.type,
          taskName: getTaskName(),
          taskMode: task.value?.taskMode,
          completedCount: task.value?.completedCount
        });
        if (ok) {
          uni.showToast({ title: `已延迟${minutes}分钟`, icon: 'none' });
          setTimeout(() => uni.navigateBack(), 800);
        }
      } finally {
        submitting.value = false;
        uni.hideLoading();
      }
    },
  });
}

async function onIgnore() {
  if (submitting.value) return;
  uni.showModal({
    title: '确认忽略',
    content: '忽略后本次提醒将不再推送，确定要忽略吗？',
    confirmColor: '#FF7B7B',
    success: async (res) => {
      if (res.confirm) {
        submitting.value = true;
        uni.showLoading({ title: '处理中...' });
        try {
          const ok = await taskStore.confirmTask({
            taskId: taskId.value,
            action: 'ignored',
            taskType: task.value?.type,
            taskName: getTaskName(),
            taskMode: task.value?.taskMode,
            completedCount: task.value?.completedCount
          });
          if (ok) uni.navigateBack();
        } finally {
          submitting.value = false;
          uni.hideLoading();
        }
      }
    },
  });
}

async function onPause() {
  if (submitting.value) return;
  uni.showModal({
    title: '确认结束',
    content: '结束后该事件将永久停用，不可恢复。若需要该类型的提醒，需要重新添加。确定要结束吗？',
    confirmColor: '#e24b4a',
    success: async (res) => {
      if (res.confirm) {
        submitting.value = true;
        uni.showLoading({ title: '处理中...' });
        try {
          const ok = await taskStore.confirmTask({
            taskId: taskId.value,
            action: 'paused',
            taskType: task.value?.type,
            taskName: getTaskName(),
            taskMode: task.value?.taskMode,
            completedCount: task.value?.completedCount
          });
          if (ok) {
            uni.showToast({ title: '事件已结束，需重新添加才能恢复', icon: 'none', duration: 2000 });
            setTimeout(() => uni.navigateBack(), 1000);
          }
        } finally {
          submitting.value = false;
          uni.hideLoading();
        }
      }
    },
  });
}

async function onSupplementQuota() {
  await guideBatchAuthorization('配额补充');
  userStore.refreshQuota();
}
</script>

<style lang="scss" scoped>
.page-confirm {
  min-height: 100vh;
  background: #f8f8f8;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.task-card {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  .task-type {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding: 32rpx;
    position: relative;

    .type-icon-wrap {
      width: 72rpx;
      height: 72rpx;
      border-radius: 18rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .type-name {
      flex: 1;
      font-size: 34rpx;
      font-weight: 700;
      color: #2d2d2d;
    }
  }

  .task-info {
    padding: 0 32rpx 24rpx;

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18rpx 0;
      border-bottom: 1rpx solid #f5f5f5;

      &:last-child {
        border-bottom: none;
      }

      .info-left {
        display: flex;
        align-items: center;
        gap: 8rpx;

        .info-label {
          font-size: 26rpx;
          color: #999;
        }
      }

      .info-value {
        font-size: 26rpx;
        color: #2d2d2d;
        font-weight: 500;

        &.highlight {
          color: #ff7b7b;
          font-weight: 600;
          font-size: 28rpx;
        }

        &.operator-info {
          display: flex;
          align-items: center;
          gap: 8rpx;

          .operator-name-text {
            font-size: 26rpx;
            font-weight: 500;
          }

          .operator-relation-tag {
            font-size: 20rpx;
            padding: 2rpx 10rpx;
            border-radius: 6rpx;
            font-weight: 500;
          }
        }
      }
    }
  }
}

.action-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  .action-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #2d2d2d;
    margin-bottom: 24rpx;
  }

  .action-list {
    .action-item {
      display: flex;
      align-items: center;
      gap: 24rpx;
      padding: 24rpx;
      background: #f9f9f9;
      border-radius: 18rpx;
      margin-bottom: 16rpx;
      border: 1rpx solid transparent;
      transition: all 0.2s ease;

      &:last-child {
        margin-bottom: 0;
      }

      &.complete {
        background: #e8f7f0;
        border-color: rgba(29, 158, 117, 0.15);
      }

      &.pause {
        background: #f3f0fc;
        border-color: rgba(127, 119, 221, 0.15);
      }

      .action-icon-wrap {
        width: 80rpx;
        height: 80rpx;
        border-radius: 22rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        &.complete-bg {
          background: linear-gradient(135deg, #1d9e75, #28b886);
          box-shadow: 0 4rpx 12rpx rgba(29, 158, 117, 0.3);
        }

        &.delay-bg {
          background: linear-gradient(135deg, #fef5e7, #fce4b3);
        }

        &.ignore-bg {
          background: #f0f0f0;
        }

        &.pause-bg {
          background: linear-gradient(135deg, #f3f0fc, #e8e4f8);
        }
      }

      .action-text {
        flex: 1;

        .action-name {
          display: block;
          font-size: 30rpx;
          font-weight: 600;
          color: #2d2d2d;
        }

        .action-desc {
          display: block;
          font-size: 24rpx;
          color: #999;
          margin-top: 4rpx;
        }
      }
    }
  }
}

.completed-card {
  .completed-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48rpx 0 32rpx;

    .completed-icon-wrap {
      margin-bottom: 24rpx;
    }

    .completed-title {
      font-size: 32rpx;
      font-weight: 700;
      color: #1d9e75;
      margin-bottom: 8rpx;
    }

    .completed-desc {
      font-size: 26rpx;
      color: #999;
    }
  }
}

.quota-tip {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: linear-gradient(135deg, #fef5e7, #fff8e8);
  border: 1rpx solid #f5d990;
  border-radius: 18rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(239, 159, 39, 0.1);

  .quota-tip-icon-wrap {
    width: 56rpx;
    height: 56rpx;
    border-radius: 14rpx;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .quota-tip-text {
    flex: 1;

    .quota-tip-title {
      display: block;
      font-size: 28rpx;
      color: #d88e1a;
      font-weight: 600;
    }

    .quota-tip-desc {
      display: block;
      font-size: 22rpx;
      color: #c4a15a;
      margin-top: 4rpx;
    }
  }

  .quota-tip-action {
    display: flex;
    align-items: center;
    gap: 2rpx;
    font-size: 26rpx;
    color: #d88e1a;
    font-weight: 600;
    padding: 8rpx 20rpx;
    background: #fff;
    border-radius: 999rpx;
    box-shadow: 0 2rpx 8rpx rgba(239, 159, 39, 0.15);
  }
}
</style>
