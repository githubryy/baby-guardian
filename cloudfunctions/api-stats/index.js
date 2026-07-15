/**
 * api-stats 云函数
 * 统计查询: 概览、日统计、类型统计
 */
const { cloud, db, _, success, fail, getOpenId } = require('../shared/utils');

const TASK_TYPE_NAMES = {
  feeding: '喂养',
  diaper: '换尿布',
  sleep: '哄睡',
  vitamin: '维生素D',
  medicine: '用药',
  custom: '自定义',
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
      case 'summary':
        return await handleSummary(userId, event.babyId);
      case 'daily':
        return await handleDaily(userId, event.params);
      case 'byType':
        return await handleByType(userId, event.params);
      default:
        return fail(`未知操作: ${action}`);
    }
  } catch (err) {
    console.error(`[api-stats] ${action} 错误:`, err);
    return fail(err.message || '服务器错误');
  }
};

/** 获取统计概览 */
async function handleSummary(userId, babyId) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // 宝宝数量
  const babyQuery = babyId ? { userId, _id: babyId } : { userId };
  const { total: totalBabies } = await db.collection('babies')
    .where(babyQuery)
    .count();

  // 事项数量
  const taskQuery = babyId ? { userId, babyId } : { userId };
  const { total: totalTasks } = await db.collection('reminder_tasks')
    .where(taskQuery)
    .count();
  const { total: activeTasks } = await db.collection('reminder_tasks')
    .where({ ...taskQuery, enabled: true })
    .count();

  // 今日提醒数
  const { data: todayTasks } = await db.collection('reminder_tasks')
    .where({
      ...taskQuery,
      enabled: true,
      nextRemindTime: _.lte(todayEnd.toISOString()),
    })
    .get();
  const todayReminders = todayTasks.length;

  // 今日已完成
  const { data: todayLogs } = await db.collection('confirm_logs')
    .where({
      userId,
      action: 'completed',
      completedTime: _.gte(todayStart.toISOString()),
    })
    .get();
  const todayCompleted = todayLogs.length;

  const todayCompletionRate = todayReminders > 0
    ? Math.round((todayCompleted / todayReminders) * 100)
    : 0;

  // 获取最近7天统计
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d);
  }

  const weeklyStats = await Promise.all(dates.map(async (d) => {
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: dayLogs } = await db.collection('confirm_logs')
      .where({
        userId,
        completedTime: _.gte(dayStart.toISOString()).and(_.lte(dayEnd.toISOString())),
      })
      .get();

    const completed = dayLogs.filter((l) => l.action === 'completed').length;
    const delayed = dayLogs.filter((l) => l.action === 'delayed').length;
    const ignored = dayLogs.filter((l) => l.action === 'ignored').length;

    return {
      date: dayStart.toISOString().split('T')[0],
      totalReminders: dayLogs.length,
      completedCount: completed,
      delayedCount: delayed,
      ignoredCount: ignored,
      completionRate: dayLogs.length > 0 ? Math.round((completed / dayLogs.length) * 100) : 0,
    };
  }));

  // 类型统计
  const typeStats = await getTypeStats(userId, dates[0].toISOString(), now.toISOString());

  return success({
    totalBabies,
    totalTasks,
    activeTasks,
    todayReminders,
    todayCompleted,
    todayCompletionRate,
    weeklyStats,
    typeStats,
  });
}

/** 日统计 */
async function handleDaily(userId, params) {
  const { babyId, startDate, endDate } = params;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const query = {
    userId,
    completedTime: _.gte(start.toISOString()).and(_.lte(end.toISOString())),
  };
  if (babyId) query.babyId = babyId;

  const { data: logs } = await db.collection('confirm_logs')
    .where(query)
    .orderBy('completedTime', 'asc')
    .get();

  // 按日期分组
  const dayMap = {};
  logs.forEach((log) => {
    const date = log.completedTime.split('T')[0];
    if (!dayMap[date]) {
      dayMap[date] = { date, totalReminders: 0, completedCount: 0, delayedCount: 0, ignoredCount: 0, completionRate: 0 };
    }
    dayMap[date].totalReminders++;
    if (log.action === 'completed') dayMap[date].completedCount++;
    else if (log.action === 'delayed') dayMap[date].delayedCount++;
    else if (log.action === 'ignored') dayMap[date].ignoredCount++;
  });

  Object.values(dayMap).forEach((day) => {
    day.completionRate = day.totalReminders > 0
      ? Math.round((day.completedCount / day.totalReminders) * 100)
      : 0;
  });

  return success(Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)));
}

/** 类型统计 */
async function handleByType(userId, params) {
  const { babyId, startDate, endDate } = params;
  return success(await getTypeStats(userId, startDate, endDate, babyId));
}

async function getTypeStats(userId, startDate, endDate, babyId) {
  const query = {
    userId,
    completedTime: _.gte(startDate).and(_.lte(endDate)),
  };
  if (babyId) query.babyId = babyId;

  const { data: logs } = await db.collection('confirm_logs')
    .where(query)
    .get();

  // 需要关联 task 获取类型
  const taskIdSet = new Set(logs.map((l) => l.taskId));
  const taskTypeMap = {};
  for (const taskId of taskIdSet) {
    try {
      const { data: task } = await db.collection('reminder_tasks').doc(taskId).get();
      taskTypeMap[taskId] = task.type;
    } catch (e) {
      // 事项可能已删除
    }
  }

  const typeCountMap = {};
  logs.forEach((log) => {
    const type = taskTypeMap[log.taskId] || 'custom';
    if (!typeCountMap[type]) typeCountMap[type] = 0;
    typeCountMap[type]++;
  });

  const total = Object.values(typeCountMap).reduce((a, b) => a + b, 0);
  return Object.entries(typeCountMap).map(([type, count]) => ({
    type,
    typeName: TASK_TYPE_NAMES[type] || '自定义',
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
  }));
}
