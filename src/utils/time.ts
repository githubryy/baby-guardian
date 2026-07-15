/**
 * 时间处理工具
 * 统一使用 UTC 存储，展示时转为北京时间 (UTC+8)
 */

/** 北京时区偏移 (小时) */
const CN_OFFSET = 8;

/**
 * 获取当前时间的 ISO 字符串 (UTC)
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * 将 Date 或时间字符串格式化为 HH:MM
 */
export function formatTime(date: Date | string | number): string {
  const d = typeof date === 'object' ? date : new Date(date);
  // 转为北京时间
  const beijingTime = new Date(d.getTime() + CN_OFFSET * 3600 * 1000);
  const h = String(beijingTime.getUTCHours()).padStart(2, '0');
  const m = String(beijingTime.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * 格式化日期为 YYYY-MM-DD (北京时间)
 */
export function formatDate(date: Date | string | number): string {
  const d = typeof date === 'object' ? date : new Date(date);
  const beijingTime = new Date(d.getTime() + CN_OFFSET * 3600 * 1000);
  const y = beijingTime.getUTCFullYear();
  const m = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 格式化日期时间 YYYY-MM-DD HH:MM
 */
export function formatDateTime(date: Date | string | number): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

/**
 * 获取今天的日期字符串 (北京时间)
 */
export function today(): string {
  return formatDate(new Date());
}

/**
 * 计算距现在的相对时间描述
 * @param isoTime ISO 8601 时间字符串
 * @returns 如 "3小时前"、"刚刚"、"2天后"
 */
export function relativeTime(isoTime: string): string {
  const target = new Date(isoTime).getTime();
  const now = Date.now();
  const diff = target - now;
  const absDiff = Math.abs(diff);

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  const isFuture = diff > 0;

  if (absDiff < minute) return '刚刚';
  if (absDiff < hour) {
    const m = Math.floor(absDiff / minute);
    return isFuture ? `${m}分钟后` : `${m}分钟前`;
  }
  if (absDiff < day) {
    const h = Math.floor(absDiff / hour);
    return isFuture ? `${h}小时后` : `${h}小时前`;
  }
  const d = Math.floor(absDiff / day);
  return isFuture ? `${d}天后` : `${d}天前`;
}

/**
 * 计算时长描述 (分钟转可读文本)
 */
export function durationText(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) {
    if (h < 24) return `${h}小时`;
    const d = Math.floor(h / 24);
    const remainH = h % 24;
    return remainH === 0 ? `${d}天` : `${d}天${remainH}小时`;
  }
  return `${h}小时${m}分钟`;
}

/**
 * 根据日期字符串计算年龄 (月龄/岁)
 */
export function calcAge(birthday: string): { text: string; months: number } {
  const birth = new Date(birthday);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  const totalMonths = years * 12 + months;

  if (years === 0) {
    return { text: `${months}个月`, months: totalMonths };
  }
  if (years < 3) {
    return { text: months > 0 ? `${years}岁${months}个月` : `${years}岁`, months: totalMonths };
  }
  return { text: `${years}岁`, months: totalMonths };
}

/**
 * 计算下次提醒时间
 * @param firstTime 首次提醒时间 "HH:MM"
 * @param intervalMinutes 间隔分钟
 * @param lastCompletedTime 上次完成时间
 * @returns ISO 8601 UTC
 */
export function calcNextRemindTime(
  firstTime: string,
  intervalMinutes: number,
  lastCompletedTime?: string,
): string {
  const now = new Date();
  let baseTime: Date;

  if (lastCompletedTime) {
    baseTime = new Date(lastCompletedTime);
  } else {
    // 使用今天的 firstTime 作为基准
    const [h, m] = firstTime.split(':').map(Number);
    // 构造北京时间再转 UTC
    baseTime = new Date(now);
    baseTime.setHours(h - CN_OFFSET, m, 0, 0);
    // 如果今天的时间已过，从现在开始算
    if (baseTime.getTime() < now.getTime()) {
      baseTime = now;
    }
  }

  const nextTime = new Date(baseTime.getTime() + intervalMinutes * 60 * 1000);
  return nextTime.toISOString();
}

/**
 * 检查时间是否在窗口内
 * @param time 要检查的时间
 * @param windowStart 窗口开始 "HH:MM"
 * @param windowEnd 窗口结束 "HH:MM"
 */
export function isWithinWindow(time: Date, windowStart: string, windowEnd: string): boolean {
  const currentMinutes = time.getHours() * 60 + time.getMinutes();
  const [startH, startM] = windowStart.split(':').map(Number);
  const [endH, endM] = windowEnd.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // 正常窗口: 如 08:00-22:00
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // 跨天窗口: 如 22:00-07:00
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

/**
 * 获取下一个窗口开始时间
 */
export function getNextWindowStart(windowStart: string): Date {
  const now = new Date();
  const [h, m] = windowStart.split(':').map(Number);
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  // 如果今天的时间已过，设为明天
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

/**
 * 获取最近 N 天的日期列表
 */
export function getRecentDates(days: number): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(formatDate(d));
  }
  return dates;
}
