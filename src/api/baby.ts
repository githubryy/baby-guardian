/**
 * 宝宝管理 API
 */
import { CLOUD_FUNCTIONS } from '@/utils/constants';
import { callCloud } from '@/utils/request';
import type { Baby, BabyGender } from '@/types';

/** 获取宝宝列表 */
export function getBabyList(): Promise<Baby[]> {
  return callCloud<Baby[]>(CLOUD_FUNCTIONS.BABY, { action: 'list' });
}

/** 获取单个宝宝详情 */
export function getBabyDetail(babyId: string): Promise<Baby> {
  return callCloud<Baby>(CLOUD_FUNCTIONS.BABY, { action: 'detail', babyId });
}

/** 添加宝宝 */
export function addBaby(data: {
  name: string;
  gender: BabyGender;
  birthday: string;
  isPremature: boolean;
  dueDate?: string;
  remark?: string;
}): Promise<Baby> {
  return callCloud<Baby>(CLOUD_FUNCTIONS.BABY, { action: 'add', data });
}

/** 更新宝宝信息 */
export function updateBaby(babyId: string, data: Partial<Baby>): Promise<Baby> {
  return callCloud<Baby>(CLOUD_FUNCTIONS.BABY, { action: 'update', babyId, data });
}

/** 删除宝宝 */
export function deleteBaby(babyId: string): Promise<void> {
  return callCloud<void>(CLOUD_FUNCTIONS.BABY, { action: 'delete', babyId });
}

/** 设置当前选中的宝宝 */
export function setActiveBaby(babyId: string): Promise<void> {
  return callCloud<void>(CLOUD_FUNCTIONS.BABY, { action: 'setActive', babyId });
}
