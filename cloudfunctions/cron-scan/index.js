/**
 * cron-scan 云函数
 * 定时扫描到期事项 → 检查配额 → 检查窗口 → 发送订阅消息 → 消耗配额
 *
 * P0: 每分钟执行一次 (微信云开发定时触发器最小间隔)
 * P1: 分批处理 (最多50条/次), 乐观锁防重复
 * P1: 重试策略 — 首次用订阅消息, 重试用小程序内通知(红点)
 * P2: 优先级分层 — P0/P1 用订阅消息, P2 仅红点
 */
const {
  cloud,
  db,
  _,
  success,
  fail,
  nowISO,
  isWithinWindow,
  getNextWindowStart,
  getMiniProgramState,
} = require("./utils");

const BATCH_LIMIT = 50;
const LOCK_TIMEOUT_MINUTES = 5;
const OVERDUE_TIMEOUT_MINUTES = 10;

/**
 * 基于当前排定时间计算下一个提醒时间（保持对齐，防止漂移）
 * @param {string} currentNextRemindTime 当前 nextRemindTime（ISO 字符串）
 * @param {number} intervalMinutes 间隔分钟
 * @param {Date} now 当前时间
 */
function calcNextRemindTime(currentNextRemindTime, intervalMinutes, now) {
  // 只推进一个间隔，不循环递推
  // 如果结果仍落后于当前时间，由 step 4y 的超时检测统一处理，避免循环事件永不超时
  const nextTime = new Date(new Date(currentNextRemindTime).getTime() + intervalMinutes * 60 * 1000);
  return nextTime;
}

/**
 * 构建推送后的统一更新数据
 * - 所有任务推送后统一标记 isOverdue=true，等待用户手动操作
 * - 不推进 nextRemindTime，时间推进由 api-confirm（完成/延迟/忽略）驱动
 * @returns {object} update 的 data 字段
 */
function buildOverdueUpdate() {
  return { isOverdue: true };
}

// 订阅消息模板ID (需与微信公众平台申请的一致)
const TEMPLATES = {
  feeding: "cJTFLqrWfBPcHGmBsMiVp86CZ5Tf4Gl9oAHIWKtcLaQ",
  care: "WvNgDqkdCzyJuTeirnpFjNDX3oVYJ7wLmGuK8hJbVu4",
  medicine: "Iqg9G1yjGeuWB4NZ9C6xbQa9hbvn_IRn8B2gezTcElw",
};

// 模板与事项类型映射
const TYPE_TEMPLATE_MAP = {
  feeding: "feeding",
  diaper: "care",
  sleep: "care",
  vitamin: "medicine",
  medicine: "medicine",
};

