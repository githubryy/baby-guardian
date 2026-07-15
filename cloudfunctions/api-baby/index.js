/**
 * api-baby 云函数
 * 宝宝 CRUD 操作
 */
const { cloud, db, _, success, fail, getOpenId, nowISO } = require('./utils');

exports.main = async (event, context) => {
  const { action } = event;
  const openId = getOpenId(event);

  try {
    // 获取 userId
    const { data: users } = await db.collection('users')
      .where({ openId })
      .limit(1)
      .get();
    if (users.length === 0) return fail('用户不存在，请重新登录');
    const currentUser = users[0];
    const userId = currentUser._id;
    const familyId = currentUser.familyId || userId;

    switch (action) {
      case 'list':
        return await handleList(userId, familyId);
      case 'detail':
        return await handleDetail(event.babyId);
      case 'add':
        return await handleAdd(userId, familyId, event.data);
      case 'update':
        return await handleUpdate(event.babyId, event.data);
      case 'delete':
        return await handleDelete(event.babyId);
      case 'setActive':
        return await handleSetActive(userId, familyId, event.babyId);
      default:
        return fail(`未知操作: ${action}`);
    }
  } catch (err) {
    console.error(`[api-baby] ${action} 错误:`, err);
    return fail(err.message || '服务器错误');
  }
};

/** 获取宝宝列表（按家庭查询，兼容 V1.0 单用户模式） */
async function handleList(userId, familyId) {
  // V2.0: 按 familyId 查询家庭共享的宝宝
  const { data } = await db.collection('babies')
    .where(_.or([{ familyId }, { userId: familyId }]))
    .orderBy('createdAt', 'asc')
    .get();
  return success(data);
}

/** 获取宝宝详情 */
async function handleDetail(babyId) {
  const { data } = await db.collection('babies').doc(babyId).get();
  return success(data);
}

/** 添加宝宝 */
async function handleAdd(userId, familyId, data) {
  const now = nowISO();
  const baby = {
    ...data,
    userId,
    familyId,
    createdBy: userId,
    isActive: false,
    createdAt: now,
    updatedAt: now,
  };
  const { _id } = await db.collection('babies').add({ data: baby });

  // 如果是第一个宝宝，设为活跃
  const { total } = await db.collection('babies')
    .where(_.or([{ familyId }, { userId: familyId }]))
    .count();
  if (total === 1) {
    await db.collection('babies').doc(_id).update({ data: { isActive: true } });
    baby.isActive = true;
  }

  return success({ ...baby, _id });
}

/** 更新宝宝 */
async function handleUpdate(babyId, data) {
  const updateData = { ...data, updatedAt: nowISO() };
  delete updateData._id;
  delete updateData.userId;

  await db.collection('babies').doc(babyId).update({ data: updateData });
  const { data: updated } = await db.collection('babies').doc(babyId).get();
  return success(updated);
}

/** 删除宝宝 */
async function handleDelete(babyId) {
  // 同时删除关联的提醒事项
  await db.collection('reminder_tasks')
    .where({ babyId })
    .remove();

  // 删除确认日志
  await db.collection('confirm_logs')
    .where({ babyId })
    .remove();

  await db.collection('babies').doc(babyId).remove();
  return success(null, '删除成功');
}

/** 设置当前活跃宝宝 */
async function handleSetActive(userId, familyId, babyId) {
  // 先取消家庭内所有活跃状态
  await db.collection('babies')
    .where(_.or([{ familyId, isActive: true }, { userId: familyId, isActive: true }]))
    .update({ data: { isActive: false } });

  // 设置新的活跃宝宝
  await db.collection('babies').doc(babyId).update({ data: { isActive: true } });
  return success(null);
}
