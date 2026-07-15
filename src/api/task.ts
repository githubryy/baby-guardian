/**
 * 提醒事项 API
 */
import { CLOUD_FUNCTIONS } from '@/utils/constants';
import { callCloud } from '@/utils/request';
import type { ReminderTask, TaskType, TaskPriority, WindowSkipStrategy, TimelineItem } from '@/types';

/** 获取事项列表 */
export function getTaskList(babyId?: string): Promise<ReminderTask[]> {
  return callCloud<ReminderTask[]>(CLOUD_FUNCTIONS.TASK, { action: 'list', babyId });
}

/** 获取事项详情 */
export function getTaskDetail(taskId: string): Promise<ReminderTask> {
  return callCloud<ReminderTask>(CLOUD_FUNCTIONS.TASK, { action: 'detail', taskId });
}

/** 添加事项 */
export function addTask(data: {
  babyId: string;
  type: TaskType;
  customName?: string;
  firstTime: string;
  intervalMinutes: number;
  reminderWindowStart: string;
  reminderWindowEnd: string;
  windowSkipStrategy: WindowSkipStrategy;
  priority: TaskPriority;
}): Promise<ReminderTask> {
  return callCloud<ReminderTask>(CLOUD_FUNCTIONS.TASK, { action: 'add', data });
}

/** 更新事项 */
export function updateTask(taskId: string, data: Partial<ReminderTask>): Promise<ReminderTask> {
  return callCloud<ReminderTask>(CLOUD_FUNCTIONS.TASK, { action: 'update', taskId, data });
}

/** 删除事项 */
export function deleteTask(taskId: string): Promise<void> {
  return callCloud<void>(CLOUD_FUNCTIONS.TASK, { action: 'delete', taskId });
}

/** 启用/禁用事项 */
export function toggleTask(taskId: string, enabled: boolean): Promise<ReminderTask> {
  return callCloud<ReminderTask>(CLOUD_FUNCTIONS.TASK, { action: 'toggle', taskId, enabled });
}

/** 获取首页时间线 (今日待办 + 近期已完成) */
export function getTimeline(babyId?: string): Promise<TimelineItem[]> {
  return callCloud<TimelineItem[]>(CLOUD_FUNCTIONS.TASK, { action: 'timeline', babyId });
}
