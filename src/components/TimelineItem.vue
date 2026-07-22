<template>
  <view class="timeline-item" :class="item.status">
    <!-- 时间线连接线 -->
    <view class="timeline-line">
      <view class="time-dot" :style="{ background: dotColor }" />
      <view class="line-connector" />
    </view>

    <!-- 内容卡片 -->
    <view class="content-card tap-shrink" @tap="$emit('item-tap', item)">
      <view class="card-header">
        <view class="type-icon" :style="{ background: safeTypeColor + '18' }">
          <u-icon :name="taskUIcon" :size="26" :color="safeTypeColor" />
        </view>
        <view class="header-info">
          <text class="type-name">{{ item.typeName }}</text>
          <text v-if="item.customName" class="custom-name">{{ item.customName }}</text>
        </view>
        <view class="header-tags">
          <u-tag :text="priorityConfig.name" :type="priorityTagType" size="mini" shape="circle" plain />
          <u-tag v-if="item.taskMode && (item.taskMode === 'recurring')" text="循环" type="error" size="mini"
            shape="circle" />
        </view>
      </view>

      <view class="card-body">
        <view class="body-row">
          <view class="baby-info">
            <u-icon name="account-fill" :size="13" color="#aaa" />
            <text class="baby-name">{{ item.babyName }}</text>
            <text v-if="item.status === 'pending' && item.lastDurationText" class="duration">
              · 距上次 {{ item.lastDurationText }}
            </text>
          </view>
          <view class="time-wrap">
            <u-icon name="clock" :size="13" color="#bbb" />
            <text class="time-text">{{ timeText }}</text>
          </view>
        </view>

        <!-- 循环事件: 进度信息 -->
        <view v-if="item.taskMode === 'recurring' && recurringProgressText" class="recurring-progress-row">
          <u-icon name="reload" :size="13" color="#ff7b7b" />
          <text class="recurring-progress-text">{{ recurringProgressText }}</text>
        </view>

        <!-- 循环事件: 下次执行时间 -->
        <view v-if="item.taskMode === 'recurring' && nextRemindTimeDisplay && item.status === 'pending'"
          class="next-remind-row">
          <u-icon name="reload" :size="13" color="#ff7b7b" />
          <text class="next-remind-label">下次执行</text>
          <text class="next-remind-remaining">{{ item.nextRemindRemaining }}</text>
        </view>

        <!-- 完成者信息（家庭协作） -->
        <view v-if="item.status === 'completed' && item.completedByName" class="operator-row">
          <view class="operator-avatar" :style="{ background: getRelationBg(item.completedByRelation) }">
            <image v-if="item.completedByAvatar" :src="item.completedByAvatar" mode="aspectFill"
              class="op-avatar-img" />
            <u-icon v-else :name="getRelationIcon(item.completedByRelation)" :size="14"
              :color="getRelationColor(item.completedByRelation)" />
          </view>
          <text class="operator-name">{{ item.completedByName }}</text>
          <!-- <text class="operator-relation" :style="{ color: getRelationColor(item.completedByRelation) }">{{ getRelationName(item.completedByRelation) }}</text> -->
          <text class="operator-action">已完成</text>
        </view>

        <!-- 指定负责人（家庭协作） -->
        <view
          v-if="(item.status === 'pending' || item.status === 'overdue' || item.status === 'paused') && item.assigneeName"
          class="assignee-row">
          <u-icon name="account-fill" :size="12" color="#ccc" />
          <text class="assignee-text">负责人：{{ item.assigneeName }}</text>
        </view>
      </view>

      <!-- 操作按钮 - 待处理/超时状态 -->
      <view v-if="item.status === 'pending' || item.status === 'overdue'" class="card-actions">
        <view class="action-btn complete tap-feedback" @tap.stop="$emit('complete', item)">
          <u-icon name="checkmark-circle-fill" :size="16" color="#fff" />
          <text class="action-label">完成</text>
        </view>
        <view class="action-btn delay tap-feedback" @tap.stop="$emit('delay', item)">
          <u-icon name="clock-fill" :size="16" color="#d88e1a" />
          <text class="action-label">延迟</text>
        </view>
        <view class="action-btn pause tap-feedback" @tap.stop="$emit('pause', item)">
          <u-icon name="pause-circle-fill" :size="16" color="#5b8def" />
          <text class="action-label">暂停</text>
        </view>
      </view>

      <!-- 操作按钮 - 暂停状态 -->
      <view v-if="item.status === 'paused'" class="card-actions">
        <view class="action-btn complete tap-feedback" @tap.stop="$emit('complete', item)">
          <u-icon name="checkmark-circle-fill" :size="16" color="#fff" />
          <text class="action-label">完成</text>
        </view>
        <view class="action-btn stop tap-feedback" @tap.stop="$emit('stop', item)">
          <u-icon name="close-circle-fill" :size="16" color="#aaa" />
          <text class="action-label">结束</text>
        </view>
        <view class="action-btn restart tap-feedback" @tap.stop="$emit('restart', item)">
          <u-icon name="play-circle-fill" :size="16" color="#17a2b8" />
          <text class="action-label">重启</text>
        </view>
      </view>

      <!-- 暂停状态标识 -->
      <view v-if="item.status === 'paused'" class="paused-info-row">
        <u-icon name="pause-circle" :size="14" color="#5b8def" />
        <text class="paused-info-text">已暂停 · 可重启恢复提醒</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { TimelineItem, FamilyRelation } from '@/types';
