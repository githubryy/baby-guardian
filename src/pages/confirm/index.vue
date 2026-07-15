<template>
  <view class="page-confirm">
    <!-- 事项信息卡片 -->
    <view class="task-card slide-up">
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

    <!-- 操作区域 -->
    <view class="action-card slide-up" style="animation-delay: 0.1s">
      <view class="action-title">请选择操作</view>
      <view class="action-list">
        <!-- 完成 -->
        <view class="action-item complete tap-feedback" @tap="onComplete">
          <view class="action-icon-wrap complete-bg">
            <u-icon name="checkmark-circle-fill" :size="28" color="#fff" />
          </view>
          <view class="action-text">
            <text class="action-name">已完成</text>
            <text class="action-desc">确认完成本次提醒</text>
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

const task = ref<ReminderTask | null>(null);
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
    console.log('taskStore.taskList', taskStore.taskList)
    const localTask = taskStore.taskList.find((t) => t._id === taskId.value);
    if (localTask) {
      task.value = localTask;
    } else {
      task.value = await getTaskDetail(taskId.value);
    }
    console.log('task.value', task.value)
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

function getRelationShortName(relation?: FamilyRelation): string {
  if (!relation) return '';
  return FAMILY_RELATION_CONFIG[relation]?.shortName || '';
}

function getRelationColor(relation?: FamilyRelation): string {
  if (!relation) return '#999';
  return FAMILY_RELATION_CONFIG[relation]?.color || '#999';
}

async function onComplete() {
  if (submitting.value) return;
  submitting.value = true;
  uni.showLoading({ title: '处理中...' });
  try {
    const ok = await taskStore.confirmTask({
      taskId: taskId.value,
      action: 'completed',
    });
    if (ok) {
      await guideBatchAuthorization('完成确认后');
      userStore.refreshQuota();
      uni.showToast({ title: '已完成', icon: 'success' });
      setTimeout(() => uni.navigateBack(), 800);
    }
  } finally {
    submitting.value = false;
    uni.hideLoading();
  }
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
