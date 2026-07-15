/**
 * 家庭 Store
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Family, FamilyMember, FamilyRelation, FamilyRole, FamilySettings } from '@/types';
import * as familyApi from '@/api/family';
import { showLoading, hideLoading, showSuccess, showConfirm } from '@/utils/request';

export const useFamilyStore = defineStore('family', () => {
  // ===== State =====
  const family = ref<Family | null>(null);
  const members = ref<FamilyMember[]>([]);
  const loading = ref(false);

  // ===== Getters =====
  const hasFamily = computed(() => !!family.value);
  const familyName = computed(() => family.value?.name || '');
  const inviteCode = computed(() => family.value?.inviteCode || '');
  const memberCount = computed(() => members.value.length);
  const currentMember = computed(() => {
    // 需要配合 user store 中的 userId
    return members.value;
  });

  // ===== Actions =====

  /** 加载家庭信息 */
  async function loadFamily() {
    loading.value = true;
    try {
      const data = await familyApi.getMyFamily();
      family.value = data;
      if (data) {
        members.value = data.members || [];
      } else {
        members.value = [];
      }
    } catch (err) {
      console.error('[加载家庭信息失败]', err);
    } finally {
      loading.value = false;
    }
  }

  /** 创建家庭 */
  async function createFamily(name: string): Promise<boolean> {
    showLoading('创建中...');
    try {
      const data = await familyApi.createFamily({ name });
      family.value = data;
      members.value = data.members || [];
      showSuccess('家庭创建成功');
      return true;
    } catch (err) {
      console.error('[创建家庭失败]', err);
      return false;
    } finally {
      hideLoading();
    }
  }

  /** 通过邀请码加入家庭 */
  async function joinByCode(code: string, relation: FamilyRelation): Promise<boolean> {
    showLoading('加入中...');
    try {
      const data = await familyApi.joinByCode(code, relation);
      family.value = data;
      members.value = data.members || [];
      showSuccess('加入成功');
      return true;
    } catch (err) {
      console.error('[加入家庭失败]', err);
      return false;
    } finally {
      hideLoading();
    }
  }

  /** 重新生成邀请码 */
  async function refreshInviteCode(): Promise<string> {
    try {
      const { inviteCode: code } = await familyApi.generateInviteCode();
      if (family.value) {
        family.value.inviteCode = code;
      }
      return code;
    } catch (err) {
      console.error('[生成邀请码失败]', err);
      return '';
    }
  }

  /** 更新成员身份 */
  async function updateMember(memberId: string, data: { relation?: FamilyRelation; role?: FamilyRole }): Promise<boolean> {
    showLoading('更新中...');
    try {
      const updated = await familyApi.updateMember(memberId, data);
      const index = members.value.findIndex(m => m.userId === memberId);
      if (index >= 0) {
        members.value[index] = { ...members.value[index], ...updated };
      }
      if (family.value) {
        family.value.members = [...members.value];
      }
      showSuccess('已更新');
      return true;
    } catch (err) {
      console.error('[更新成员失败]', err);
      return false;
    } finally {
      hideLoading();
    }
  }

  /** 移除成员 */
  async function removeMember(memberId: string): Promise<boolean> {
    const confirmed = await showConfirm('确认移除', '确定要将该成员移出家庭吗？移除后该成员将无法查看宝宝信息。');
    if (!confirmed) return false;

    showLoading('移除中...');
    try {
      await familyApi.removeMember(memberId);
      members.value = members.value.filter(m => m.userId !== memberId);
      if (family.value) {
        family.value.members = [...members.value];
      }
      showSuccess('已移除');
      return true;
    } catch (err) {
      console.error('[移除成员失败]', err);
      return false;
    } finally {
      hideLoading();
    }
  }

  /** 退出家庭 */
  async function leaveFamily(): Promise<boolean> {
    const confirmed = await showConfirm('确认退出', '退出家庭后将无法查看共享的宝宝信息，确定要退出吗？');
    if (!confirmed) return false;

    showLoading('退出中...');
    try {
      await familyApi.leaveFamily();
      family.value = null;
      members.value = [];
      showSuccess('已退出家庭');
      return true;
    } catch (err) {
      console.error('[退出家庭失败]', err);
      return false;
    } finally {
      hideLoading();
    }
  }

  /** 更新家庭设置 */
  async function updateSettings(settings: Partial<FamilySettings>): Promise<boolean> {
    try {
      const newSettings = await familyApi.updateFamilySettings(settings);
      if (family.value) {
        family.value.settings = newSettings;
      }
      return true;
    } catch (err) {
      console.error('[更新设置失败]', err);
      return false;
    }
  }

  return {
    family,
    members,
    loading,
    hasFamily,
    familyName,
    inviteCode,
    memberCount,
    currentMember,
    loadFamily,
    createFamily,
    joinByCode,
    refreshInviteCode,
    updateMember,
    removeMember,
    leaveFamily,
    updateSettings,
  };
});
