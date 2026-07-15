/**
 * 确认操作 API
 */
import { CLOUD_FUNCTIONS } from '@/utils/constants';
import { callCloud } from '@/utils/request';
import type { ConfirmAction, ConfirmLog } from '@/types';

/** 确认完成/延迟/忽略 */
export function confirmTask(data: {
  taskId: string;
  action: ConfirmAction;
  delayMinutes?: number;
  remark?: string;
}): Promise<ConfirmLog> {
  return callCloud<ConfirmLog>(CLOUD_FUNCTIONS.CONFIRM, { action: 'confirm', data });
}

/** 获取确认历史 */
export function getConfirmHistory(params: {
  babyId?: string;
  taskId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ list: ConfirmLog[]; total: number }> {
  return callCloud(CLOUD_FUNCTIONS.CONFIRM, { action: 'history', params });
}