import { formatTime, relativeTime } from '@/utils/time';
import { TASK_TYPE_CONFIG, PRIORITY_CONFIG, FAMILY_RELATION_CONFIG } from '@/utils/constants';

const props = defineProps<{
  item: TimelineItem;
}>();

defineEmits<{
  (e: 'item-tap', item: TimelineItem): void;
  (e: 'complete', item: TimelineItem): void;
  (e: 'delay', item: TimelineItem): void;
  (e: 'pause', item: TimelineItem): void;
  (e: 'restart', item: TimelineItem): void;
  (e: 'stop', item: TimelineItem): void;
}>();

const timeText = computed(() => {
  if (props.item.status === 'completed' && props.item.completedAt) {
    return formatTime(props.item.completedAt);
  }
  if (props.item.status === 'overdue') {
    return relativeTime(props.item.nextRemindTime);
  }
  return formatTime(props.item.nextRemindTime);
});

const safeTypeColor = computed(() => props.item.typeColor || '#999');

const priorityConfig = computed(() => PRIORITY_CONFIG[props.item.priority] || PRIORITY_CONFIG.p1);

const priorityTagType = computed<'error' | 'warning' | 'primary'>(() => {
  const map: Record<string, 'error' | 'warning' | 'primary'> = {
    p0: 'error',
    p1: 'warning',
    p2: 'primary',
  };
  return map[props.item.priority] || 'primary';
});

const taskUIcon = computed(() => {
  return TASK_TYPE_CONFIG[props.item.type]?.icon || 'edit-pen';
});

// 循环进度文本
const recurringProgressText = computed(() => {
  if (!props.item.taskMode || props.item.taskMode !== 'recurring') return '';
  const count = props.item.completedCount ?? 0;
  const repeat = props.item.repeatCount;
  if (repeat === -1) return count ? `第${count}次` : '';
  return `第${count}/${repeat}次`;
});

// 下次提醒时间显示（基于 nextRemindTime + intervalMinutes 推算）
const nextRemindTimeDisplay = computed(() => {
  const nextTime = props.item.nextRemindTime;
  if (!nextTime || !props.item.intervalMinutes) return '';
  const remindDate = new Date(nextTime);
  if (isNaN(remindDate.getTime())) return '';
  const next = new Date(remindDate.getTime() + props.item.intervalMinutes * 60 * 1000);
  return formatTime(next.toISOString());
});

const dotColor = computed(() => {
  if (props.item.status === 'overdue') return '#e24b4a';
  if (props.item.status === 'completed') return '#1d9e75';
  if (props.item.status === 'delayed') return '#ef9f27';
  if (props.item.status === 'ended') return '#7f77dd';
  if (props.item.status === 'paused') return '#5b8def';
  return safeTypeColor.value;
});

// 家庭身份辅助函数
function getRelationName(relation?: FamilyRelation) {
  if (!relation) return '';
  return FAMILY_RELATION_CONFIG[relation]?.name || '';
}
function getRelationIcon(relation?: FamilyRelation) {
  if (!relation) return 'account-fill';
  return FAMILY_RELATION_CONFIG[relation]?.uIcon || 'account-fill';
}
function getRelationColor(relation?: FamilyRelation) {
  if (!relation) return '#999';
  return FAMILY_RELATION_CONFIG[relation]?.color || '#999';
}
function getRelationBg(relation?: FamilyRelation) {
  if (!relation) return '#F5F5F5';
  return FAMILY_RELATION_CONFIG[relation]?.bgColor || '#F5F5F5';
}
</script>

