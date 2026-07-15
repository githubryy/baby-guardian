/**
 * api-family 云函数
 * 家庭组管理：创建/邀请/成员管理/宝宝共享
 *
 * Actions:
 *   create           - 创建家庭（创建者成为 owner）
 *   getMyFamily      - 获取当前用户的家庭信息（含成员列表）
 *   joinByCode       - 通过邀请码加入家庭
 *   generateInviteCode - 重新生成邀请码
 *   updateMember     - 更新成员身份/角色
 *   removeMember     - 移除成员（仅 owner/admin）
 *   leaveFamily      - 退出家庭
 *   updateSettings   - 更新家庭设置
 *   getMembers       - 获取家庭成员列表（含用户详情）
 */
const { cloud, db, _, success, fail, getOpenId, nowISO } = require('./utils');

exports.main = async (event, context) => {
  const { action } = event;
  const openId = getOpenId(event);

  try {
    // 获取当前用户
    const { data: users } = await db.collection('users')
      .where({ openId })
      .limit(1)
      .get();
    if (users.length === 0) return fail('用户不存在，请重新登录');
    const currentUser = users[0];

    switch (action) {
      case 'create':
        return await handleCreate(currentUser, event.data);
      case 'getMyFamily':
        return await handleGetMyFamily(currentUser);
      case 'joinByCode':
        return await handleJoinByCode(currentUser, event.inviteCode, event.relation);
      case 'generateInviteCode':
        return await handleGenerateInviteCode(currentUser);
      case 'updateMember':
        return await handleUpdateMember(currentUser, event.memberId, event.data);
      case 'removeMember':
        return await handleRemoveMember(currentUser, event.memberId);
      case 'leaveFamily':
        return await handleLeaveFamily(currentUser);
      case 'updateSettings':
        return await handleUpdateSettings(currentUser, event.settings);
      case 'getMembers':
        return await handleGetMembers(currentUser);
      default:
        return fail(`未知操作: ${action}`);
    }
  } catch (err) {
    console.error(`[api-family] ${action} 错误:`, err);
    return fail(err.message || '服务器错误');
  }
};

/**
 * 创建家庭
 * 创建者自动成为 owner，原有宝宝迁移到家庭
 */
async function handleCreate(user, data) {
  const { name } = data;

  // 检查是否已有家庭（familyId 不等于自身 userId 说明已加入某家庭）
  if (user.familyId && user.familyId !== user._id) {
    // 查询是否真的有家庭记录
    const { data: existingFamily } = await db.collection('families')
      .doc(user.familyId)
      .get()
      .catch(() => ({ data: null }));
    if (existingFamily) {
      return fail('您已在家庭中，请先退出当前家庭');
    }
  }

  const now = nowISO();
  const inviteCode = generateCode();

  const family = {
    name: name || `${user.nickName}的家庭`,
    ownerUserId: user._id,
    inviteCode,
    members: [{
      userId: user._id,
      role: 'owner',
      relation: user.relation || 'father',
      joinedAt: now,
      nickName: user.nickName,
      avatarUrl: user.avatarUrl || '',
    }],
    settings: {
      notifyOnComplete: true,
      defaultAssignee: '',
    },
    createdAt: now,
    updatedAt: now,
  };

  const { _id: familyId } = await db.collection('families').add({ data: family });

  // 更新用户的 familyId
  await db.collection('users').doc(user._id).update({
    data: { familyId, updatedAt: now },
  });

  // 将该用户创建的宝宝迁移到家庭
  await db.collection('babies')
    .where({ userId: user._id })
    .update({
      data: { familyId, updatedAt: now },
    });

  // 将该用户的提醒事项关联到家庭
  await db.collection('reminder_tasks')
    .where({ userId: user._id })
    .update({
      data: { familyId, updatedAt: now },
    });

  return success({ ...family, _id: familyId });
}

/**
 * 获取当前用户的家庭信息
 */
