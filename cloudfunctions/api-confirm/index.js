/**
 * api-confirm 云函数
 * 确认完成/延迟/忽略 + 历史记录查询
 */
const { cloud, db, _, success, fail, getOpenId, nowISO } = require('./utils');

exports.main = async (event, context) => {
  const { action } = event;
  const openId = getOpenId(event);

  try {
    const { data: users } = await db.collection('users')
      .where({ openId })
      .limit(1)
      .get();
    if (users.length === 0) return fail('用户不存在');
    const currentUser = users[0];
    const userId = currentUser._id;
    const familyId = currentUser.familyId || userId;

    switch (action) {
      case 'confirm':
        return await handleConfirm(userId, familyId, currentUser, event.data);
      case 'history':
        return await handleHistory(userId, familyId, event.params);
      default:
        return fail(`未知操作: ${action}`);
    }
  } catch (err) {
    console.error(`[api-confirm] ${action} 错误:`, err);
    return fail(err.message || '服务器错误');
  }
};

/**
 * 确认操作
 * V2.0: 写入操作人信息（operatorId/operatorName/operatorAvatar/operatorRelation）
 */
async function handleConfirm(userId, familyId, currentUser, data) {
  const { taskId, action, delayMinutes, remark, taskType, taskName } = data;
  const now = nowISO();

  // 获取事项
  const { data: task } = await db.collection('reminder_tasks').doc(taskId).get();
  if (!task) return fail('事项不存在');

  // 写入确认日志（含操作人信息 + 事项类型/名称，由前端传入）
  const log = {
    taskId,
    babyId: task.babyId,
    userId,
    familyId,
    taskType: taskType || task.type || 'custom',
    taskName: taskName || task.customName || '未命名',
    action,
    completedTime: now,
    delayMinutes: delayMinutes || null,
    remark: remark || null,
    // 操作人信息
    operatorId: userId,
    operatorName: currentUser.nickName || '家庭成员',
    operatorAvatar: currentUser.avatarUrl || '',
    operatorRelation: currentUser.relation || 'other',
    // 循环事件标识
    taskMode: task.taskMode || 'once',
    // 循环事件：延迟/忽略时也保留当前的 completedCount
    completedCount: task.taskMode === 'recurring'
      ? (action === 'completed' ? (task.completedCount || 0) + 1 : (task.completedCount || 0))
      : null,
    createdAt: now,
  };
  const { _id: logId } = await db.collection('confirm_logs').add({ data: log });

  // 更新事项状态
  if (action === 'completed') {
    // 完成: 记录完成者信息，重置重试次数
    const updateData = {
      lastCompletedTime: now,
      lastCompletedBy: userId,
      lastCompletedByName: currentUser.nickName,
      lastCompletedByRelation: currentUser.relation || 'other',
      retryCount: 0,
      processingLock: false,
      lockedAt: null,
    };
    if (task.taskMode === 'recurring') {
      // 循环事件: 计算下次提醒时间 + 递增 completedCount
      const nextRemind = new Date();
      nextRemind.setMinutes(nextRemind.getMinutes() + task.intervalMinutes);
      updateData.nextRemindTime = nextRemind.toISOString();
      updateData.completedCount = (task.completedCount || 0) + 1;
      // 有限循环且已完成全部次数 → 自动停用
      if (task.repeatCount > 0 && updateData.completedCount >= task.repeatCount) {
        updateData.enabled = false;
      }
    } else {
      updateData.enabled = false;
    }
    // 一次性任务: 不更新 nextRemindTime（已完成无需再次提醒）
    await db.collection('reminder_tasks').doc(taskId).update({ data: updateData });
  } else if (action === 'delayed') {
    // 延迟: 从 nextRemindTime 和 now 中取较晚者，再增加 delayMinutes
    // 避免已超时任务延迟后时间仍在过去，也防止叠加跨天导致前端消失
    const nowDate = new Date();
    const nextRemind = task.nextRemindTime ? new Date(task.nextRemindTime) : nowDate;
    const baseTime = nextRemind.getTime() < nowDate.getTime() ? nowDate : nextRemind;
    baseTime.setMinutes(baseTime.getMinutes() + (delayMinutes || 15));
    await db.collection('reminder_tasks').doc(taskId).update({
      data: {
        nextRemindTime: baseTime.toISOString(),
        processingLock: false,
        lockedAt: null,
      },
    });
  } else if (action === 'ignored') {
    // 忽略: 跳过本次，计算下次
    const nextRemind = new Date();
    nextRemind.setMinutes(nextRemind.getMinutes() + task.intervalMinutes);
    await db.collection('reminder_tasks').doc(taskId).update({
      data: {
        nextRemindTime: nextRemind.toISOString(),
        retryCount: 0,
        processingLock: false,
        lockedAt: null,
      },
    });
  } else if (action === 'paused') {
    // 临时结束: 永久停用该事项，不可恢复，只能重新发起
    await db.collection('reminder_tasks').doc(taskId).update({
      data: {
        enabled: false,
        processingLock: false,
        lockedAt: null,
      },
    });
  }

  return success({ ...log, _id: logId });
}

/** 获取确认历史（按家庭查询） */
async function handleHistory(userId, familyId, params = {}) {
  const { babyId, taskId, taskType, startDate, endDate, page = 1, pageSize = 20 } = params;

  const query = { familyId };
  if (babyId) query.babyId = babyId;
  if (taskId) query.taskId = taskId;
  if (taskType) query.taskType = taskType;
  if (startDate || endDate) {
    query.completedTime = {};
    if (startDate) query.completedTime = _.gte(startDate);
    if (endDate) {
      query.completedTime = startDate
        ? _.gte(startDate).and(_.lte(endDate))
        : _.lte(endDate);
    }
  }

  const { total } = await db.collection('confirm_logs')
    .where(query)
    .count();

  const { data: list } = await db.collection('confirm_logs')
    .where(query)
    .orderBy('completedTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  return success({ list, total, page, pageSize });
}
