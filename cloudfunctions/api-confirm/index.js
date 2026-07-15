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
  const { taskId, action, delayMinutes, remark } = data;
  const now = nowISO();

  // 获取事项
  const { data: task } = await db.collection('reminder_tasks').doc(taskId).get();
  if (!task) return fail('事项不存在');

  // 写入确认日志（含操作人信息）
  const log = {
    taskId,
    babyId: task.babyId,
    userId,
    familyId,
    action,
    completedTime: now,
    delayMinutes: delayMinutes || null,
    remark: remark || null,
    // 操作人信息
    operatorId: userId,
    operatorName: currentUser.nickName || '家庭成员',
    operatorAvatar: currentUser.avatarUrl || '',
    operatorRelation: currentUser.relation || 'other',
    createdAt: now,
  };
  const { _id: logId } = await db.collection('confirm_logs').add({ data: log });

  // 更新事项状态
  if (action === 'completed') {
    // 完成: 重置重试次数，计算下次提醒时间，记录完成者
    const nextRemind = new Date();
    nextRemind.setMinutes(nextRemind.getMinutes() + task.intervalMinutes);
    await db.collection('reminder_tasks').doc(taskId).update({
      data: {
        lastCompletedTime: now,
        lastCompletedBy: userId,
        lastCompletedByName: currentUser.nickName,
        lastCompletedByRelation: currentUser.relation || 'other',
        nextRemindTime: nextRemind.toISOString(),
        retryCount: 0,
        processingLock: false,
        lockedAt: null,
      },
    });
  } else if (action === 'delayed') {
    // 延迟: 推迟到指定时间后
    const nextRemind = new Date();
    nextRemind.setMinutes(nextRemind.getMinutes() + (delayMinutes || 15));
    await db.collection('reminder_tasks').doc(taskId).update({
      data: {
        nextRemindTime: nextRemind.toISOString(),
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
  }

  return success({ ...log, _id: logId });
}

/** 获取确认历史（按家庭查询） */
async function handleHistory(userId, familyId, params = {}) {
  const { babyId, taskId, startDate, endDate, page = 1, pageSize = 20 } = params;

  const query = { familyId };
  if (babyId) query.babyId = babyId;
  if (taskId) query.taskId = taskId;
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
