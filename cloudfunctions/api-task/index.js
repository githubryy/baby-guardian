/**
 * api-task 云函数
 * 提醒事项 CRUD + 首页时间线
 */
const { cloud, db, _, success, fail, getOpenId, nowISO, beijingTimeToDate, isWithinWindow } = require('./utils');

// 事项类型配置
const TASK_TYPE_CONFIG = {
  feeding: { name: '喂养', icon: '🍼', color: '#FF7B7B', templateKey: 'feeding' },
  diaper: { name: '换尿布', icon: '🩲', color: '#378add', templateKey: 'care' },
  sleep: { name: '哄睡', icon: '🌙', color: '#7f77dd', templateKey: 'care' },
  vitamin: { name: '维生素D', icon: '🇩', color: '#1d9e75', templateKey: 'medicine' },
  medicine: { name: '用药', icon: '💊', color: '#e24b4a', templateKey: 'medicine' },
  custom: { name: '自定义', icon: '📝', color: '#ef9f27', templateKey: null },
};

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
      case 'list':
        return await handleList(userId, familyId, event.babyId);
      case 'detail':
        return await handleDetail(event.taskId);
      case 'add':
        return await handleAdd(userId, familyId, event.data);
      case 'update':
        return await handleUpdate(event.taskId, event.data);
      case 'delete':
        return await handleDelete(event.taskId);
      case 'toggle':
        return await handleToggle(event.taskId, event.enabled);
      case 'timeline':
        return await handleTimeline(userId, familyId, event.babyId);
      default:
        return fail(`未知操作: ${action}`);
    }
  } catch (err) {
    console.error(`[api-task] ${action} 错误:`, err);
    return fail(err.message || '服务器错误');
  }
};

/** 获取事项列表（按家庭查询） */
async function handleList(userId, familyId, babyId) {
  const query = babyId
    ? { familyId, babyId }
    : { familyId };
  const { data } = await db.collection('reminder_tasks')
    .where(query)
    .orderBy('createdAt', 'asc')
    .get();
  return success(data);
}

/** 获取事项详情 */
async function handleDetail(taskId) {
  const { data } = await db.collection('reminder_tasks').doc(taskId).get();
  return success(data);
}

/** 添加事项 */
async function handleAdd(userId, familyId, data) {
  const now = new Date();
  const nowIso = nowISO();

  // 计算首次提醒时间
  const firstRemindDate = beijingTimeToDate(data.firstTime);
  if (firstRemindDate.getTime() < now.getTime()) {
    // 如果今天的时间已过，从现在开始计算
    firstRemindDate.setTime(now.getTime() + data.intervalMinutes * 60 * 1000);
  }

  // 检查是否在提醒窗口内
  if (!isWithinWindow(firstRemindDate, data.reminderWindowStart, data.reminderWindowEnd)) {
    // 推迟到下一个窗口
    const [h, m] = data.reminderWindowStart.split(':').map(Number);
    firstRemindDate.setUTCHours(h - 8, m, 0, 0);
    if (firstRemindDate.getTime() <= now.getTime()) {
      firstRemindDate.setDate(firstRemindDate.getDate() + 1);
    }
  }

  const task = {
    ...data,
    userId,
    familyId,
    nextRemindTime: firstRemindDate.toISOString(),
    lastCompletedTime: null,
    lastCompletedBy: null,
    lastCompletedByName: null,
    lastCompletedByRelation: null,
    processingLock: false,
    lockedAt: null,
    isOverdue: false,
    completedCount: 0,
    createdAt: nowIso,
  };

  const { _id } = await db.collection('reminder_tasks').add({ data: task });
  return success({ ...task, _id });
}

