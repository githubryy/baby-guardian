<template>
  <view class="page-task-list page-enter">
    <view class="page-header">
      <text class="page-title">提醒事项</text>
      <text class="page-subtitle">{{ currentBaby?.name || '请选择宝宝' }} 的提醒设置</text>
    </view>

    <!-- 事项列表 -->
    <view v-if="taskList.length > 0" class="task-list slide-up-stagger">
      <TaskItem v-for="task in taskList" :key="task._id" :task="task" @tap="onEditTask"
        @toggle="onToggle" />
    </view>

    <!-- 空状态 -->
    <EmptyState v-if="!loading && taskList.length === 0" uIcon="list-dot" text="还没有提醒事项"
      subText="添加喂养、换尿布、用药等提醒，守护宝宝每一天" actionText="添加事项" @action="goAddTask" />

    <!-- 添加按钮 -->
    <view class="add-btn-wrap tap-feedback" v-if="taskList.length > 0">
      <view class="add-btn" @tap="goAddTask">
        <u-icon name="plus" :size="18" color="#FF7B7B" />
        <text class="add-text">添加事项</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
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

onShow(() => {
  if (currentBaby.value) {
    taskStore.loadTaskList(currentBaby.value._id);
  }
});

function onEditTask(task: ReminderTask) {
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
  margin-bottom: 32rpx;

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

.task-list {
  margin-bottom: 24rpx;
}

.add-btn-wrap {
  .add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    height: 96rpx;
    background: #fff;
    border: 2rpx dashed #ff7b7b;
    border-radius: 24rpx;
    transition: all 0.2s ease;

    .add-text {
      font-size: 30rpx;
      color: #ff7b7b;
    }
  }
}
</style>
