/**
 * api-subscribe 云函数
 * 用户登录、用户信息管理、订阅配额管理
 */
const { cloud, db, _, success, fail, getOpenId, nowISO } = require('./utils');

// 订阅消息模板配置
const TEMPLATES = {
  feeding: '',   // 替换为实际模板ID
  care: '',      // 替换为实际模板ID
  medicine: '',  // 替换为实际模板ID
};

const QUOTA_EXPIRE_DAYS = 7;

exports.main = async (event, context) => {
  const { action } = event;
  const openId = getOpenId(event);

  try {
    switch (action) {
      case 'login':
        return await handleLogin(openId);
      case 'getCurrentUser':
        return await handleGetCurrentUser(openId);
      case 'updateUser':
        return await handleUpdateUser(openId, event.data);
      case 'updateSettings':
        return await handleUpdateSettings(openId, event.settings);
      case 'recordQuota':
        return await handleRecordQuota(openId, event.templates);
      case 'getQuotaSummary':
        return await handleGetQuotaSummary(openId);
      default:
        return fail(`未知操作: ${action}`);
    }
  } catch (err) {
    console.error(`[api-subscribe] ${action} 错误:`, err);
    return fail(err.message || '服务器错误');
  }
};

/** 微信登录 - 获取/创建用户 */
async function handleLogin(openId) {
  // 查询用户是否存在
  const { data: existing } = await db.collection('users')
    .where({ openId })
    .limit(1)
    .get();

  let user;
  if (existing.length > 0) {
    user = existing[0];
    // 更新最后登录时间
    await db.collection('users').doc(user._id).update({
      data: { updatedAt: nowISO() },
    });
  } else {
    // 创建新用户
    const now = nowISO();
    const newUser = {
      openId,
      nickName: '宝爸/宝妈',
      avatarUrl: '',
      settings: {
        globalPushEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      },
      familyId: '',
      createdAt: now,
      updatedAt: now,
    };
    const { _id } = await db.collection('users').add({ data: newUser });
    // familyId 默认等于自身用户ID
    await db.collection('users').doc(_id).update({ data: { familyId: _id } });
    user = { ...newUser, _id, familyId: _id };
  }

  return success(user);
}

/** 获取当前用户 */
async function handleGetCurrentUser(openId) {
  const { data } = await db.collection('users')
    .where({ openId })
    .limit(1)
    .get();
  if (data.length === 0) return fail('用户不存在');
  return success(data[0]);
}

/** 更新用户信息 */
async function handleUpdateUser(openId, data) {
  const { data: users } = await db.collection('users')
    .where({ openId })
    .limit(1)
    .get();
  if (users.length === 0) return fail('用户不存在');

  const { _id } = users[0];
  await db.collection('users').doc(_id).update({
    data: { ...data, updatedAt: nowISO() },
  });

  const { data: updated } = await db.collection('users').doc(_id).get();
  return success(updated);
}

/** 更新用户设置 */
async function handleUpdateSettings(openId, settings) {
  const { data: users } = await db.collection('users')
    .where({ openId })
    .limit(1)
    .get();
  if (users.length === 0) return fail('用户不存在');

  const user = users[0];
  const newSettings = { ...user.settings, ...settings };

  await db.collection('users').doc(user._id).update({
    data: { settings: newSettings, updatedAt: nowISO() },
  });

  const { data: updated } = await db.collection('users').doc(user._id).get();
  return success(updated);
}

/**
 * 记录订阅授权 - 写入配额
 * P0: 每次授权获得1条配额，7天有效
 */
async function handleRecordQuota(openId, templates) {
  const now = nowISO();
  const expire = new Date();
  expire.setDate(expire.getDate() + QUOTA_EXPIRE_DAYS);

  const quotas = templates.map((key) => ({
    openId,
    templateId: TEMPLATES[key] || key,
    templateKey: key,
    status: 'available',
    authorizedAt: now,
    expireAt: expire.toISOString(),
    consumedAt: null,
    consumedByTaskId: null,
    notificationLogId: null,
  }));

  const results = await Promise.all(
    quotas.map((q) =>
      db.collection('subscription_quotas').add({ data: q }).catch((err) => {
        // 重复授权不视为错误：同一用户在相近时间授权相同模板会导致唯一索引冲突
        if (err.errCode === 'DATABASE_REQUEST_FAILED' || (err.message && err.message.includes('E11000'))) {
          console.log('[配额记录] 跳过重复记录:', q.templateKey);
          return null;
        }
        throw err;
      })
    )
  );

  const created = results.filter(Boolean).length;
  return success({ created });
}

/** 获取配额汇总 */
async function handleGetQuotaSummary(openId) {
  const now = nowISO();

  // 标记过期配额
  await db.collection('subscription_quotas')
    .where({ openId, status: 'available', expireAt: _.lt(now) })
    .update({ data: { status: 'expired' } });

  // 统计
  const { total: totalCount } = await db.collection('subscription_quotas')
    .where({ openId })
    .count();

  const { total: availableCount } = await db.collection('subscription_quotas')
    .where({ openId, status: 'available' })
    .count();

  const { total: consumedCount } = await db.collection('subscription_quotas')
    .where({ openId, status: 'consumed' })
    .count();

  const { total: expiredCount } = await db.collection('subscription_quotas')
    .where({ openId, status: 'expired' })
    .count();

  // 按模板分类
  const byTemplate = { feeding: 0, care: 0, medicine: 0 };
  const { data: availableList } = await db.collection('subscription_quotas')
    .where({ openId, status: 'available' })
    .get();

  availableList.forEach((q) => {
    const key = q.templateKey || 'feeding';
    if (byTemplate[key] !== undefined) {
      byTemplate[key]++;
    }
  });

  return success({
    total: totalCount,
    available: availableCount,
    consumed: consumedCount,
    expired: expiredCount,
    byTemplate,
  });
}
