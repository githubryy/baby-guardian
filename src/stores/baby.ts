/**
 * 宝宝 Store
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Baby, BabyGender } from '@/types';
import * as babyApi from '@/api/baby';
import { showLoading, hideLoading, showSuccess, showError, showConfirm } from '@/utils/request';
import { calcAge } from '@/utils/time';

export const useBabyStore = defineStore('baby', () => {
  // ===== State =====
  const babyList = ref<Baby[]>([]);
  const currentBaby = ref<Baby | null>(null);
  const loading = ref(false);

  // ===== Getters =====
  const hasBaby = computed(() => babyList.value.length > 0);
  const currentBabyId = computed(() => currentBaby.value?._id || '');
  const currentBabyAge = computed(() => {
    if (!currentBaby.value) return null;
    return calcAge(currentBaby.value.birthday);
  });

  // ===== Actions =====

  /** 加载宝宝列表 */
  async function loadBabyList() {
    loading.value = true;
    try {
      babyList.value = await babyApi.getBabyList();
      // 设置当前选中的宝宝
      const active = babyList.value.find((b) => b.isActive);
      currentBaby.value = active || babyList.value[0] || null;
    } catch (err) {
      console.error('[加载宝宝列表失败]', err);
    } finally {
      loading.value = false;
    }
  }

  /** 切换当前宝宝 */
  async function switchBaby(babyId: string) {
    try {
      await babyApi.setActiveBaby(babyId);
      const baby = babyList.value.find((b) => b._id === babyId);
      if (baby) {
        babyList.value.forEach((b) => (b.isActive = b._id === babyId));
        currentBaby.value = baby;
      }
    } catch (err) {
      console.error('[切换宝宝失败]', err);
    }
  }

  /** 添加宝宝 */
  async function addBaby(data: {
    name: string;
    gender: BabyGender;
    birthday: string;
    isPremature: boolean;
    dueDate?: string;
    remark?: string;
  }): Promise<boolean> {
    showLoading('保存中...');
    try {
      const baby = await babyApi.addBaby(data);
      babyList.value.push(baby);
      // 如果是第一个宝宝，设为当前
      if (babyList.value.length === 1) {
        currentBaby.value = baby;
      }
      showSuccess('添加成功');
      return true;
    } catch (err) {
      console.error('[添加宝宝失败]', err);
      return false;
    } finally {
      hideLoading();
    }
  }

  /** 更新宝宝 */
  async function updateBaby(babyId: string, data: Partial<Baby>): Promise<boolean> {
    showLoading('保存中...');
    try {
      const baby = await babyApi.updateBaby(babyId, data);
      const index = babyList.value.findIndex((b) => b._id === babyId);
      if (index >= 0) {
        babyList.value[index] = baby;
      }
      if (currentBaby.value?._id === babyId) {
        currentBaby.value = baby;
      }
      showSuccess('保存成功');
      return true;
    } catch (err) {
      console.error('[更新宝宝失败]', err);
      return false;
    } finally {
      hideLoading();
    }
  }

  /** 删除宝宝 */
  async function deleteBaby(babyId: string): Promise<boolean> {
    const confirmed = await showConfirm('确认删除', '删除宝宝后将同时删除其所有提醒事项和历史记录，此操作不可撤销。');
    if (!confirmed) return false;

    showLoading('删除中...');
    try {
      await babyApi.deleteBaby(babyId);
      babyList.value = babyList.value.filter((b) => b._id !== babyId);
      if (currentBaby.value?._id === babyId) {
        currentBaby.value = babyList.value[0] || null;
      }
      showSuccess('删除成功');
      return true;
    } catch (err) {
      console.error('[删除宝宝失败]', err);
      return false;
    } finally {
      hideLoading();
    }
  }

  return {
    babyList,
    currentBaby,
    loading,
    hasBaby,
    currentBabyId,
    currentBabyAge,
    loadBabyList,
    switchBaby,
    addBaby,
    updateBaby,
    deleteBaby,
  };
});
