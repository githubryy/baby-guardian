/**
 * cron-scan 云函数
 * 定时扫描到期事项 → 检查配额 → 检查窗口 → 发送订阅消息 → 消耗配额
 *
 * P0: 每分钟执行一次 (微信云开发定时触发器最小间隔)
 * P1: 分批处理 (最多50条/次), 乐观锁防重复
 * P1: 重试策略 — 首次用订阅消息, 重试用小程序内通知(红点)
 * P2: 优先级分层 — P0/P1 用订阅消息, P2 仅红点
 */
const { cloud, db, _, success, fail, nowISO, isWithinWindow, getNextWindowStart } = require('../shared/utils');

const BATCH_LIMIT = 50;
const LOCK_TIMEOUT_MINUTES = 5;

// 订阅消息模板ID (替换为实际值)
const TEMPLATES = {
  feeding: '',
  care: '',
  medicine: '',
};

// 模板与事项类型映射
const TYPE_TEMPLATE_MAP = {
  feeding: 'feeding',
  diaper: 'care',
  sleep: 'care',
  vitamin: 'medicine',
  medicine: 'medicine',
};

exports.main = async (event, context) => {
  console.log('[cron-scan] 开始扫描', new Date().toISOString());
  const startTime = Date.now();
  let processed = 0;
  let pushed = 0;
  let quotaExhausted = 0;
  let windowSkipped = 0;
  let errors = 0;

  try {
    const now = new Date();

    // 1. 解锁超时锁 (超过5分钟的锁)
    await unlockStaleTasks(now);

    // 2. 查询到期事项 (最多 BATCH_LIMIT 条, 未锁定)
    const { data: tasks } = await db.collection('reminder_tasks')
      .where({
        enabled: true,
        nextRemindTime: _.lte(now.toISOString()),
        processingLock: false,
      })
      .orderBy('nextRemindTime', 'asc')
      .limit(BATCH_LIMIT)
      .get();

    if (tasks.length === 0) {
      console.log('[cron-scan] 无到期事项');
      return success({ processed: 0, message: '无到期事项' });
    }

    console.log(`[cron-scan] 找到 ${tasks.length} 条到期事项`);

    // 3. 批量锁定
    await Promise.all(tasks.map((task) =>
      db.collection('reminder_tasks').doc(task._id).update({
        data: { processingLock: true, lockedAt: now.toISOString() },
      })
    ));

    // 4. 逐条处理 (使用 allSettled 防止单条失败影响整体)
    const results = await Promise.allSettled(tasks.map(async (task) => {
      processed++;

      // 4a. 检查提醒窗口
      if (!isWithinWindow(now, task.reminderWindowStart, task.reminderWindowEnd)) {
        console.log(`[cron-scan] 事项 ${task._id} 不在提醒窗口内`);
        windowSkipped++;

        // 根据策略处理
        if (task.windowSkipStrategy === 'delay_to_next_window') {
          const nextStart = getNextWindowStart(task.reminderWindowStart);
          await db.collection('reminder_tasks').doc(task._id).update({
            data: { nextRemindTime: nextStart.toISOString() },
          });
        } else {
          // skip_and_continue: 直接计算下一个间隔
          const nextTime = new Date(now.getTime() + task.intervalMinutes * 60 * 1000);
          await db.collection('reminder_tasks').doc(task._id).update({
            data: { nextRemindTime: nextTime.toISOString() },
          });
        }
        return;
      }

      // 4b. P2 优先级事项 — 仅红点通知，不消耗配额
      if (task.priority === 'p2') {
        console.log(`[cron-scan] 事项 ${task._id} 为P2优先级，仅红点通知`);
        // 计算下次提醒时间
        const nextTime = new Date(now.getTime() + task.intervalMinutes * 60 * 1000);
        await db.collection('reminder_tasks').doc(task._id).update({
          data: {
            nextRemindTime: nextTime.toISOString(),
            retryCount: 0,
          },
        });
        // 记录日志
        await logNotification(task, 'success', null, null, 0, 'red_dot_only');
        return;
      }

      // 4c. P0/P1 优先级 — 使用订阅消息推送

      // 重试策略: retryCount > 0 时降级为红点通知
      if (task.retryCount > 0) {
        console.log(`[cron-scan] 事项 ${task._id} 第${task.retryCount}次重试，降级为红点`);
        const nextTime = new Date(now.getTime() + task.intervalMinutes * 60 * 1000);
        await db.collection('reminder_tasks').doc(task._id).update({
          data: {
            nextRemindTime: nextTime.toISOString(),
            retryCount: task.retryCount + 1,
          },
        });
        await logNotification(task, 'success', null, null, task.retryCount, 'red_dot_retry');
        return;
      }

      // 4d. 检查配额
      const quota = await getAvailableQuota(task);
      if (!quota) {
        console.log(`[cron-scan] 事项 ${task._id} 配额不足`);
        quotaExhausted++;
        await logNotification(task, 'quota_exhausted', null, null, 0);

        // 重置提醒时间 (等待用户补充配额后下次扫描再推)
        const nextTime = new Date(now.getTime() + 30 * 60 * 1000); // 30分钟后重试
        await db.collection('reminder_tasks').doc(task._id).update({
          data: { nextRemindTime: nextTime.toISOString() },
        });
        return;
      }

      // 4e. 发送订阅消息
      const sendResult = await sendSubscriptionMessage(task, quota);
      await logNotification(task, sendResult.status, quota._id, sendResult.error, 0);

      if (sendResult.status === 'success') {
        pushed++;
        // 消耗配额
        await consumeQuota(quota._id, task._id);
      }

      // 4f. 更新事项: 设置下次提醒时间 + retryCount
      const nextTime = new Date(now.getTime() + task.intervalMinutes * 60 * 1000);
      await db.collection('reminder_tasks').doc(task._id).update({
        data: {
          nextRemindTime: nextTime.toISOString(),
          retryCount: 0,
        },
      });
    }));

    // 统计错误
    errors = results.filter((r) => r.status === 'rejected').length;
    if (errors > 0) {
      results.filter((r) => r.status === 'rejected').forEach((r) => {
        console.error('[cron-scan] 处理失败:', r.reason);
      });
    }

    // 5. 解锁所有处理完的事项
    await Promise.all(tasks.map((task) =>
      db.collection('reminder_tasks').doc(task._id).update({
        data: { processingLock: false, lockedAt: null },
      })
    ));

    const duration = Date.now() - startTime;
    console.log(`[cron-scan] 扫描完成: 处理${processed}条, 推送${pushed}条, 配额不足${quotaExhausted}条, 窗口外${windowSkipped}条, 错误${errors}条, 耗时${duration}ms`);

    return success({
      processed,
      pushed,
      quotaExhausted,
      windowSkipped,
      errors,
      duration,
    });
  } catch (err) {
    console.error('[cron-scan] 扫描异常:', err);
    return fail(err.message || '扫描异常');
  }
};

