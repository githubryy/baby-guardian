/**
 * 云函数调用封装
 */
import type { CloudResult } from '@/types';

/**
 * 调用云函数
 * @param name 云函数名
 * @param data 请求数据
 * @returns 云函数返回结果
 */
export function callCloud<T = any>(name: string, data?: Record<string, any>): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data: data || {},
      success(res) {
        const result = res.result as CloudResult<T>;
        if (result && result.code === 0) {
          resolve(result.data);
        } else {
          const errMsg = result?.message || '云函数调用失败';
          uni.showToast({ title: errMsg, icon: 'none' });
          reject(new Error(errMsg));
        }
      },
      fail(err) {
        console.error(`[云函数调用失败] ${name}:`, err);
        uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
        reject(err);
      },
    });
  });
}

/**
 * 显示加载提示
 */
export function showLoading(title = '加载中...') {
  uni.showLoading({ title, mask: true });
}

/**
 * 隐藏加载提示
 */
export function hideLoading() {
  uni.hideLoading();
}

/**
 * 显示成功提示
 */
export function showSuccess(title: string) {
  uni.showToast({ title, icon: 'success' });
}

/**
 * 显示错误提示
 */
export function showError(title: string) {
  uni.showToast({ title, icon: 'none' });
}

/**
 * 显示确认弹窗
 */
export function showConfirm(title: string, content: string): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      confirmColor: '#FF7B7B',
      success(res) {
        resolve(!!res.confirm);
      },
      fail() {
        resolve(false);
      },
    });
  });
}
