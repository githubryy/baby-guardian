/**
 * 云函数公共工具库
 * 在每个云函数中通过 require('./utils') 引入
 */

const cloud = require('wx-server-sdk');

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

/** 统一成功返回 */
function success(data = null, message = 'ok') {
  return { code: 0, message, data };
}

/** 统一失败返回 */
function fail(message = '操作失败', code = -1) {
  return { code, message, data: null };
}

/** 获取当前用户的 openId */
function getOpenId(event) {
  return event.userInfo?.openId || cloud.getWXContext().OPENID;
}

/** 生产环境 ID（需替换为实际的云环境 ID） */
const PROD_ENV_ID = 'cloudbase-d8g1n7nag24fc86c3';

/**
 * 根据当前云环境自动判断 miniprogramState
 * - 生产环境 → 'formal'  (已上线小程序)
 * - 开发/测试环境 → 'developer'  (开发版)
 * - 如需体验版用 'trial'，可将第二个值改为 'trial'
 */
function getMiniProgramState() {
  const currentEnv = cloud.getWXContext().ENV;
  return currentEnv === PROD_ENV_ID ? 'formal' : 'developer';
}

/** 生成 UTC 时间 */
function nowISO() {
  return new Date().toISOString();
}

/** 北京时区偏移 (小时) */
const CN_OFFSET = 8;

/**
 * 将北京时间 HH:MM 转为今天的 UTC Date
 */
function beijingTimeToDate(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const now = new Date();
  const utcDate = new Date(now);
  utcDate.setUTCHours(h - CN_OFFSET, m, 0, 0);
  return utcDate;
}

/**
 * 检查时间是否在提醒窗口内
 */
function isWithinWindow(date, windowStart, windowEnd) {
  const beijing = new Date(date.getTime() + CN_OFFSET * 3600 * 1000);
  const currentMinutes = beijing.getUTCHours() * 60 + beijing.getUTCMinutes();
  const [sh, sm] = windowStart.split(':').map(Number);
  const [eh, em] = windowEnd.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  if (startMin <= endMin) {
    return currentMinutes >= startMin && currentMinutes < endMin;
  }
  return currentMinutes >= startMin || currentMinutes < endMin;
}

/**
 * 获取下一个窗口开始时间的 Date
 */
function getNextWindowStart(windowStart) {
  const [h, m] = windowStart.split(':').map(Number);
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(h - CN_OFFSET, m, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

module.exports = {
  cloud,
  db,
  _,
  success,
  fail,
  getOpenId,
  getMiniProgramState,
  nowISO,
  beijingTimeToDate,
  isWithinWindow,
  getNextWindowStart,
  CN_OFFSET,
};