exports.main = async (event, context) => {
  console.log("[cron-scan] 开始扫描", new Date().toISOString());
  const startTime = Date.now();
  let processed = 0;
  let pushed = 0;
  let quotaExhausted = 0;
  let windowSkipped = 0;
  let errors = 0;

  try {
    const now = new Date();

    // 1. 解锁超时锁 (超过5分钟的锁)
    await unlockStaleTasks(now);

    // 2. 查询到期事项 (最多 BATCH_LIMIT 条, 未锁定)
    const { data: tasks } = await db
      .collection("reminder_tasks")
      .where({
        enabled: true,
        nextRemindTime: _.lte(now.toISOString()),
        processingLock: false,
        isPaused: _.neq(true), // 暂停的任务不处理
      })
      .orderBy("nextRemindTime", "asc")
      .limit(BATCH_LIMIT)
      .get();

    if (tasks.length === 0) {
      console.log("[cron-scan] 无到期事项");
      return success({ processed: 0, message: "无到期事项" });
    }

    console.log(`[cron-scan] 找到 ${tasks.length} 条到期事项`);

    // 3. 批量锁定
    await Promise.all(
      tasks.map((task) =>
        db
          .collection("reminder_tasks")
          .doc(task._id)
          .update({
            data: { processingLock: true, lockedAt: now.toISOString() },
          }),
      ),
    );

    // 4. 逐条处理 (使用 allSettled 防止单条失败影响整体)
    const results = await Promise.allSettled(
      tasks.map(async (task) => {
        processed++;

        // 4z. 已推送过的超时任务：不再重复推送，记录超时时长，超时过长标记显著超时
        if (task.isOverdue) {
          const nowTs = now.getTime();

          // 首次检测到 isOverdue，记录开始时间
          if (!task.overdueDetectedAt) {
            console.log(`[cron-scan] 事项 ${task._id} 首次检测到超时，开始计时`);
            await db.collection("reminder_tasks").doc(task._id).update({
              data: { overdueDetectedAt: now.toISOString() },
            });
            return;
          }

          // 计算已持续的时长
          const detectedAt = new Date(task.overdueDetectedAt).getTime();
          const elapsedMinutes = (nowTs - detectedAt) / (60 * 1000);
          console.log(
            `[cron-scan] 事项 ${task._id} 已超时 ${elapsedMinutes.toFixed(1)} 分钟`,
          );

          // 超过10分钟且尚未标记显著超时
          if (elapsedMinutes >= OVERDUE_TIMEOUT_MINUTES && !task.isOverdueCritically) {
            console.log(
              `[cron-scan] 事项 ${task._id} 超时超过${OVERDUE_TIMEOUT_MINUTES}分钟，标记显著超时`,
            );
            await logNotification(
              task,
              null,
              "overdue_timeout",
              { code: "OVERDUE_TIMEOUT", message: `超时超过${OVERDUE_TIMEOUT_MINUTES}分钟` },
              0,
              "system",
            );
            // 停止计时并记录显著超时标识，递增显著超时次数
            await db.collection("reminder_tasks").doc(task._id).update({
              data: {
                overdueDetectedAt: null,
                isOverdueCritically: true,
                overdueTimeoutAt: now.toISOString(),
                overdueCriticallyCount: _.inc(1),
              },
            });
            return;
          }

          // 仍在持续计时中（未超过10分钟），跳过
          console.log(`[cron-scan] 事项 ${task._id} 超时计时中，跳过`);
          return;
        }

        // 4a. 检查提醒窗口
        if (
          !isWithinWindow(now, task.reminderWindowStart, task.reminderWindowEnd)
        ) {
          console.log(`[cron-scan] 事项 ${task._id} 不在提醒窗口内`);
          windowSkipped++;
          // skip_and_continue: 基于排定时间递推，防止漂移
          let nextStart = calcNextRemindTime(task.nextRemindTime, task.intervalMinutes, now);
          // 根据策略处理
          if (task.windowSkipStrategy === "delay_to_next_window") {
            nextStart = getNextWindowStart(task.reminderWindowStart);
          }
          await db
            .collection("reminder_tasks")
            .doc(task._id)
            .update({
              data: { nextRemindTime: nextStart.toISOString() },
            });
          return;
        }

        // 4b. P2 优先级事项 — 仅红点通知，不消耗配额
        if (task.priority === "p2") {
          console.log(`[cron-scan] 事项 ${task._id} 为P2优先级，仅红点通知`);
          await db.collection("reminder_tasks").doc(task._id).update({
            data: buildOverdueUpdate(),
          });
          await logNotification(task, null, "success", null, 0, "red_dot_only");
          return;
        }

        // 4d. 获取家庭所有成员的配额
        const familyQuotas = await getFamilyQuotas(task);
        if (familyQuotas.length === 0) {
          console.log(`[cron-scan] 事项 ${task._id} 家庭配额不足`);
          quotaExhausted++;
          await logNotification(task, null, "quota_exhausted", null, 0);
          // 不修改任务状态，让其自然进入超时，用户在时间线中仍能看到
          return;
        }
        // 4e. 向有配额的家庭成员发送订阅消息
        let anySuccess = false;
        for (const fq of familyQuotas) {
          const sendResult = await sendSubscriptionMessage(task, fq);
          await logNotification(
            task,
            fq,
            sendResult.status,
            sendResult.error,
            0,
          );

          if (sendResult.status === "success") {
            pushed++;
            anySuccess = true;
            // 消耗配额
            await consumeQuota(fq.quotaId, task._id);
          }
        }

        // 4f. 更新事项：推送后统一标记超时状态，防止重复推送
        await db.collection("reminder_tasks").doc(task._id).update({
          data: buildOverdueUpdate(),
        });
      }),
    );

    // 统计错误
    errors = results.filter((r) => r.status === "rejected").length;
    if (errors > 0) {
      results
        .filter((r) => r.status === "rejected")
        .forEach((r) => {
          console.error("[cron-scan] 处理失败:", r.reason);
        });
    }

    // 5. 解锁所有处理完的事项
    await Promise.all(
      tasks.map((task) =>
        db
          .collection("reminder_tasks")
          .doc(task._id)
          .update({
            data: { processingLock: false, lockedAt: null },
          }),
      ),
    );

    const duration = Date.now() - startTime;
    console.log(
      `[cron-scan] 扫描完成: 处理${processed}条, 推送${pushed}条, 配额不足${quotaExhausted}条, 窗口外${windowSkipped}条, 错误${errors}条, 耗时${duration}ms`,
    );

    return success({
      processed,
      pushed,
      quotaExhausted,
      windowSkipped,
      errors,
      duration,
    });
  } catch (err) {
    console.error("[cron-scan] 扫描异常:", err);
    return fail(err.message || "扫描异常");
  }
};

/**
 * 解锁超时锁 (超过5分钟未释放的锁)
 */
async function unlockStaleTasks(now) {
  const staleTime = new Date(now.getTime() - LOCK_TIMEOUT_MINUTES * 60 * 1000);
  await db
    .collection("reminder_tasks")
    .where({
      processingLock: true,
      lockedAt: _.lt(staleTime.toISOString()),
    })
    .update({
      data: { processingLock: false, lockedAt: null },
    });
}

/**
 * 获取家庭所有成员的可用配额
 * V2.0: 向所有家庭成员推送，只要有一个人有配额就推送
 */
