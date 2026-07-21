/**
 * api-stats 云函数
 * 统计查询: 概览、日统计、类型统计
 */
const { cloud, db, _, success, fail, getOpenId } = require('./utils');

const TASK_TYPE_NAMES = {
  feeding: '喂养',
  diaper: '换尿布',
  sleep: '哄睡',
  vitamin: '维生素D',
  medicine: '用药',
  custom: '自定义',
};

// ========== 工具函数 ==========

/** 获取某天的起止时间 */
function dayBoundaries(d) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** 日期转 YYYY-MM-DD 字符串 */
function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

/** 创建空的日统计对象 */
function emptyDayStat(dateStr) {
  return { date: dateStr, totalReminders: 0, completedCount: 0, delayedCount: 0, ignoredCount: 0, pausedCount: 0, criticallyOverdueCount: 0, completionRate: 0 };
}

/** 计算完成率 */
function calcRate(completed, total) {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

/** 构建事项查询条件 */
function buildTaskQuery(familyId, babyId, extra = {}) {
  return babyId ? { familyId, babyId, ...extra } : { familyId, ...extra };
}

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
      case 'summary':
        return await handleSummary(userId, familyId, event.babyId);
      case 'daily':
        return await handleDaily(userId, familyId, event.params);
      case 'byType':
        return success(await getTypeStats(familyId, event.params.startDate, event.params.endDate, event.params.babyId));
      default:
        return fail(`未知操作: ${action}`);
    }
  } catch (err) {
    console.error(`[api-stats] ${action} 错误:`, err);
    return fail(err.message || '服务器错误');
  }
};

/** 获取统计概览 */
async function handleSummary(userId, familyId, babyId) {
  const now = new Date();
  const today = dayBoundaries(now);

  // 宝宝数量
  const babyQuery = babyId
    ? _.or([{ familyId, _id: babyId }, { userId: familyId, _id: babyId }])
    : _.or([{ familyId }, { userId: familyId }]);
  const { total: totalBabies } = await db.collection('babies').where(babyQuery).count();

  // 事项数量
  const taskQuery = buildTaskQuery(familyId, babyId);
  const { total: totalTasks } = await db.collection('reminder_tasks').where(taskQuery).count();
  const { total: activeTasks } = await db.collection('reminder_tasks').where({ ...taskQuery, enabled: true }).count();

  // 今日提醒数
  const { data: todayTasks } = await db.collection('reminder_tasks')
    .where({ ...taskQuery, enabled: true, nextRemindTime: _.lte(today.end.toISOString()) })
    .get();
  const todayReminders = todayTasks.length;

  // 今日已完成
  const { data: todayLogs } = await db.collection('confirm_logs')
    .where({ familyId, action: 'completed', completedTime: _.gte(today.start.toISOString()) })
    .get();
  const todayCompleted = todayLogs.length;
  const todayCompletionRate = calcRate(todayCompleted, todayReminders);

  // 显著超时（一次查询同时得到 total 和 today）
  const { data: criticalTasks } = await db.collection('reminder_tasks')
    .where({ ...taskQuery, isCriticallyOverdue: true })
    .get();
  const totalCriticallyOverdue = criticalTasks.length;
  const todayCriticallyOverdue = criticalTasks.filter(
    (t) => t.overdueTimeoutAt >= today.start.toISOString()
  ).length;

  // 暂停事件（一次查询同时得到 total 和 today）
  const { data: pausedLogs } = await db.collection('confirm_logs')
    .where({ familyId, action: 'paused' })
    .get();
  const totalPaused = pausedLogs.length;
  const todayPaused = pausedLogs.filter(
    (l) => l.completedTime >= today.start.toISOString()
  ).length;

  // 总完成事件
  const { total: totalCompleted } = await db.collection('confirm_logs')
    .where({ familyId, action: 'completed' })
    .count();

  const totalEvents = totalCompleted + totalPaused + totalCriticallyOverdue;

  // 最近 7 天日期
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const weekStart = dayBoundaries(dates[0]).start;
  const weekEnd = dayBoundaries(dates[6]).end;

  // 一次查询整周 confirm_logs
  const { data: weekLogs } = await db.collection('confirm_logs')
    .where({
      familyId,
      completedTime: _.gte(weekStart.toISOString()).and(_.lte(weekEnd.toISOString())),
    })
    .get();

  // 一次查询整周显著超时
  const { data: weekCriticalTasks } = await db.collection('reminder_tasks')
    .where({
      ...taskQuery,
      isCriticallyOverdue: true,
      overdueTimeoutAt: _.gte(weekStart.toISOString()).and(_.lte(weekEnd.toISOString())),
    })
    .get();

  // 按日期分组
  const weekMap = {};
  dates.forEach((d) => { weekMap[toDateStr(d)] = emptyDayStat(toDateStr(d)); });

  weekLogs.forEach((l) => {
    const dateKey = toDateStr(new Date(l.completedTime));
    if (weekMap[dateKey]) {
      weekMap[dateKey].totalReminders++;
      if (l.action === 'completed') weekMap[dateKey].completedCount++;
      else if (l.action === 'delayed') weekMap[dateKey].delayedCount++;
      else if (l.action === 'ignored') weekMap[dateKey].ignoredCount++;
      else if (l.action === 'paused') weekMap[dateKey].pausedCount++;
    }
  });

  weekCriticalTasks.forEach((t) => {
    const dateKey = toDateStr(new Date(t.overdueTimeoutAt));
    if (weekMap[dateKey]) weekMap[dateKey].criticallyOverdueCount++;
  });

  const weeklyStats = Object.values(weekMap).map((day) => ({
    ...day,
    completionRate: calcRate(day.completedCount, day.totalReminders),
  }));

  // 类型统计
  const typeStats = await getTypeStats(familyId, weekStart.toISOString(), now.toISOString(), babyId);

  return success({
    totalBabies, totalTasks, activeTasks,
    todayReminders, todayCompleted, todayCompletionRate,
    todayCriticallyOverdue, totalCriticallyOverdue,
    todayPaused, totalPaused,
    totalCompleted, totalEvents,
    weeklyStats, typeStats,
  });
}

