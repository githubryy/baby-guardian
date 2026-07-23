/**
 * api-stats 云函数
 * 统计查询: 概览、日统计、类型统计
 * 设计：3 次主数据查询（reminder_tasks + overdue_events + confirm_logs），其余全部内存计算
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
  return { date: dateStr, totalReminders: 0, completedCount: 0, delayedCount: 0, endedCount: 0, criticallyOverdueCount: 0, completionRate: 0 };
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

/**
 * 获取统计概览
 * 核心思路：只查 3 次数据库（reminder_tasks + overdue_events + confirm_logs），剩余全部内存计算
 */
async function handleSummary(userId, familyId, babyId) {
  // 宝宝数量
  const babyQuery = babyId
    ? _.or([{ familyId, _id: babyId }, { userId: familyId, _id: babyId }])
    : _.or([{ familyId }, { userId: familyId }]);
  const { total: totalBabies } = await db.collection('babies').where(babyQuery).count();

  // 最近 7 天范围
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const weekStart = dayBoundaries(dates[0]).start;
  const weekEnd = dayBoundaries(dates[6]).end;

  // ============ 查询 1/3：reminder_tasks（全量字段一次性取出） ============
  const taskQuery = buildTaskQuery(familyId, babyId);
  const { data: allTasks } = await db.collection('reminder_tasks')
    .where(taskQuery)
    .field({
      endedAt: true,
      taskMode: true,
      completedCount: true,
      type: true,
    })
    .get();

  // ============ 查询 2/3：overdue_events（全量，用于总计 + 本周日统计） ============
  const { data: allOverdueEvents } = await db.collection('overdue_events')
    .where({ familyId })
    .field({ occurredAt: true })
    .get();

  // ============ 查询 3/3：confirm_logs（本周范围，用于周统计 + 类型统计） ============
  const { data: weekLogs } = await db.collection('confirm_logs')
    .where({
      familyId,
      createdAt: _.gte(weekStart.toISOString()).and(_.lte(weekEnd.toISOString())),
    })
    .field({ createdAt: true, action: true, taskId: true })
    .get();

  // ============ 内存计算：所有统计指标 ============

  // ---- 事项基础统计 ----
  // 总事件：
  //   循环事件(taskMode=recurring): 已结束(endedAt有值) → completedCount, 未结束 → completedCount + 1
  //   单次事件(taskMode=once): 算 1 次
  const totalTasks = allTasks.reduce((sum, t) => {
    if (t.taskMode === 'recurring') {
      return sum + (t.completedCount || 0) + (!t.endedAt ? 1 : 0);
    }
    return sum + 1; // 单次事件
  }, 0);
  const activeTasks = allTasks.filter(t => !t.endedAt).length;

  // ---- 已完成事件：reminder_tasks.completedCount 累加 ----
  const totalCompleted = allTasks.reduce((sum, t) => sum + (t.completedCount || 0), 0);

  // ---- 显著超时：overdue_events 全量记录数 ----
  const totalCriticallyOverdue = allOverdueEvents.length;

  // 筛选本周超时事件
  const weekOverdueEvents = allOverdueEvents.filter(
    e => e.occurredAt >= weekStart.toISOString() && e.occurredAt <= weekEnd.toISOString()
  );

  // ---- 结束事件：confirm_logs 中 action=ended 的总数 ----
  // 需要全量统计（不限本周），用 count 查询（仅统计索引，极轻量）
  const { total: totalEnded } = await db.collection('confirm_logs')
    .where({ familyId, action: 'ended' })
    .count();

  // ---- 周统计（按日期聚合 weekLogs + overdueEvents） ----
  const weekMap = {};
  dates.forEach(d => { weekMap[toDateStr(d)] = emptyDayStat(toDateStr(d)); });

  weekLogs.forEach(l => {
    const dateKey = toDateStr(new Date(l.createdAt));
    if (weekMap[dateKey]) {
      weekMap[dateKey].totalReminders++;
      if (l.action === 'completed') weekMap[dateKey].completedCount++;
      else if (l.action === 'delayed') weekMap[dateKey].delayedCount++;
      else if (l.action === 'ended') weekMap[dateKey].endedCount++;
    }
  });

  weekOverdueEvents.forEach(e => {
    const dateKey = toDateStr(new Date(e.occurredAt));
    if (weekMap[dateKey]) weekMap[dateKey].criticallyOverdueCount++;
  });

  const weeklyStats = Object.values(weekMap).map(day => ({
    ...day,
    completionRate: calcRate(day.completedCount, day.totalReminders),
  }));

  // ---- 类型统计（内存计算：weekLogs + taskTypeMap） ----
  const taskTypeMap = {};
  allTasks.forEach(t => { taskTypeMap[t._id] = t.type; });

  const typeCountMap = {};
  weekLogs.forEach(l => {
    const type = taskTypeMap[l.taskId] || 'custom';
    typeCountMap[type] = (typeCountMap[type] || 0) + 1;
  });

  const typeTotal = Object.values(typeCountMap).reduce((a, b) => a + b, 0);
  const typeStats = Object.entries(typeCountMap).map(([type, count]) => ({
    type,
    typeName: TASK_TYPE_NAMES[type] || '自定义',
    count,
    percentage: typeTotal > 0 ? Math.round((count / typeTotal) * 100) : 0,
  }));

  return success({
    totalBabies, totalTasks, activeTasks,
    totalCriticallyOverdue, totalEnded,
    totalCompleted,
    weeklyStats, typeStats,
  });
}