async function handleGetMyFamily(user) {
  if (!user.familyId) return success(null);

  const { data: family } = await db.collection('families')
    .doc(user.familyId)
    .get()
    .catch(() => ({ data: null }));

  if (!family) {
    // 家庭记录不存在，重置用户 familyId
    await db.collection('users').doc(user._id).update({
      data: { familyId: user._id },
    });
    return success(null);
  }

  // 补全成员的最新昵称/头像
  const memberUserIds = family.members.map(m => m.userId);
  if (memberUserIds.length > 0) {
    const { data: memberUsers } = await db.collection('users')
      .where({ _id: _.in(memberUserIds) })
      .get();

    const userMap = {};
    memberUsers.forEach(u => {
      userMap[u._id] = u;
    });

    family.members = family.members.map(m => ({
      ...m,
      nickName: userMap[m.userId]?.nickName || m.nickName,
      avatarUrl: userMap[m.userId]?.avatarUrl || m.avatarUrl,
    }));
  }

  return success(family);
}

/**
 * 通过邀请码加入家庭
 */
async function handleJoinByCode(user, inviteCode, relation) {
  if (!inviteCode) return fail('请输入邀请码');
  if (!relation) return fail('请选择您的身份');

  // 查找家庭
  const { data: families } = await db.collection('families')
    .where({ inviteCode })
    .limit(1)
    .get();

  if (families.length === 0) return fail('邀请码无效或已过期');
  const family = families[0];

  // 检查是否已是成员
  const isMember = family.members.some(m => m.userId === user._id);
  if (isMember) return fail('您已是该家庭成员');

  // 如果用户已有其他家庭，先退出
  if (user.familyId && user.familyId !== family._id && user.familyId !== user._id) {
    await leaveFamilyInternal(user);
  }

  const now = nowISO();

  // 添加成员
  family.members.push({
    userId: user._id,
    role: 'member',
    relation,
    joinedAt: now,
    nickName: user.nickName,
    avatarUrl: user.avatarUrl || '',
  });

  await db.collection('families').doc(family._id).update({
    data: {
      members: family.members,
      updatedAt: now,
    },
  });

  // 更新用户的 familyId 和 relation
  await db.collection('users').doc(user._id).update({
    data: { familyId: family._id, relation, updatedAt: now },
  });

  // 将该用户的宝宝迁移到新家庭
  await db.collection('babies')
    .where({ userId: user._id })
    .update({
      data: { familyId: family._id, updatedAt: now },
    });

  // 将该用户的提醒事项关联到新家庭
  await db.collection('reminder_tasks')
    .where({ userId: user._id })
    .update({
      data: { familyId: family._id },
    });

  return success(family, '加入家庭成功');
}

/**
 * 重新生成邀请码
 */
async function handleGenerateInviteCode(user) {
  const family = await getUserFamily(user);
  if (!family) return fail('您还没有创建家庭');

  // 仅 owner 可重新生成
  if (family.ownerUserId !== user._id) {
    return fail('仅家庭创建者可以重新生成邀请码');
  }

  const newCode = generateCode();
  await db.collection('families').doc(family._id).update({
    data: { inviteCode: newCode, updatedAt: nowISO() },
  });

  return success({ inviteCode: newCode });
}

/**
 * 更新成员身份/角色
 */
async function handleUpdateMember(user, memberId, data) {
  const family = await getUserFamily(user);
  if (!family) return fail('您还没有家庭');

  // 仅 owner/admin 可操作
  const myRole = family.members.find(m => m.userId === user._id)?.role;
  if (myRole !== 'owner' && myRole !== 'admin') {
    return fail('没有权限操作');
  }

  const memberIndex = family.members.findIndex(m => m.userId === memberId);
  if (memberIndex < 0) return fail('成员不存在');

  // 不能修改 owner 的角色
  if (family.members[memberIndex].role === 'owner' && data.role) {
    return fail('不能修改家庭创建者的角色');
  }

  // 更新成员信息
  if (data.relation) {
    family.members[memberIndex].relation = data.relation;
  }
  if (data.role && family.members[memberIndex].role !== 'owner') {
    family.members[memberIndex].role = data.role;
  }

  await db.collection('families').doc(family._id).update({
    data: { members: family.members, updatedAt: nowISO() },
  });

  // 同步更新用户的 relation
  if (data.relation) {
    await db.collection('users').doc(memberId).update({
      data: { relation: data.relation },
    });
  }

  return success(family.members[memberIndex]);
}

