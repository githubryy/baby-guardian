<template>
  <view class="task-item tap-shrink" :class="{ disabled: !task.enabled }" @tap="$emit('itemTap', task)">
    <view class="type-icon" :style="{ background: typeConfig.bgColor }">
      <u-icon :name="typeConfig.icon" :size="30" :color="typeConfig.color" />
    </view>
    <view class="task-info">
      <view class="info-header">
        <text class="task-name">{{ task.customName || typeConfig.name }}</text>
        <u-tag :text="modeConfig.name" :type="modeTagType" size="mini" shape="circle" plain />
        <u-tag :text="priorityConfig.name" :type="priorityTagType" size="mini" shape="circle" plain />
      </view>
      <view class="info-meta">
        <u-icon name="clock" :size="12" color="#aaa" />
        <text class="meta-text">{{ task.firstTime }} 起</text>
        <text class="meta-divider">·</text>
        <text class="meta-text">每{{ intervalText }}</text>
        <text class="meta-divider">·</text>
        <text class="meta-text">{{ task.reminderWindowStart }}-{{ task.reminderWindowEnd }}</text>
      </view>
      <view class="info-footer">
        <view class="next-remind-wrap">
          <view class="next-dot" :class="{ active: task.enabled }" />
          <text class="next-remind" :class="{ paused: !task.enabled }">{{ nextRemindText }}</text>
        </view>
      </view>
    </view>
    <view class="switch-wrap" @tap.stop>
      <u-switch v-model="enabledProxy" activeColor="#FF7B7B" size="20" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ReminderTask } from '@/types';
import { TASK_TYPE_CONFIG, PRIORITY_CONFIG, TASK_MODE_CONFIG } from '@/utils/constants';
import { relativeTime, durationText } from '@/utils/time';

const props = defineProps<{
  task: ReminderTask;
}>();

const emit = defineEmits<{
  (e: 'itemTap', task: ReminderTask): void;
  (e: 'toggle', task: ReminderTask, enabled: boolean): void;
}>();

const typeConfig = computed(() => TASK_TYPE_CONFIG[props.task.type]);
const priorityConfig = computed(() => PRIORITY_CONFIG[props.task.priority]);
const modeConfig = computed(() => TASK_MODE_CONFIG[props.task.taskMode || 'once']);
const modeTagType = computed<'error' | 'primary'>(() => props.task.taskMode === 'recurring' ? 'error' : 'primary');

const priorityTagType = computed<'error' | 'warning' | 'primary'>(() => {
  const map = { p0: 'error' as const, p1: 'warning' as const, p2: 'primary' as const };
  return map[props.task.priority];
});

const enabledProxy = computed({
  get: () => props.task.enabled,
  set: (val: boolean) => emit('toggle', props.task, val),
});

const intervalText = computed(() => durationText(props.task.intervalMinutes));
const nextRemindText = computed(() => {
  if (!props.task.enabled) return '已结束';
  return relativeTime(props.task.nextRemindTime);
});
</script>

<style lang="scss" scoped>
.task-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
  border: 1rpx solid #f5f5f5;
  transition: all 0.2s ease;

  &.disabled {
    opacity: 0.6;
  }

  .type-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 20rpx;
    flex-shrink: 0;
  }

  .task-info {
    flex: 1;
    min-width: 0;

    .info-header {
      display: flex;
      align-items: center;
      gap: 12rpx;
      margin-bottom: 8rpx;

      .task-name {
        font-size: 30rpx;
        font-weight: 600;
        color: #2d2d2d;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .info-meta {
      display: flex;
      align-items: center;
      gap: 6rpx;
      margin-bottom: 8rpx;

      .meta-text {
        font-size: 24rpx;
        color: #aaa;
      }

      .meta-divider {
        font-size: 20rpx;
        color: #ddd;
      }
    }

    .info-footer {
      .next-remind-wrap {
        display: flex;
        align-items: center;
        gap: 8rpx;

        .next-dot {
          width: 12rpx;
          height: 12rpx;
          border-radius: 50%;
          background: #ccc;

          &.active {
            background: #ff7b7b;
            box-shadow: 0 0 0 4rpx rgba(255, 123, 123, 0.15);
          }
        }

        .next-remind {
          font-size: 24rpx;
          color: #ff7b7b;
          font-weight: 500;

          &.paused {
            color: #bbb;
          }
        }
      }
    }
  }

  .switch-wrap {
    flex-shrink: 0;
    margin-left: 16rpx;
  }
}
</style>
