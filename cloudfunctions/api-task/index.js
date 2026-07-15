/**
 * api-task 云函数
 * 提醒事项 CRUD + 首页时间线
 */
const { cloud, db, _, success, fail, getOpenId, nowISO, beijingTimeToDate, isWithinWindow } = require('./utils');

// 事项类型配置
const TASK_TYPE_CONFIG = {
  feeding: { name: '喂养', icon: '🍼', color: '#FF7B7B', templateKey: 'feeding' },
  diaper: { name: '换尿布', icon: '🧷', color: '#378add', templateKey: 'care' },
  sleep: { name: '哄睡', icon: '🌙', color: '#7f77dd', templateKey: 'care' },
  vitamin: { name: '维生素D', icon: '💊', color: '#1d9e75', templateKey: 'medicine' },
  medicine: { name: '用药', icon: '💉', color: '#e24b4a', templateKey: 'medicine' },
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
    const userId = users[0]._id;

    switch (action) {
      case 'list':
        return await handleList(userId, event.babyId);
      case 'detail':
        return await handleDetail(event.taskId);
      case 'add':
        return await handleAdd(userId, event.data);
      case 'update':
        return await handleUpdate(event.taskId, event.data);
      case 'delete':
        return await handleDelete(event.taskId);
      case 'toggle':
        return await handleToggle(event.taskId, event.enabled);
      case 'timeline':
        return await handleTimeline(userId, event.babyId);
      default:
        return fail(`未知操作: ${action}`);
    }
  } catch (err) {
    console.error(`[api-task] ${action} 错误:`, err);
    return fail(err.message || '服务器错误');
  }
};

/** 获取事项列表 */
async function handleList(userId, babyId) {
  const query = babyId ? { userId, babyId } : { userId };
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
async function handleAdd(userId, data) {
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
    enabled: true,
    nextRemindTime: firstRemindDate.toISOString(),
    lastCompletedTime: null,
    retryCount: 0,
    processingLock: false,
    lockedAt: null,
    createdAt: nowIso,
  };

  const { _id } = await db.collection('reminder_tasks').add({ data: task });
  return success({ ...task, _id });
}

/** 更新事项 */
async function handleUpdate(taskId, data) {
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

/** 启用/禁用事项 */
async function handleToggle(taskId, enabled) {
  await db.collection('reminder_tasks').doc(taskId).update({ data: { enabled } });
  const { data: updated } = await db.collection('reminder_tasks').doc(taskId).get();
  return success(updated);
}

/**
 * 获取首页时间线
 * 返回今日待处理 + 近期已完成的事项
 */
async function handleTimeline(userId, babyId) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // 获取该用户的所有宝宝
  const babyQuery = babyId ? { userId, _id: babyId } : { userId };
  const { data: babies } = await db.collection('babies')
    .where(babyQuery)
    .get();

  const babyMap = {};
  babies.forEach((b) => { babyMap[b._id] = b; });

  // 获取今日所有事项的提醒
  const { data: tasks } = await db.collection('reminder_tasks')
    .where({
      userId,
      enabled: true,
      nextRemindTime: _.lte(todayEnd.toISOString()),
    })
    .orderBy('nextRemindTime', 'asc')
    .get();

  // 获取今日确认记录
  const { data: confirmLogs } = await db.collection('confirm_logs')
    .where({
      userId,
      completedTime: _.gte(todayStart.toISOString()),
    })
    .orderBy('completedTime', 'desc')
    .get();

  // 构建时间线
  const timeline = [];
  const confirmedTaskIds = new Set(confirmLogs.map((l) => l.taskId));

  tasks.forEach((task) => {
    const config = TASK_TYPE_CONFIG[task.type] || TASK_TYPE_CONFIG.custom;
    const baby = babyMap[task.babyId];
    const isConfirmed = confirmedTaskIds.has(task._id);
    const remindTime = new Date(task.nextRemindTime);

    let status = 'pending';
    if (isConfirmed) {
      status = 'completed';
    } else if (remindTime.getTime() < now.getTime()) {
      status = 'overdue';
    }

    timeline.push({
      taskId: task._id,
      babyId: task.babyId,
      babyName: baby?.name || '未知',
      babyAvatar: baby?.avatarUrl,
      type: task.type,
      customName: task.customName,
      typeName: config.name,
      typeIcon: config.icon,
      typeColor: config.color,
      remindTime: task.nextRemindTime,
      lastDurationText: task.lastCompletedTime ? getDurationText(task.lastCompletedTime) : null,
      status,
      priority: task.priority,
    });
  });

  return success(timeline);
}

function getDurationText(isoTime) {
  const diff = Date.now() - new Date(isoTime).getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
}
