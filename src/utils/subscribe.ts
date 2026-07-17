/**
 * 订阅消息工具
 * 处理一次性订阅消息的授权与配额管理
 */
import { SUBSCRIBE_TEMPLATES, QUOTA_EXPIRE_DAYS, CLOUD_FUNCTIONS } from './constants';
import type { TemplateKey, QuotaSummary } from '@/types';
import { callCloud } from './request';

/**
 * 请求订阅消息授权
 * 微信限制: 每次弹窗最多 3 个模板
 * @param templates 需要授权的模板列表
 * @returns 用户授权的模板列表
 */
export function requestSubscribeAuthorization(
  templates: TemplateKey[] = ['feeding', 'care', 'medicine'],
): Promise<TemplateKey[]> {
  return new Promise((resolve, reject) => {
    const tmplIds = templates
      .map((key) => SUBSCRIBE_TEMPLATES.find((t) => t.key === key)?.templateId)
      .filter(Boolean) as string[];

    if (tmplIds.length === 0) {
      console.warn('[订阅授权] 未配置模板ID，请先在微信公众平台申请模板');
      resolve([]);
      return;
    }

    wx.requestSubscribeMessage({
      tmplIds,
      success(res: { [x: string]: string; }) {
        // res 中返回每个模板的授权结果: 'accept' | 'reject' | 'ban'
        const accepted: TemplateKey[] = [];
        templates.forEach((key, index) => {
          const tmplId = tmplIds[index];
          if (res[tmplId] === 'accept') {
            accepted.push(key);
          }
        });

        // 将授权结果上报云函数，写入配额
        if (accepted.length > 0) {
          recordSubscriptionQuota(accepted).catch((err) => {
            console.error('[订阅配额写入失败]', err);
          });
        }

        resolve(accepted);
      },
      fail(err: { errMsg: string | string[]; }) {
        console.error('[订阅授权失败]', err);
        // 用户拒绝或关闭弹窗不算错误
        if (err.errMsg?.includes('request:fail')) {
          resolve([]);
        } else {
          reject(err);
        }
      },
    });
  });
}

/**
 * 记录订阅授权到云函数 (写入配额)
 */
export function recordSubscriptionQuota(acceptedTemplates: TemplateKey[]): Promise<void> {
  return callCloud(CLOUD_FUNCTIONS.SUBSCRIBE, {
    action: 'recordQuota',
    templates: acceptedTemplates,
  });
}

/**
 * 获取当前用户配额汇总
 */
export function getQuotaSummary(): Promise<QuotaSummary> {
  return callCloud<QuotaSummary>(CLOUD_FUNCTIONS.SUBSCRIBE, {
    action: 'getQuotaSummary',
  });
}

/**
 * 在关键交互节点引导批量授权
 * P2 优化建议: 最大化单次授权收益
 * @param context 授权场景描述
 */
export async function guideBatchAuthorization(context: string = '完成确认后'): Promise<number> {
  const accepted = await requestSubscribeAuthorization(['feeding', 'care', 'medicine']);
  if (accepted.length > 0) {
    uni.showToast({
      title: `已获得${accepted.length}条提醒配额`,
      icon: 'none',
    });
  }
  return accepted.length;
}

/**
 * 检查配额是否充足，不足时引导授权
 * @returns 是否有可用配额
 */
export async function ensureQuotaAvailable(): Promise<boolean> {
  try {
    const summary = await getQuotaSummary();
    if (summary.available > 0) {
      return true;
    }
    // 配额不足，引导授权
    const confirmed = await new Promise<boolean>((resolve) => {
      uni.showModal({
        title: '提醒配额不足',
        content: '当前可用提醒次数为 0，需要您授权后才能接收提醒消息。是否现在授权？',
        confirmText: '去授权',
        confirmColor: '#FF7B7B',
        success(res) {
          resolve(!!res.confirm);
        },
        fail() {
          resolve(false);
        },
      });
    });

    if (confirmed) {
      const count = await guideBatchAuthorization('配额补充');
      return count > 0;
    }
    return false;
  } catch (err) {
    console.error('[配额检查失败]', err);
    return false;
  }
}

/**
 * 计算配额过期时间 (从现在起7天后)
 */
export function calcQuotaExpireAt(): string {
  const expire = new Date();
  expire.setDate(expire.getDate() + QUOTA_EXPIRE_DAYS);
  return expire.toISOString();
}