/** 更新事项 */
async function handleUpdate(taskId, data) {
  // 如果 intervalMinutes 变更且事项未超时，以当前时间为基准重新计算下次提醒时间
  if (data.intervalMinutes !== undefined) {
    const { data: task } = await db.collection('reminder_tasks')
      .doc(taskId)
      .field({ intervalMinutes: true, nextRemindTime: true })
      .get();
    if (task && task.intervalMinutes !== data.intervalMinutes && task.nextRemindTime) {
      const prevNext = new Date(task.nextRemindTime);
      if (!isNaN(prevNext.getTime()) && prevNext.getTime() > Date.now()) {
        data.nextRemindTime = new Date(Date.now() + data.intervalMinutes * 60 * 1000).toISOString();
      }
    }
  }

  const updateData = { ...data, updatedAt: nowISO() };
  delete updateData._id;
  delete updateData.userId;
  delete updateData.babyId;

  await db.collection('reminder_tasks').doc(taskId).update({ data: updateData });
  const { data: updated } = await db.collection('reminder_tasks').doc(taskId).get();
  return success(updated);
}

/** 删除事项 */
async function handleDelete(taskId) {
  await db.collection('reminder_tasks').doc(taskId).remove();
  return success(null, '删除成功');
}

/** 结束/重开事项 */
async function handleToggle(taskId, enabled) {
  const now = new Date().toISOString();
  // enabled=true 表示重开（清除 endedAt），false 表示结束（记录 endedAt）
  await db.collection('reminder_tasks').doc(taskId).update({
    data: enabled ? { endedAt: null } : { endedAt: now },
  });
  const { data: updated } = await db.collection('reminder_tasks').doc(taskId).get();
  return success(updated);
}

/**
 * 获取首页时间线
 * 返回今日待处理 + 近期已完成的事项
 * V2.0: 按家庭查询，包含操作人信息
 */
