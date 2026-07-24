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

  // 获取事项（仅取必要字段，减少数据传输）
  const { data: task } = await db.collection('reminder_tasks')
    .doc(taskId)
    .field({
      babyId: true, taskMode: true, intervalMinutes: true,
      repeatCount: true, completedCount: true, nextRemindTime: true,
      isOverdueCritically: true, type: true, customName: true,
    })
    .get();
  if (!task) return fail('事项不存在');

  const completedCount = action === 'completed' ? ((task.completedCount || 0) + 1) : task.completedCount;

  // 构建确认日志
  const log = {
    taskId,
    babyId: task.babyId,
    userId,
    familyId,
    taskType: taskType || task.type || 'custom',
    taskName: taskName || task.customName || '未命名',
    action,
    delayMinutes: delayMinutes || null,
    remark: remark || null,
    operatorId: userId,
    operatorName: currentUser.nickName || '家庭成员',
    operatorAvatar: currentUser.avatarUrl || '',
    operatorRelation: currentUser.relation || 'other',
    taskMode: task.taskMode || 'once',
    completedCount,
    isOverdueCritically: task.isOverdueCritically || false,
    createdAt: now,
  };

  // 计算任务更新数据（先组装好，再与日志并行写入）
  let updateData;
  if (action === 'completed') {
    updateData = {
      lastCompletedTime: now,
      lastCompletedBy: userId,
      lastCompletedByName: currentUser.nickName,
      lastCompletedByRelation: currentUser.relation || 'other',
      isOverdue: false,
      isPaused: false,
      isOverdueCritically: false,
      overdueDetectedAt: null,
      processingLock: false,
      lockedAt: null,
      completedCount,
    };
    if (task.taskMode === 'recurring') {
      const nextRemind = new Date();
      nextRemind.setMinutes(nextRemind.getMinutes() + task.intervalMinutes);
      updateData.nextRemindTime = nextRemind.toISOString();
      if (task.repeatCount > 0 && updateData.completedCount >= task.repeatCount) {
        updateData.endedAt = now;
      }
    } else {
      updateData.endedAt = now;
    }
  } else if (action === 'delayed') {
    const nowDate = new Date();
    const nextRemind = task.nextRemindTime ? new Date(task.nextRemindTime) : nowDate;
    const baseTime = nextRemind.getTime() < nowDate.getTime() ? nowDate : nextRemind;
    baseTime.setMinutes(baseTime.getMinutes() + (delayMinutes || 15));
    updateData = {
      nextRemindTime: baseTime.toISOString(),
      isOverdue: false, isOverdueCritically: false, isPaused: false,
      overdueDetectedAt: null, processingLock: false, lockedAt: null,
    };
  } else if (action === 'ended') {
    updateData = {
      endedAt: now,
      isOverdue: false, isOverdueCritically: false, isPaused: false,
      overdueDetectedAt: null, processingLock: false, lockedAt: null,
    };
  } else if (action === 'paused') {
    updateData = {
      isPaused: true,
      isOverdue: false, isOverdueCritically: false,
      overdueDetectedAt: null, processingLock: false, lockedAt: null,
    };
  } else if (action === 'restart') {
    const nowDate = new Date();
    const nextRemind = task.nextRemindTime ? new Date(task.nextRemindTime) : nowDate;
    let newNextRemindTime;
    if (nextRemind.getTime() < nowDate.getTime()) {
      newNextRemindTime = new Date(nowDate.getTime());
      newNextRemindTime.setMinutes(newNextRemindTime.getMinutes() + task.intervalMinutes);
    } else {
      newNextRemindTime = nextRemind;
    }
    updateData = {
      isPaused: false,
      nextRemindTime: newNextRemindTime.toISOString(),
      isOverdue: false, isOverdueCritically: false,
      overdueDetectedAt: null, processingLock: false, lockedAt: null,
    };
  }

  // 并行写入：日志 + 任务更新（无依赖关系）
  const [logRes] = await Promise.all([
    db.collection('confirm_logs').add({ data: log }),
    db.collection('reminder_tasks').doc(taskId).update({ data: updateData }),
  ]);

  return success({ ...log, _id: logRes._id });
}

/** 获取确认历史（按家庭查询） */
async function handleHistory(userId, familyId, params = {}) {
  const { babyId, taskId, taskType, startDate, endDate, page = 1, pageSize = 20 } = params;

  const query = { familyId };
  if (babyId) query.babyId = babyId;
  if (taskId) query.taskId = taskId;
  if (taskType) query.taskType = taskType;
  if (startDate || endDate) {
    const start = startDate ? `${startDate}T00:00:00.000Z` : null;
    const end = endDate ? `${endDate}T23:59:59.999Z` : null;
    if (start && end) {
      query.createdAt = _.gte(start).and(_.lte(end));
    } else if (start) {
      query.createdAt = _.gte(start);
    } else {
      query.createdAt = _.lte(end);
    }
  }

  // 并行执行 count + 列表查询，只取前端需要的字段
  const [countRes, listRes] = await Promise.all([
    db.collection('confirm_logs').where(query).count(),
    db.collection('confirm_logs')
      .where(query)
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .field({
        taskId: true, babyId: true, action: true, taskType: true,
        taskName: true, operatorName: true, operatorAvatar: true,
        operatorRelation: true, delayMinutes: true, remark: true, createdAt: true,
      })
      .get(),
  ]);

  return success({ list: listRes.data, total: countRes.total, page, pageSize });
}
