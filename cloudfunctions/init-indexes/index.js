/**
 * 数据库索引初始化（一次性云函数）
 *
 * 执行方式：在微信开发者工具中右键此云函数 → 上传并部署 → 云端测试
 * 或通过云函数 HTTP 触发器调用
 *
 * 说明：
 * - 已存在的索引会自动跳过（IndexAlreadyExists 错误）
 * - 索引创建是异步的，后台可能需要几秒到几分钟生效
 * - 建议在业务低峰期执行
 */

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// ============================================================
// 索引定义
// ============================================================
const INDEXES = [
  // ───────── P0：核心性能 ─────────
  {
    collection: 'users',
    name: 'idx_openId',
    keys: { openId: 1 },
    desc: '用户 openId 鉴权（所有云函数入口）',
  },
  {
    collection: 'families',
    name: 'idx_inviteCode',
    keys: { inviteCode: 1 },
    unique: true,
    desc: '家庭邀请码查找 → api-family',
  },
  {
    collection: 'reminder_tasks',
    name: 'idx_cron_scan',
    keys: {
      nextRemindTime: 1,
      endedAt: 1,
      processingLock: 1,
      isPaused: 1,
    },
    desc: 'cron-scan 每分钟扫描 → 未结束 + 到期 + 未锁定 + 未暂停',
  },
  {
    collection: 'reminder_tasks',
    name: 'idx_family_ended_next',
    keys: { familyId: 1, endedAt: 1, nextRemindTime: -1 },
    desc: '家庭时间线查询 → api-task timeline',
  },
  {
    collection: 'subscription_quotas',
    name: 'idx_quota_lookup',
    keys: {
      openId: 1,
      templateId: 1,
      status: 1,
      expireAt: 1,
      authorizedAt: 1,
    },
    desc: 'cron-scan 循环查询可用配额 → for 循环中每条一次',
  },

  // ───────── P1：重要优化 ─────────
  {
    collection: 'babies',
    name: 'idx_familyId_createdAt',
    keys: { familyId: 1, createdAt: 1 },
    desc: 'api-baby list 查询 → 解决 _.or 超时问题',
  },
  {
    collection: 'babies',
    name: 'idx_userId_createdAt',
    keys: { userId: 1, createdAt: 1 },
    desc: 'api-baby V1 单用户模式 → 解决 _.or 超时问题',
  },
  {
    collection: 'confirm_logs',
    name: 'idx_family_createdAt',
    keys: { familyId: 1, createdAt: -1 },
    desc: '统计按日聚合 + 历史列表 → api-stats & api-confirm',
  },
  {
    collection: 'confirm_logs',
    name: 'idx_family_action',
    keys: { familyId: 1, action: 1 },
    desc: '统计 ended 事件计数 → api-stats',
  },
  {
    collection: 'overdue_events',
    name: 'idx_family_occurredAt',
    keys: { familyId: 1, occurredAt: 1 },
    desc: '超时事件统计 → api-stats',
  },
  {
    collection: 'reminder_tasks',
    name: 'idx_family_createdAt',
    keys: { familyId: 1, createdAt: 1 },
    desc: '事项列表按家庭查询 → api-task list',
  },
  {
    collection: 'reminder_tasks',
    name: 'idx_babyId',
    keys: { babyId: 1 },
    desc: '删除宝宝时级联删除关联任务 → api-baby',
  },

  // ───────── P2：锦上添花 ─────────
  {
    collection: 'notification_logs',
    name: 'idx_sendTime',
    keys: { sendTime: 1 },
    desc: '定时清理过期日志 → cron-cleanup',
  },
  {
    collection: 'subscription_quotas',
    name: 'idx_openId_status',
    keys: { openId: 1, status: 1 },
    desc: '配额汇总统计 → api-subscribe',
  },
  {
    collection: 'confirm_logs',
    name: 'idx_babyId',
    keys: { babyId: 1 },
    desc: '删除宝宝时级联删除关联日志 → api-baby',
  },
  {
    collection: 'reminder_tasks',
    name: 'idx_userId',
    keys: { userId: 1 },
    desc: '家庭迁移时按用户更新 → api-family',
  },
];

// ============================================================
// 主函数
// ============================================================
exports.main = async (event, context) => {
  const results = {
    total: INDEXES.length,
    success: [],
    skipped: [],
    failed: [],
  };

  for (const idx of INDEXES) {
    const label = `${idx.collection}.${idx.name}`;
    try {
      console.log(`[创建] ${label} → ${idx.desc}`);

      await db.collection(idx.collection).createIndex({
        name: idx.name,
        keys: idx.keys,
        unique: idx.unique || false,
      });

      console.log(`[成功] ${label}`);
      results.success.push(label);
    } catch (err) {
      const code = err?.errCode || err?.code || '';
      const msg = err?.message || String(err);

      // 索引已存在 → 跳过（正常情况）
      if (
        code === -1 &&
        (msg.includes('IndexAlreadyExists') ||
          msg.includes('already exists') ||
          msg.includes('IndexOptionsConflict'))
      ) {
        console.log(`[跳过] ${label} → 索引已存在`);
        results.skipped.push(label);
      }
      // 集合不存在 → 记录
      else if (msg.includes('collection') && msg.includes('not exist')) {
        console.warn(`[跳过] ${label} → 集合 "${idx.collection}" 尚不存在（首次使用时会自动创建）`);
        results.skipped.push(`${label} (集合未创建)`);
      }
      // 方法不存在 → 说明 SDK 版本不支持，全部走 manual 模式
      else if (msg.includes('createIndex') && msg.includes('function')) {
        console.error(`[不支持] createIndex API 不可用（需升级 wx-server-sdk），剩余索引跳过`);
        results.failed.push({ index: label, error: 'SDK 不支持 createIndex，请在云开发控制台手动创建' });
        // 剩余全部标记为需要手动
        const remaining = INDEXES.slice(INDEXES.indexOf(idx) + 1);
        for (const r of remaining) {
          results.failed.push({
            index: `${r.collection}.${r.name}`,
            error: 'SDK 不支持 createIndex，请手动创建',
          });
        }
        break;
      }
      // 其他错误
      else {
        console.error(`[失败] ${label} → ${msg}`);
        results.failed.push({ index: label, error: msg });
      }
    }
  }

  // 输出摘要
  console.log('========================================');
  console.log(`总计: ${results.total}  成功: ${results.success.length}  跳过: ${results.skipped.length}  失败: ${results.failed.length}`);
  console.log('========================================');

  if (results.failed.length > 0) {
    console.warn('以下索引创建失败，需在云开发控制台手动创建：');
    results.failed.forEach((f) => {
      console.warn(`  → ${f.index}: ${f.error}`);
    });
  }

  // 返回给调用者
  return {
    code: results.failed.length > 0 ? 1 : 0,
    message:
      results.failed.length > 0
        ? `部分索引创建失败，请查看 failed 列表`
        : `索引初始化完成`,
    summary: `成功 ${results.success.length} / 跳过 ${results.skipped.length} / 失败 ${results.failed.length}`,
    ...results,
    // 附加大纲，供手动创建时参考
    manualGuide:
      results.failed.length > 0
        ? INDEXES.map((i) => ({
            collection: i.collection,
            index: i.name,
            keys: JSON.stringify(i.keys),
            desc: i.desc,
          }))
        : undefined,
  };
};
