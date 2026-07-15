/**
 * 统计 API
 */
import { CLOUD_FUNCTIONS } from '@/utils/constants';
import { callCloud } from '@/utils/request';
import type { StatsSummary, DailyStat, TypeStat } from '@/types';

/** 获取统计概览 */
export function getStatsSummary(babyId?: string): Promise<StatsSummary> {
  return callCloud<StatsSummary>(CLOUD_FUNCTIONS.STATS, { action: 'summary', babyId });
}

/** 获取日统计 (指定日期范围) */
export function getDailyStats(params: {
  babyId?: string;
  startDate: string;
  endDate: string;
}): Promise<DailyStat[]> {
  return callCloud<DailyStat[]>(CLOUD_FUNCTIONS.STATS, { action: 'daily', params });
}

/** 获取事项类型统计 */
export function getTypeStats(params: {
  babyId?: string;
  startDate: string;
  endDate: string;
}): Promise<TypeStat[]> {
  return callCloud<TypeStat[]>(CLOUD_FUNCTIONS.STATS, { action: 'byType', params });
}