/**
 * 日统计（按家庭查询）
 * 与 summary 同样的思路：2 次查询 + 内存计算
 */
async function handleDaily(userId, familyId, params) {
  const { babyId, startDate, endDate } = params;
  const range = dayBoundaries(new Date(startDate));
  range.end = dayBoundaries(new Date(endDate)).end;

  // ---- 查询 1/2：confirm_logs（日期范围内） ----
  const query = {
    familyId,
    createdAt: _.gte(range.start.toISOString()).and(_.lte(range.end.toISOString())),
  };
  if (babyId) query.babyId = babyId;
  const { data: logs } = await db.collection('confirm_logs')
    .where(query)
    .orderBy('createdAt', 'asc')
    .get();

  // ---- 查询 2/2：overdue_events（显著超时事件，按日精确统计） ----
  const { data: overdueEvents } = await db.collection('overdue_events')
    .where({
      familyId,
      occurredAt: _.gte(range.start.toISOString()).and(_.lte(range.end.toISOString())),
    })
    .field({ occurredAt: true })
    .get();

  // ---- 内存计算 ----
  const dayMap = {};
  const ensureDay = (dateStr) => {
    if (!dayMap[dateStr]) dayMap[dateStr] = emptyDayStat(dateStr);
    return dayMap[dateStr];
  };

  logs.forEach(l => {
    const day = ensureDay(toDateStr(new Date(l.createdAt)));
    day.totalReminders++;
    if (l.action === 'completed') day.completedCount++;
    else if (l.action === 'delayed') day.delayedCount++;
    else if (l.action === 'ended') day.endedCount++;
  });

  overdueEvents.forEach(e => {
    const day = ensureDay(toDateStr(new Date(e.occurredAt)));
    day.criticallyOverdueCount++;
  });

  Object.values(dayMap).forEach(d => { d.completionRate = calcRate(d.completedCount, d.totalReminders); });

  return success(Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)));
}

/**
 * 类型统计（仅用于独立 byType 调用）
 */
async function getTypeStats(familyId, startDate, endDate, babyId) {
  const query = { familyId, createdAt: _.gte(startDate).and(_.lte(endDate)) };
  if (babyId) query.babyId = babyId;

  const { data: logs } = await db.collection('confirm_logs').where(query).get();

  const taskIds = [...new Set(logs.map(l => l.taskId))];
  const taskTypeMap = {};
  if (taskIds.length > 0) {
    const chunks = [];
    for (let i = 0; i < taskIds.length; i += 100) {
      chunks.push(taskIds.slice(i, i + 100));
    }
    const results = await Promise.all(chunks.map(ids =>
      db.collection('reminder_tasks').where({ _id: _.in(ids) }).field({ type: true }).get()
    ));
    results.forEach(({ data }) => {
      data.forEach(t => { taskTypeMap[t._id] = t.type; });
    });
  }

  const typeCountMap = {};
  logs.forEach(l => {
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
