/**
 * 提醒事项 Store
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ReminderTask, TimelineItem, TaskType, TaskPriority, WindowSkipStrategy, TaskMode } from '@/types';
import * as taskApi from '@/api/task';
import * as confirmApi from '@/api/confirm';
import { showLoading, hideLoading, showSuccess } from '@/utils/request';

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
  const stoppedItems = computed(() => timeline.value.filter((t) => t.status === 'stopped'));

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
      const data = await taskApi.getTimeline(babyId);
      // 过滤掉字段缺失的无效条目，防止渲染时组件 props 为 null/undefined 导致渲染错误
      timeline.value = Array.isArray(data)
        ? data.filter((item) => item && item.taskId && item.type && item.status)
        : [];
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
    taskMode: TaskMode;
    repeatCount: number;
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
    action: 'completed' | 'delayed' | 'ignored' | 'stopped';
    delayMinutes?: number;
    remark?: string;
    taskType: TaskType;
    taskName: string;
    taskMode: TaskMode;
    completedCount: number;
  }): Promise<boolean> {
    try {
      await confirmApi.confirmTask(data);
      // 更新时间线状态
      const item = timeline.value.find((t) => t.taskId === data.taskId);
      if (item) {
        if (data.action === 'completed') {
          // 循环事件: 计算下次执行时间，保持 pending 状态供下一次提醒
          if (item.taskMode === 'recurring' && item.status !== 'completed') {
            const count = (item.completedCount || 0) + 1;
            item.completedCount = count;
            // 计算下次提醒时间
            const remindDate = new Date(item.nextRemindTime);
            if (!isNaN(remindDate.getTime()) && item.intervalMinutes) {
              const nextTime = new Date(remindDate.getTime() + item.intervalMinutes * 60 * 1000);
              item.nextRemindTime = nextTime.toISOString();
            }
            // 判断是否已达到循环上限
            const repeat = item.repeatCount;
            if (repeat !== -1 && count >= repeat!) {
              // 循环结束，标记为已完成
              item.status = 'completed';
            } else {
              // 仍为 pending，但本次实例已操作完成，显示已完成样式
              item.status = 'completed';
            }
          } else {
            item.status = 'completed';
          }
        } else if (data.action === 'delayed') {
          item.status = 'delayed';
        } else if (data.action === 'ignored') {
          // 忽略：本次跳过，状态不变（nextRemindTime 由云函数更新）
          // loadData 重新加载后将显示正确的状态
        } else if (data.action === 'stopped') {
          item.status = 'stopped';
          // 同时在 taskList 中禁用该任务，使其不可恢复
          const task = taskList.value.find((t) => t._id === data.taskId);
          if (task) task.enabled = false;
        }
      }
      showSuccess(data.action === 'completed' ? '已完成' : data.action === 'delayed' ? '已延迟' : data.action === 'stopped' ? '已停止' : '已忽略');
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
    stoppedItems,
    loadTaskList,
    loadTimeline,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    confirmTask,
  };
});
