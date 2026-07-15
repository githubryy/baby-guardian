/**
 * cron-cleanup 云函数
 * 每小时执行一次:
 * 1. 标记过期配额 (超过7天未使用)
 * 2. 解锁超时锁 (超过5分钟未释放)
 * 3. 清理过老的推送日志 (保留30天)
 */
const { cloud, db, _, success, fail, nowISO } = require('../shared/utils');

const QUOTA_EXPIRE_DAYS = 7;
const LOCK_TIMEOUT_MINUTES = 5;
const LOG_RETENTION_DAYS = 30;

exports.main = async (event, context) => {
  console.log('[cron-cleanup] 开始清理', new Date().toISOString());
  const startTime = Date.now();
  let expiredQuotas = 0;
  let unlockedTasks = 0;
  let deletedLogs = 0;

  try {
    const now = new Date();

    // 1. 标记过期配额
    const quotaExpireTime = new Date(now.getTime() - QUOTA_EXPIRE_DAYS * 24 * 3600 * 1000);
    const { stats: quotaStats } = await db.collection('subscription_quotas')
      .where({
        status: 'available',
        expireAt: _.lt(now.toISOString()),
      })
      .update({
        data: { status: 'expired' },
      });
    expiredQuotas = quotaStats?.updated || 0;
    console.log(`[cron-cleanup] 标记过期配额: ${expiredQuotas} 条`);

    // 2. 解锁超时锁
    const lockTimeoutTime = new Date(now.getTime() - LOCK_TIMEOUT_MINUTES * 60 * 1000);
    const { stats: lockStats } = await db.collection('reminder_tasks')
      .where({
        processingLock: true,
        lockedAt: _.lt(lockTimeoutTime.toISOString()),
      })
      .update({
        data: { processingLock: false, lockedAt: null },
      });
    unlockedTasks = lockStats?.updated || 0;
    console.log(`[cron-cleanup] 解锁超时事项: ${unlockedTasks} 条`);

    // 3. 清理旧推送日志 (保留30天)
    const logCutoffTime = new Date(now.getTime() - LOG_RETENTION_DAYS * 24 * 3600 * 1000);
    const { stats: logStats } = await db.collection('notification_logs')
      .where({
        sendTime: _.lt(logCutoffTime.toISOString()),
      })
      .remove();
    deletedLogs = logStats?.removed || 0;
    console.log(`[cron-cleanup] 清理推送日志: ${deletedLogs} 条`);

    const duration = Date.now() - startTime;
    console.log(`[cron-cleanup] 清理完成: 过期配额${expiredQuotas}条, 解锁${unlockedTasks}条, 删日志${deletedLogs}条, 耗时${duration}ms`);

    return success({
      expiredQuotas,
      unlockedTasks,
      deletedLogs,
      duration,
    });
  } catch (err) {
    console.error('[cron-cleanup] 清理异常:', err);
    return fail(err.message || '清理异常');
  }
};
