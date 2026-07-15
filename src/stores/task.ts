/**
 * 提醒事项 Store
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ReminderTask, TimelineItem, TaskType, TaskPriority, WindowSkipStrategy } from '@/types';
import * as taskApi from '@/api/task';
import * as confirmApi from '@/api/confirm';
import { showLoading, hideLoading, showSuccess } from '@/utils/request';
import { TASK_TYPE_CONFIG } from '@/utils/constants';

export const useTaskStore = defineStore('task', () => {
  // ===== State =====
  const taskList = ref<ReminderTask[]>([]);
  const timeline = ref<TimelineItem[]>([]);
  const loading = ref(false);

  // ===== Getters =====
  const activeTasks = computed(() => taskList.value.filter((t) => t.enabled));
  const pendingItems = computed(() => timeline.value.filter((t) => t.status === 'pending'));
  const completedItems = computed(() => timeline.value.filter((t) => t.status === 'completed'));
  const overdueItems = computed(() => timeline.value.filter((t) => t.status === 'overdue'));

  // ===== Actions =====

  /** 加载事项列表 */
  async function loadTaskList(babyId?: string) {
    loading.value = true;
    try {
      taskList.value = await taskApi.getTaskList(babyId);
    } catch (err) {
      console.error('[加载事项列表失败]', err);
    } finally {
      loading.value = false;
    }
  }

  /** 加载首页时间线 */
  async function loadTimeline(babyId?: string) {
    loading.value = true;
    try {
      timeline.value = await taskApi.getTimeline(babyId);
    } catch (err) {
      console.error('[加载时间线失败]', err);
    } finally {
      loading.value = false;
    }
  }

  /** 添加事项 */
  async function addTask(data: {
    babyId: string;
    type: TaskType;
    customName?: string;
    firstTime: string;
    intervalMinutes: number;
    reminderWindowStart: string;
    reminderWindowEnd: string;
    windowSkipStrategy: WindowSkipStrategy;
    priority: TaskPriority;
  }): Promise<boolean> {
    showLoading('保存中...');
    try {
      const task = await taskApi.addTask(data);
      taskList.value.push(task);
      showSuccess('添加成功');
      return true;
    } catch (err) {
      console.error('[添加事项失败]', err);
      return false;
    } finally {
      hideLoading();
    }
  }

  /** 更新事项 */
  async function updateTask(taskId: string, data: Partial<ReminderTask>): Promise<boolean> {
    showLoading('保存中...');
    try {
      const task = await taskApi.updateTask(taskId, data);
      const index = taskList.value.findIndex((t) => t._id === taskId);
      if (index >= 0) {
        taskList.value[index] = task;
      }
      showSuccess('保存成功');
      return true;
    } catch (err) {
      console.error('[更新事项失败]', err);
      return false;
    } finally {
      hideLoading();
    }
  }

  /** 删除事项 */
  async function deleteTask(taskId: string): Promise<boolean> {
    showLoading('删除中...');
    try {
      await taskApi.deleteTask(taskId);
      taskList.value = taskList.value.filter((t) => t._id !== taskId);
      showSuccess('删除成功');
      return true;
    } catch (err) {
      console.error('[删除事项失败]', err);
      return false;
    } finally {
      hideLoading();
    }
  }

  /** 启用/禁用事项 */
  async function toggleTask(taskId: string, enabled: boolean) {
    try {
      const task = await taskApi.toggleTask(taskId, enabled);
      const index = taskList.value.findIndex((t) => t._id === taskId);
      if (index >= 0) {
        taskList.value[index] = task;
      }
    } catch (err) {
      console.error('[切换事项状态失败]', err);
    }
  }

  /** 确认事项 */
  async function confirmTask(data: {
    taskId: string;
    action: 'completed' | 'delayed' | 'ignored';
    delayMinutes?: number;
    remark?: string;
  }): Promise<boolean> {
    try {
      await confirmApi.confirmTask(data);
      // 更新时间线状态
      const item = timeline.value.find((t) => t.taskId === data.taskId);
      if (item) {
        if (data.action === 'completed') {
          item.status = 'completed';
        } else if (data.action === 'delayed') {
          item.status = 'delayed';
        }
      }
      showSuccess(data.action === 'completed' ? '已完成' : data.action === 'delayed' ? '已延迟' : '已忽略');
      return true;
    } catch (err) {
      console.error('[确认事项失败]', err);
      return false;
    }
  }

  return {
    taskList,
    timeline,
    loading,
    activeTasks,
    pendingItems,
    completedItems,
    overdueItems,
    loadTaskList,
    loadTimeline,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    confirmTask,
  };
});