async function handleTimeline(userId, familyId, babyId) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const todayEndISO = todayEnd.toISOString();
  const todayStartISO = todayStart.toISOString();

  // 并行执行 4 个独立查询
  const babyQuery = babyId
    ? _.or([{ familyId, _id: babyId }, { userId: familyId, _id: babyId }])
    : _.or([{ familyId }, { userId: familyId }]);

  const [babiesRes, tasksRes, confirmLogsRes, familyRes] = await Promise.all([
    db.collection('babies')
      .where(babyQuery)
      .field({ _id: true, name: true, avatarUrl: true })
      .get(),
    db.collection('reminder_tasks')
      .where({
        familyId,
        endedAt: _.exists(false),
        nextRemindTime: _.lte(todayEndISO),
      })
      .orderBy('nextRemindTime', 'desc')
      .get(),
    db.collection('confirm_logs')
      .where({
        familyId,
        createdAt: _.gte(todayStartISO),
      })
      .field({ taskId: true, action: true, createdAt: true, operatorName: true, operatorAvatar: true, operatorRelation: true })
      .orderBy('createdAt', 'desc')
      .get(),
    db.collection('families')
      .doc(familyId)
      .field({ members: true })
      .get()
      .catch(() => ({ data: null })),
  ]);

  const { data: babies } = babiesRes;
  const { data: tasks } = tasksRes;
  const { data: confirmLogs } = confirmLogsRes;
  const { data: family } = familyRes;

  const babyMap = {};
  babies.forEach((b) => { babyMap[b._id] = b; });

  // 构建操作人映射（仅用于展示操作人头像/昵称，不用作状态判断）
  const confirmByTask = {};
  confirmLogs.forEach((log) => {
    if (!confirmByTask[log.taskId]) {
      confirmByTask[log.taskId] = log;
    }
  });

  // 构建家庭成员映射（用于显示指定负责人）
  const memberMap = {};
  if (family && family.members) {
    family.members.forEach((m) => {
      memberMap[m.userId] = m;
    });
  }

  // 构建时间线
  const timeline = [];
  const confirmedTaskIds = new Set(confirmLogs.map((l) => l.taskId));

  /** 构建单条 timeline 条目 */
  function buildItem(task, opts = {}) {
    const { status, isRecurring = false } = opts;
    const config = TASK_TYPE_CONFIG[task.type] || TASK_TYPE_CONFIG.custom;
    const baby = babyMap[task.babyId];
    const confirmLog = confirmByTask[task._id];
    const assignee = status !== 'ended' && task.assigneeId ? memberMap[task.assigneeId] : null;

    return {
      taskId: task._id,
      babyId: task.babyId,
      babyName: baby?.name || '未知',
      babyAvatar: baby?.avatarUrl,
      type: task.type,
      customName: task.customName,
      typeName: config.name,
      typeIcon: config.icon,
      typeColor: config.color,
      lastDurationText: task.lastCompletedTime ? getDurationText(task.lastCompletedTime) : null,
      status,
      priority: task.priority,
      completedByName: task.lastCompletedByName || confirmLog?.operatorName || null,
      completedByAvatar: task.lastCompletedByAvatar || confirmLog?.operatorAvatar || null,
      completedByRelation: task.lastCompletedByRelation || confirmLog?.operatorRelation || null,
      completedAt: task.lastCompletedTime || confirmLog?.createdAt || null,
      assigneeName: assignee?.nickName || null,
      assigneeAvatar: assignee?.avatarUrl || null,
      taskMode: task.taskMode || null,
      repeatCount: task.repeatCount ?? null,
      completedCount: task.completedCount ?? 0,
      intervalMinutes: task.intervalMinutes ?? null,
      nextRemindTime: task.nextRemindTime || task.createdAt,
      nextRemindRemaining: isRecurring ? getRemainingText(task.nextRemindTime) : null,
      isOverdueCritically: task.isOverdueCritically || false,
      overdueCriticallyCount: task.overdueCriticallyCount || 0,
    };
  }

  tasks.forEach((task) => {
    const remindTime = new Date(task.nextRemindTime);
    const isRecurring = task.taskMode === 'recurring';

    // 纯 reminder_tasks 字段判断状态（状态以任务自身字段为准，confirm_logs 仅用于操作人展示）
    let status = 'pending';
    if (task.isPaused) {
      status = 'paused';
    } else if (task.isOverdue || remindTime.getTime() < now.getTime()) {
      status = 'overdue';
    }
    // 完成判定: 仅当非暂停/非超时时，lastCompletedTime 在今天才标记为已完成
    if (status === 'pending' && task.lastCompletedTime && new Date(task.lastCompletedTime) >= todayStart) {
      status = 'completed';
    }

    timeline.push(buildItem(task, { status, isRecurring }));
  });

  // 补充今日确认过但 nextRemindTime 已跨天的任务
  // （这些任务被 todayEnd 过滤掉了，需要单独补回）
  const taskInTimelineIds = new Set(timeline.map(t => t.taskId));
  const supplementIds = new Set(
    Array.from(confirmedTaskIds).filter(id => !taskInTimelineIds.has(id))
  );
  if (supplementIds.size > 0) {
    const { data: supplementTasks } = await db.collection('reminder_tasks')
      .where({ _id: db.command.in(Array.from(supplementIds)) })
      .get();
    supplementTasks.forEach((task) => {
      const isRecurring = task.taskMode === 'recurring';
      // 补充任务用 reminder_tasks 字段判断状态（不用 confirm_logs）
      if (task.endedAt && new Date(task.endedAt) >= todayStart) {
        timeline.push(buildItem(task, { status: 'ended' }));
      } else if (task.isPaused && (!task.lastCompletedTime || new Date(task.lastCompletedTime) < todayStart)) {
        timeline.push(buildItem(task, { status: 'paused', isRecurring }));
      } else {
        timeline.push(buildItem(task, { status: 'completed', isRecurring }));
      }
    });
  }

  // 统一倒序排列：最新时间在前
  timeline.sort((a, b) => new Date(b.nextRemindTime).getTime() - new Date(a.nextRemindTime).getTime());

  return success(timeline);
}

function getDurationText(isoTime) {
  const diff = Date.now() - new Date(isoTime).getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
}

function getRemainingText(nextRemindTime) {
  if (!nextRemindTime) return null;
  const diff = new Date(nextRemindTime).getTime() - Date.now();
  if (diff <= 0) return '已到';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return minutes > 0 ? `剩余${hours}小时${minutes}分钟` : `剩余${hours}小时`;
  return `剩余${minutes}分钟`;
}