/**
 * 解锁超时锁 (超过5分钟未释放的锁)
 */
async function unlockStaleTasks(now) {
  const staleTime = new Date(now.getTime() - LOCK_TIMEOUT_MINUTES * 60 * 1000);
  await db.collection('reminder_tasks')
    .where({
      processingLock: true,
      lockedAt: _.lt(staleTime.toISOString()),
    })
    .update({
      data: { processingLock: false, lockedAt: null },
    });
}

/**
 * 获取可用配额
 */
async function getAvailableQuota(task) {
  const templateKey = TYPE_TEMPLATE_MAP[task.type];
  if (!templateKey) return null;

  const templateId = TEMPLATES[templateKey];
  if (!templateId) return null;

  // 获取用户 openId
  const { data: user } = await db.collection('users').doc(task.userId).get();
  if (!user) return null;

  const now = nowISO();

  // 查找可用配额 (未过期)
  const { data: quotas } = await db.collection('subscription_quotas')
    .where({
      openId: user.openId,
      templateId: templateId,
      status: 'available',
      expireAt: _.gt(now),
    })
    .orderBy('authorizedAt', 'asc')
    .limit(1)
    .get();

  return quotas.length > 0 ? quotas[0] : null;
}

/**
 * 发送订阅消息
 */
async function sendSubscriptionMessage(task, quota) {
  try {
    const { data: user } = await db.collection('users').doc(task.userId).get();
    const { data: baby } = await db.collection('babies').doc(task.babyId).get();

    const templateKey = TYPE_TEMPLATE_MAP[task.type];
    const templateId = TEMPLATES[templateKey];

    // 构建消息数据 (根据模板字段配置)
    const sendData = buildMessageData(task, baby, templateKey);

    const result = await cloud.openapi.subscribeMessage.send({
      touser: user.openId,
      templateId,
      data: sendData,
      miniprogramState: 'formal',
      lang: 'zh_CN',
    });

    if (result.errCode === 0) {
      console.log(`[cron-scan] 推送成功: 事项 ${task._id}`);
      return { status: 'success', error: null };
    } else {
      console.error(`[cron-scan] 推送失败: 事项 ${task._id}`, result);
      return { status: 'failed', error: { code: result.errCode, message: result.errMsg } };
    }
  } catch (err) {
    console.error(`[cron-scan] 推送异常: 事项 ${task._id}`, err);
    return { status: 'failed', error: { code: err.errCode, message: err.errMsg } };
  }
}

