/**
 * 用户 Store
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, UserSettings, QuotaSummary, FamilyRelation } from '@/types';
import * as userApi from '@/api/user';
import { getQuotaSummary } from '@/utils/subscribe';
import { DEFAULT_QUIET_HOURS, FAMILY_RELATION_CONFIG } from '@/utils/constants';

export const useUserStore = defineStore('user', () => {
  // ===== State =====
  const user = ref<User | null>(null);
  const quotaSummary = ref<QuotaSummary | null>(null);
  const isLogin = ref(false);
  const loginLoading = ref(false);

  // ===== Getters =====
  const nickName = computed(() => user.value?.nickName || '未登录');
  const avatarUrl = computed(() => user.value?.avatarUrl || '');
  const settings = computed<UserSettings>(() => user.value?.settings || {
    globalPushEnabled: true,
    quietHoursStart: DEFAULT_QUIET_HOURS.start,
    quietHoursEnd: DEFAULT_QUIET_HOURS.end,
  });
  const availableQuota = computed(() => quotaSummary.value?.available ?? 0);
  /** 是否需要进行角色引导（关系未设置） */
  const needsOnboarding = computed(() => isLogin.value && !user.value?.relation);
  /** 当前用户身份关系 */
  const userRelation = computed(() => user.value?.relation);

  // ===== Actions =====

  /** 初始化登录 (静默) */
  async function initLogin() {
    if (isLogin.value || loginLoading.value) return;
    loginLoading.value = true;
    try {
      const userData = await userApi.login();
      user.value = userData;
      isLogin.value = true;
      // 同步获取配额
      refreshQuota().catch(() => {});
    } catch (err) {
      console.error('[登录失败]', err);
    } finally {
      loginLoading.value = false;
    }
  }

  /** 刷新用户信息 */
  async function refreshUser() {
    try {
      const userData = await userApi.getCurrentUser();
      user.value = userData;
    } catch (err) {
      console.error('[刷新用户信息失败]', err);
    }
  }

  /** 更新用户设置 */
  async function updateSettings(newSettings: Partial<UserSettings>) {
    try {
      const userData = await userApi.updateSettings(newSettings);
      user.value = userData;
    } catch (err) {
      console.error('[更新设置失败]', err);
      throw err;
    }
  }

  /** 刷新配额汇总 */
  async function refreshQuota() {
    try {
      quotaSummary.value = await getQuotaSummary();
    } catch (err) {
      console.error('[获取配额失败]', err);
    }
  }

  /** 设置用户身份角色，同时同步角色到昵称 */
  async function setRelation(relation: FamilyRelation) {
    try {
      const roleName = FAMILY_RELATION_CONFIG[relation]?.name || '';
      const userData = await userApi.updateUser({ relation, nickName: roleName });
      user.value = userData;
      return true;
    } catch (err) {
      console.error('[设置角色失败]', err);
      throw err;
    }
  }

  return {
    user,
    quotaSummary,
    isLogin,
    loginLoading,
    nickName,
    avatarUrl,
    settings,
    availableQuota,
    needsOnboarding,
    userRelation,
    initLogin,
    refreshUser,
    updateSettings,
    refreshQuota,
    setRelation,
  };
});
