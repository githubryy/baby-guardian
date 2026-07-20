/**
 * 订阅消息工具
 * 处理一次性订阅消息的授权与配额管理
 */
import { SUBSCRIBE_TEMPLATES, QUOTA_EXPIRE_DAYS, CLOUD_FUNCTIONS } from './constants';
import type { TemplateKey, QuotaSummary, TaskType } from '@/types';
import { callCloud } from './request';

/**
 * 防重入锁: 防止上一次 wx.requestSubscribeMessage 未结束时再次调用
 */
let subscribingLock = false;

/**
 * 请求订阅消息授权
 * 微信限制: 每次弹窗最多 3 个模板，不支持并发调用
 * @param templates 需要授权的模板列表
 * @returns 用户授权的模板列表
 */
export function requestSubscribeAuthorization(
  templates: TemplateKey[] = ['feeding', 'care', 'medicine'],
): Promise<TemplateKey[]> {
  return new Promise((resolve, reject) => {
    if (subscribingLock) {
      console.warn('[订阅授权] 上一次授权弹窗尚未关闭，跳过本次请求');
      resolve([]);
      return;
    }

    // 构建 key → templateId 映射，避免索引错位
    const keyToTmplId: Record<string, string> = {};
    const tmplIds: string[] = [];
    for (const key of templates) {
      const t = SUBSCRIBE_TEMPLATES.find((item) => item.key === key);
      if (t?.templateId) {
        keyToTmplId[key] = t.templateId;
        tmplIds.push(t.templateId);
      }
    }
    console.log('tmplIds', tmplIds)
    if (tmplIds.length === 0) {
      console.warn('[订阅授权] 未配置模板ID，请先在微信公众平台申请模板');
      resolve([]);
      return;
    }

    subscribingLock = true;
    wx.requestSubscribeMessage({
      tmplIds,
      success(res: { [x: string]: string; }) {
        console.log('res', res)
        subscribingLock = false;
        // res 中返回每个模板的授权结果: 'accept' | 'reject' | 'ban'
        const accepted: TemplateKey[] = [];
        for (const key of templates) {
          const tmplId = keyToTmplId[key];
          if (tmplId && res[tmplId] === 'accept') {
            accepted.push(key);
          }
        }
        console.log('accepted', accepted)
        // 将授权结果上报云函数，写入配额
        if (accepted.length > 0) {
          recordSubscriptionQuota(accepted).catch((err) => {
            console.error('[订阅配额写入失败]', err);
          });
        }

        resolve(accepted);
      },
      fail(err: { errMsg: string | string[]; }) {
        subscribingLock = false;
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
 * 根据任务类型获取对应的订阅模板 key
 * @param taskType 任务类型
 * @returns 该类型对应的模板 key 列表
 */
export function getTemplatesForType(taskType: TaskType): TemplateKey[] {
  const keySet = new Set<TemplateKey>();
  for (const tpl of SUBSCRIBE_TEMPLATES) {
    if (tpl.applicableTypes.includes(taskType)) {
      keySet.add(tpl.key);
    }
  }
  return keySet.size > 0 ? Array.from(keySet) as TemplateKey[] : ['feeding', 'care', 'medicine'];
}

/**
 * 在关键交互节点引导批量授权
 * @param context 授权场景描述
 * @param taskType 可选，传入时只请求该任务类型相关的模板
 */
export async function guideBatchAuthorization(
  context: string = '完成确认后',
  taskType?: TaskType
): Promise<number> {
  const templates: TemplateKey[] = taskType
    ? getTemplatesForType(taskType)
    : ['feeding', 'care', 'medicine'];
  const accepted = await requestSubscribeAuthorization(templates);
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
