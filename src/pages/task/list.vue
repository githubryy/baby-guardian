<template>
  <view class="page-task-list page-enter">
    <view class="page-header">
      <text class="page-title">提醒事项</text>
      <text class="page-subtitle">{{ currentBaby?.name || '请选择宝宝' }} 的提醒设置</text>
    </view>

    <!-- 模式筛选标签 -->
    <view class="filter-tabs" v-if="taskList.length > 0">
      <view
        v-for="tab in filterTabs"
        :key="tab.key"
        class="filter-tab"
        :class="{ active: activeMode === tab.key }"
        @tap="activeMode = tab.key"
      >
        {{ tab.label }}
      </view>
    </view>

    <!-- 事项列表 -->
    <view v-if="filteredList.length > 0" class="task-list slide-up-stagger">
      <TaskItem v-for="task in filteredList" :key="task._id" :task="task" @itemTap="onEditTask"
        @toggle="onToggle" />
    </view>

    <!-- 筛选为空 -->
    <EmptyState
      v-if="!loading && taskList.length > 0 && filteredList.length === 0"
      uIcon="frown" :text="activeMode === 'recurring' ? '没有重复事件' : '没有单次事件'"
      subText="换个筛选条件试试" />

    <!-- 整体为空 -->
    <EmptyState v-if="!loading && taskList.length === 0" uIcon="list-dot" text="还没有提醒事项"
      subText="添加喂养、换尿布、用药等提醒，守护宝宝每一天" actionText="添加事项" @action="goAddTask" />

    <!-- 浮动添加按钮 -->
    <FabButton />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useTaskStore } from '@/stores/task';
import { useBabyStore } from '@/stores/baby';
import type { ReminderTask } from '@/types';
import TaskItem from '@/components/TaskItem.vue';
import EmptyState from '@/components/EmptyState.vue';

const taskStore = useTaskStore();
const babyStore = useBabyStore();
const { taskList, loading } = storeToRefs(taskStore);
const { currentBaby } = storeToRefs(babyStore);

const filterTabs = [
  { key: '', label: '全部' },
  { key: 'recurring', label: '重复事件' },
  { key: 'once', label: '单次事件' },
] as const;
const activeMode = ref('');

const filteredList = computed(() => {
  if (!activeMode.value) return taskList.value;
  return taskList.value.filter((t) => t.taskMode === activeMode.value);
});

function onEditTask(task: ReminderTask) {
  if (task.endedAt) return;
  uni.navigateTo({ url: `/pages/task/edit?id=${task._id}` });
}

async function onToggle(task: ReminderTask, enabled: boolean) {
  await taskStore.toggleTask(task._id, enabled);
}

function goAddTask() {
  uni.navigateTo({ url: '/pages/task/edit' });
}
</script>

<style lang="scss" scoped>
.page-task-list {
  min-height: 100vh;
  background: #f8f8f8;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.page-header {
  margin-bottom: 24rpx;

  .page-title {
    display: block;
    font-size: 40rpx;
    font-weight: 700;
    color: #2d2d2d;
    margin-bottom: 8rpx;
  }

  .page-subtitle {
    font-size: 26rpx;
    color: #999;
  }
}

.filter-tabs {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
  padding-bottom: 8rpx;

  .filter-tab {
    padding: 12rpx 28rpx;
    font-size: 26rpx;
    color: #999;
    background: #fff;
    border-radius: 32rpx;
    border: 1rpx solid #eee;
    transition: all 0.2s ease;

    &.active {
      color: #fff;
      background: #FF7B7B;
      border-color: #FF7B7B;
      font-weight: 600;
      box-shadow: 0 4rpx 12rpx rgba(255, 123, 123, 0.25);
    }
  }
}

.task-list {
  margin-bottom: 24rpx;
}
</style>