/**
 * 移除成员
 */
async function handleRemoveMember(user, memberId) {
  const family = await getUserFamily(user);
  if (!family) return fail('您还没有家庭');

  const myRole = family.members.find(m => m.userId === user._id)?.role;
  if (myRole !== 'owner' && myRole !== 'admin') {
    return fail('没有权限操作');
  }

  const memberIndex = family.members.findIndex(m => m.userId === memberId);
  if (memberIndex < 0) return fail('成员不存在');

  if (family.members[memberIndex].role === 'owner') {
    return fail('不能移除家庭创建者');
  }

  // 从成员列表移除
  family.members.splice(memberIndex, 1);
  await db.collection('families').doc(family._id).update({
    data: { members: family.members, updatedAt: nowISO() },
  });

  // 重置被移除用户的 familyId
  await db.collection('users').doc(memberId).update({
    data: { familyId: memberId, relation: _.remove() },
  });

  // 将该用户创建的宝宝从家庭移除（回归个人）
  await db.collection('babies')
    .where({ userId: memberId, familyId: family._id })
    .update({
      data: { familyId: memberId },
    });

  return success(null, '已移除成员');
}

/**
 * 退出家庭
 */
async function handleLeaveFamily(user) {
  const family = await getUserFamily(user);
  if (!family) return fail('您还没有家庭');

  if (family.ownerUserId === user._id) {
    return fail('家庭创建者不能退出，请先转让或解散家庭');
  }

  await leaveFamilyInternal(user);
  return success(null, '已退出家庭');
}

/**
 * 更新家庭设置
 */
async function handleUpdateSettings(user, settings) {
  const family = await getUserFamily(user);
  if (!family) return fail('您还没有家庭');

  const myRole = family.members.find(m => m.userId === user._id)?.role;
  if (myRole !== 'owner' && myRole !== 'admin') {
    return fail('没有权限操作');
  }

  const newSettings = { ...family.settings, ...settings };
  await db.collection('families').doc(family._id).update({
    data: { settings: newSettings, updatedAt: nowISO() },
  });

  return success(newSettings);
}

/**
 * 获取家庭成员列表（含用户详情）
 */
async function handleGetMembers(user) {
  const family = await getUserFamily(user);
  if (!family) return success([]);

  // 补全成员最新信息
  const memberUserIds = family.members.map(m => m.userId);
  if (memberUserIds.length === 0) return success([]);

  const { data: memberUsers } = await db.collection('users')
    .where({ _id: _.in(memberUserIds) })
    .get();

  const userMap = {};
  memberUsers.forEach(u => {
    userMap[u._id] = u;
  });

  const members = family.members.map(m => ({
    ...m,
    nickName: userMap[m.userId]?.nickName || m.nickName,
    avatarUrl: userMap[m.userId]?.avatarUrl || m.avatarUrl,
  }));

  return success(members);
}

// ==================== 辅助函数 ====================

/** 获取用户的家庭 */
async function getUserFamily(user) {
  if (!user.familyId) return null;
  const { data: family } = await db.collection('families')
    .doc(user.familyId)
    .get()
    .catch(() => ({ data: null }));
  return family;
}

/** 退出家庭内部逻辑 */
async function leaveFamilyInternal(user) {
  const family = await getUserFamily(user);
  if (!family) return;

  // 从成员列表移除
  family.members = family.members.filter(m => m.userId !== user._id);
  await db.collection('families').doc(family._id).update({
    data: { members: family.members, updatedAt: nowISO() },
  });

  // 重置用户 familyId
  await db.collection('users').doc(user._id).update({
    data: { familyId: user._id },
  });

  // 将该用户创建的宝宝从家庭移除
  await db.collection('babies')
    .where({ userId: user._id, familyId: family._id })
    .update({
      data: { familyId: user._id },
    });
}

/** 生成6位邀请码 */
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