/** 日统计（按家庭查询） */
async function handleDaily(userId, familyId, params) {
  const { babyId, startDate, endDate } = params;
  const range = dayBoundaries(new Date(startDate));
  range.end = dayBoundaries(new Date(endDate)).end;

  const taskQuery = buildTaskQuery(familyId, babyId);

  const query = { familyId, completedTime: _.gte(range.start.toISOString()).and(_.lte(range.end.toISOString())) };
  if (babyId) query.babyId = babyId;

  const { data: logs } = await db.collection('confirm_logs').where(query).orderBy('completedTime', 'asc').get();

  const { data: criticallyOverdueTasks } = await db.collection('reminder_tasks')
    .where({
      ...taskQuery,
      isCriticallyOverdue: true,
      overdueTimeoutAt: _.gte(range.start.toISOString()).and(_.lte(range.end.toISOString())),
    })
    .get();

  const dayMap = {};
  const ensureDay = (dateStr) => {
    if (!dayMap[dateStr]) dayMap[dateStr] = emptyDayStat(dateStr);
    return dayMap[dateStr];
  };

  logs.forEach((l) => {
    const day = ensureDay(toDateStr(new Date(l.completedTime)));
    day.totalReminders++;
    if (l.action === 'completed') day.completedCount++;
    else if (l.action === 'delayed') day.delayedCount++;
    else if (l.action === 'ignored') day.ignoredCount++;
    else if (l.action === 'paused') day.pausedCount++;
  });

  criticallyOverdueTasks.forEach((t) => {
    const day = ensureDay(toDateStr(new Date(t.overdueTimeoutAt || t.createdAt)));
    day.criticallyOverdueCount++;
  });

  Object.values(dayMap).forEach((d) => { d.completionRate = calcRate(d.completedCount, d.totalReminders); });

  return success(Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)));
}

/** 类型统计 */
async function getTypeStats(familyId, startDate, endDate, babyId) {
  const query = { familyId, completedTime: _.gte(startDate).and(_.lte(endDate)) };
  if (babyId) query.babyId = babyId;

  const { data: logs } = await db.collection('confirm_logs').where(query).get();

  // 批量获取关联事项类型
  const taskIds = [...new Set(logs.map((l) => l.taskId))];
  const taskTypeMap = {};
  if (taskIds.length > 0) {
    // 微信云开发 _.in 单次最多 100 条
    const chunks = [];
    for (let i = 0; i < taskIds.length; i += 100) {
      chunks.push(taskIds.slice(i, i + 100));
    }
    const results = await Promise.all(chunks.map((ids) =>
      db.collection('reminder_tasks').where({ _id: _.in(ids) }).get()
    ));
    results.forEach(({ data }) => {
      data.forEach((t) => { taskTypeMap[t._id] = t.type; });
    });
  }

  const typeCountMap = {};
  logs.forEach((l) => {
    const type = taskTypeMap[l.taskId] || 'custom';
    typeCountMap[type] = (typeCountMap[type] || 0) + 1;
  });

  const total = Object.values(typeCountMap).reduce((a, b) => a + b, 0);
  return Object.entries(typeCountMap).map(([type, count]) => ({
    type,
    typeName: TASK_TYPE_NAMES[type] || '自定义',
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
  }));
}