<style lang="scss" scoped>
.timeline-item {
  display: flex;
  margin-bottom: 20rpx;

  .timeline-line {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 48rpx;
    flex-shrink: 0;

    .time-dot {
      width: 20rpx;
      height: 20rpx;
      border-radius: 50%;
      margin-top: 30rpx;
      box-shadow: 0 0 0 6rpx rgba(255, 255, 255, 1);
      flex-shrink: 0;
      z-index: 1;
    }

    .line-connector {
      flex: 1;
      width: 2rpx;
      background: #e8e8e8;
      margin-top: 2rpx;
      min-height: 20rpx;
    }
  }

  &:last-child {
    .line-connector {
      display: none;
    }
  }

  .content-card {
    flex: 1;
    background: #fff;
    border-radius: 20rpx;
    padding: 24rpx;
    margin-bottom: 0;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
    border: 1rpx solid #f5f5f5;
    position: relative;
    overflow: hidden;
  }



  /* 循环进度信息 */

  .card-header {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 14rpx;

    .type-icon {
      width: 68rpx;
      height: 68rpx;
      border-radius: 18rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .header-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;

      .type-name {
        font-size: 30rpx;
        font-weight: 600;
        color: #2d2d2d;
      }

      .custom-name {
        font-size: 22rpx;
        color: #aaa;
        margin-top: 2rpx;
      }
    }

    .header-tags {
      display: flex;
      align-items: center;
      gap: 10rpx;
      flex-shrink: 0;
    }
  }

  .card-body {
    .body-row {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .baby-info {
        display: flex;
        align-items: center;
        gap: 4rpx;

        .baby-name {
          font-size: 26rpx;
          color: #888;
        }

        .duration {
          font-size: 24rpx;
          color: #bbb;
        }
      }

      .time-wrap {
        display: flex;
        align-items: center;
        gap: 4rpx;

        .time-text {
          font-size: 26rpx;
          color: #999;
          font-weight: 500;
          font-variant-numeric: tabular-nums;
        }
      }
    }

    /* 下次执行时间 */
    .next-remind-row {
      display: flex;
      align-items: center;
      gap: 8rpx;
      margin-top: 12rpx;
      padding: 8rpx 16rpx;
      background: #fff5f5;
      border-radius: 12rpx;
      border: 1rpx solid #ffe0e0;

      .next-remind-label {
        font-size: 22rpx;
        color: #ff7b7b;
      }

      .next-remind-remaining {
        font-size: 24rpx;
        color: #ff7b7b;
        font-weight: 600;
        margin-left: auto;
      }
    }

    /* 循环进度信息 */
    .recurring-progress-row {
      display: flex;
      align-items: center;
      gap: 8rpx;
      margin-top: 12rpx;
      padding: 8rpx 16rpx;
      background: #fff5f5;
      border-radius: 12rpx;
      border: 1rpx solid #ffe0e0;

      .recurring-progress-text {
        font-size: 24rpx;
        color: #ff7b7b;
        font-weight: 600;
        margin-left: auto;
      }
    }

    /* 操作人信息 */
    .operator-row {
      display: flex;
      align-items: center;
      gap: 8rpx;
      margin-top: 12rpx;
      padding: 8rpx 16rpx;
      background: #f0faf5;
      border-radius: 12rpx;

      .operator-avatar {
        width: 36rpx;
        height: 36rpx;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;

        .op-avatar-img {
          width: 100%;
          height: 100%;
        }
      }

      .operator-name {
        font-size: 24rpx;
        color: #2d2d2d;
        font-weight: 500;
      }

      .operator-relation {
        font-size: 20rpx;
        font-weight: 500;
      }

      .operator-action {
        font-size: 22rpx;
        color: #1d9e75;
        margin-left: auto;
      }
    }

    /* 指定负责人 */
    .assignee-row {
      display: flex;
      align-items: center;
      gap: 6rpx;
      margin-top: 8rpx;

      .assignee-text {
        font-size: 22rpx;
        color: #ccc;
      }
    }
  }

  .card-actions {
    display: flex;
    gap: 12rpx;
    margin-top: 20rpx;
    padding-top: 20rpx;
    border-top: 1rpx solid #f0f0f0;

    .action-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6rpx;
      padding: 14rpx 0;
      border-radius: 14rpx;
      font-size: 26rpx;
      font-weight: 500;

      .action-label {
        font-size: 26rpx;
      }

      &.complete {
        background: linear-gradient(135deg, #1d9e75, #28b886);
        color: #fff;
        box-shadow: 0 4rpx 12rpx rgba(29, 158, 117, 0.3);

        .action-label {
          color: #fff;
        }
      }

      &.delay {
        background: #fef5e7;
        color: #d88e1a;
      }

      &.pause {
        background: #eaf3fe;
        color: #5b8def;
      }

      &.restart {
        background: #e7f7f9;
        color: #17a2b8;
      }

      &.stop {
        background: #f5f5f5;
        color: #aaa;
      }
    }
  }

  /* 暂停提示 */
  .paused-info-row {
    display: flex;
    align-items: center;
    gap: 6rpx;
    margin-top: 12rpx;
      padding: 10rpx 16rpx;
      background: #eaf3fe;
      border-radius: 8rpx;

      .paused-info-text {
        font-size: 22rpx;
        color: #5b8def;
      }
  }

  /* 状态样式 */
  &.completed {
    .content-card {
      opacity: 0.6;
    }
  }

  &.overdue {
    .content-card {
      border-left: 6rpx solid #e24b4a;
    }

    .time-dot {
      box-shadow: 0 0 0 6rpx rgba(226, 75, 74, 0.15);
    }
  }

  &.delayed {
    .content-card {
      border-left: 6rpx solid #ef9f27;
    }
  }

  &.ended {
    .content-card {
      border-left: 6rpx solid #7f77dd;
      opacity: 0.7;
    }
  }

  &.paused {
    .content-card {
      border-left: 6rpx solid #5b8def;
      opacity: 0.85;
    }
  }
}
</style>
