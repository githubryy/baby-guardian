/**
 * 用户 API
 */
import { CLOUD_FUNCTIONS } from '@/utils/constants';
import { callCloud } from '@/utils/request';
import type { User, UserSettings } from '@/types';

/** 微信登录并获取/创建用户 */
export function login(): Promise<User> {
  return callCloud<User>(CLOUD_FUNCTIONS.SUBSCRIBE, { action: 'login' });
}

/** 更新用户信息 */
export function updateUser(data: Partial<User>): Promise<User> {
  return callCloud<User>(CLOUD_FUNCTIONS.SUBSCRIBE, {
    action: 'updateUser',
    data,
  });
}

/** 更新用户设置 */
export function updateSettings(settings: Partial<UserSettings>): Promise<User> {
  return callCloud<User>(CLOUD_FUNCTIONS.SUBSCRIBE, {
    action: 'updateSettings',
    settings,
  });
}

/** 获取当前用户信息 */
export function getCurrentUser(): Promise<User> {
  return callCloud<User>(CLOUD_FUNCTIONS.SUBSCRIBE, { action: 'getCurrentUser' });
}