/**
 * 构建订阅消息数据
 * 根据模板类型构建不同字段
 */
function buildMessageData(task, baby, templateKey) {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 3600 * 1000);
  const timeStr = `${String(beijingTime.getUTCHours()).padStart(2, '0')}:${String(beijingTime.getUTCMinutes()).padStart(2, '0')}`;
  const babyName = baby?.name || '宝宝';
  const taskName = task.customName || '';

  switch (templateKey) {
    case 'feeding':
      // 模板A: 喂养提醒 — 宝宝昵称、事项类型、距上次时长、提醒时间
      return {
        thing1: { value: babyName },
        thing2: { value: '喂养' },
        time3: { value: timeStr },
      };
    case 'care':
      // 模板B: 护理提醒 — 宝宝昵称、事项类型、提醒时间
      return {
        thing1: { value: babyName },
        thing2: { value: taskName || '护理' },
        time3: { value: timeStr },
      };
    case 'medicine':
      // 模板C: 用药提醒 — 宝宝昵称、药品名称、用量、提醒时间
      return {
        thing1: { value: babyName },
        thing2: { value: taskName || '用药' },
        time3: { value: timeStr },
      };
    default:
      return {
        thing1: { value: babyName },
        thing2: { value: '提醒' },
        time3: { value: timeStr },
      };
  }
}

/**
 * 消耗配额
 */
async function consumeQuota(quotaId, taskId) {
  await db.collection('subscription_quotas').doc(quotaId).update({
    data: {
      status: 'consumed',
      consumedAt: nowISO(),
      consumedByTaskId: taskId,
    },
  });
}

/**
 * 记录推送日志
 */
async function logNotification(task, status, quotaId, error, retryRound, method = 'subscribe') {
  const { data: user } = await db.collection('users').doc(task.userId).get();
  if (!user) return;

  await db.collection('notification_logs').add({
    data: {
      taskId: task._id,
      babyId: task.babyId,
      openId: user.openId,
      templateId: TEMPLATES[TYPE_TEMPLATE_MAP[task.type]] || '',
      quotaId: quotaId || null,
      sendStatus: status,
      errorCode: error?.code || null,
      errorMessage: error?.message || null,
      sendTime: nowISO(),
      retryRound: retryRound || 0,
      method,
    },
  });
}