async function getFamilyQuotas(task) {
  const templateKey = TYPE_TEMPLATE_MAP[task.type];
  if (!templateKey) return [];

  const templateId = TEMPLATES[templateKey];
  if (!templateId) return [];

  // 获取家庭信息
  const familyId = task.familyId || task.userId;
  const { data: family } = await db
    .collection("families")
    .doc(familyId)
    .get()
    .catch(() => ({ data: null }));

  // 获取家庭所有成员的 userId 和 openId
  let memberUserIds = [task.userId];
  if (family && family.members) {
    memberUserIds = family.members.map((m) => m.userId);
  }

  const { data: memberUsers } = await db
    .collection("users")
    .where({ _id: _.in(memberUserIds) })
    .get();

  const now = nowISO();
  const result = [];

  for (const user of memberUsers) {
    // 查找该成员的可用配额
    const { data: quotas } = await db
      .collection("subscription_quotas")
      .where({
        openId: user.openId,
        templateId: templateId,
        status: "available",
        expireAt: _.gt(now),
      })
      .orderBy("authorizedAt", "asc")
      .limit(1)
      .get();

    if (quotas.length > 0) {
      result.push({
        quotaId: quotas[0]._id,
        openId: user.openId,
        user,
      });
    }
  }

  return result;
}

/**
 * 发送订阅消息
 */
async function sendSubscriptionMessage(task, familyQuota) {
  try {
    const { data: baby } = await db.collection("babies").doc(task.babyId).get();

    const templateKey = TYPE_TEMPLATE_MAP[task.type];
    const templateId = TEMPLATES[templateKey];

    // 构建消息数据 (根据模板字段配置)
    const sendData = buildMessageData(task, baby, templateKey);
    const result = await cloud.openapi.subscribeMessage.send({
      touser: familyQuota.openId,
      templateId,
      data: sendData,
      miniprogramState: getMiniProgramState(),
      lang: "zh_CN",
    });

    if (result.errCode === 0) {
      console.log(
        `[cron-scan] 推送成功: 事项 ${task._id} → ${familyQuota.user.nickName}`,
      );
      return { status: "success", error: null };
    } else {
      console.error(
        `[cron-scan] 推送失败: 事项 ${task._id} → ${familyQuota.openId}`,
        result,
      );
      return {
        status: "failed",
        error: { code: result.errCode, message: result.errMsg },
      };
    }
  } catch (err) {
    console.error(`[cron-scan] 推送异常: 事项 ${task._id}`, err);
    return {
      status: "failed",
      error: { code: err.errCode, message: err.errMsg },
    };
  }
}

/**
 * 构建订阅消息数据
 * 根据模板类型构建不同字段
 */
function buildMessageData(task, baby, templateKey) {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 3600 * 1000);
  const timeStr = `${String(beijingTime.getUTCHours()).padStart(2, "0")}:${String(beijingTime.getUTCMinutes()).padStart(2, "0")}`;
  const babyName = baby?.name || "宝宝";
  const taskName = task.customName || "";

  switch (templateKey) {
    case "feeding":
      // 模板ID: cJTFL... (签到提醒) — 字段: time11(任务时间), thing1(活动名称)
      return {
        thing1: { value: `${babyName} ${taskName || "喂养"}` },
        time11: { value: timeStr },
      };
    case "care":
      // 模板ID: WvNgD... (定时维护提醒) — 字段: time3(提醒时间), thing4(提醒内容)
      return {
        time3: { value: timeStr },
        thing4: { value: `${babyName} ${taskName || "护理"}` },
      };
    case "medicine":
      // 模板ID: Iqg9G... (日程提醒) — 字段: thing2(提醒内容), time3(执行时间), thing8(紧急度)
      return {
        thing2: { value: `${babyName} ${taskName || "用药"}` },
        time3: { value: timeStr },
        thing8: { value: "普通" },
      };
    default:
      return {
        time3: { value: timeStr },
        thing4: { value: "提醒" },
      };
  }
}

/**
 * 消耗配额
 */
async function consumeQuota(quotaId, taskId) {
  await db
    .collection("subscription_quotas")
    .doc(quotaId)
    .update({
      data: {
        status: "consumed",
        consumedAt: nowISO(),
        consumedByTaskId: taskId,
      },
    });
}

/**
 * 记录推送日志
 */
async function logNotification(
  task,
  familyQuota,
  status,
  error,
  retryRound,
  method = "subscribe",
) {
  const openId = familyQuota?.openId || "";
  const quotaId = familyQuota?.quotaId || null;

  await db.collection("notification_logs").add({
    data: {
      taskId: task._id,
      babyId: task.babyId,
      openId,
      templateId: TEMPLATES[TYPE_TEMPLATE_MAP[task.type]] || "",
      quotaId,
      sendStatus: status,
      errorCode: error?.code || null,
      errorMessage: error?.message || null,
      sendTime: nowISO(),
      retryRound: retryRound || 0,
      method,
    },
  });
}
