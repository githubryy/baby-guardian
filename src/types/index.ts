/**
 * 宝宝守护者 - 核心类型定义
 * 基于技术方案评审报告 v1.0 数据模型
 */

// ==================== 用户相关 ====================

/** 用户设置 */
export interface UserSettings {
  /** 全局推送开关 */
  globalPushEnabled: boolean;
  /** 免打扰开始时间 (如 "22:00") */
  quietHoursStart: string;
  /** 免打扰结束时间 (如 "07:00") */
  quietHoursEnd: string;
}

/** 用户表 */
export interface User {
  _id: string;
  openId: string;
  unionId?: string;
  nickName: string;
  avatarUrl: string;
  settings: UserSettings;
  /** 家庭ID (v1.0 默认=自身用户ID) */
  familyId: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== 宝宝相关 ====================

/** 性别 */
export type BabyGender = 'male' | 'female' | 'unknown';

/** 宝宝表 */
export interface Baby {
  _id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  gender: BabyGender;
  /** 出生日期 ISO 8601 */
  birthday: string;
  /** 早产儿标记 */
  isPremature: boolean;
  /** 预产期 (早产儿用) */
  dueDate?: string;
  /** 备注 */
  remark?: string;
  /** 是否当前选中 */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==================== 提醒事项 ====================

/** 事项类型 */
export type TaskType = 'feeding' | 'diaper' | 'sleep' | 'vitamin' | 'medicine' | 'custom';

/** 优先级 (P2 分层提醒策略) */
export type TaskPriority = 'p0' | 'p1' | 'p2';

/** 窗口跳过策略 */
export type WindowSkipStrategy = 'delay_to_next_window' | 'skip_and_continue';

/** 提醒事项表 */
export interface ReminderTask {
  _id: string;
  babyId: string;
  userId: string;
  type: TaskType;
  /** 自定义名称 (type=custom 时使用) */
  customName?: string;
  enabled: boolean;
  /** 首次提醒时间 (如 "08:00") */
  firstTime: string;
  /** 间隔分钟数 */
  intervalMinutes: number;
  /** 下次提醒时间 ISO 8601 UTC */
  nextRemindTime: string;
  /** 上次完成时间 */
  lastCompletedTime?: string;
  /** 提醒窗口开始 (如 "08:00") */
  reminderWindowStart: string;
  /** 提醒窗口结束 (如 "22:00") */
  reminderWindowEnd: string;
  /** 窗口跳过策略 */
  windowSkipStrategy: WindowSkipStrategy;
  /** 重试次数 */
  retryCount: number;
  /** 乐观锁 */
  processingLock: boolean;
  /** 锁定时间 */
  lockedAt?: string | null;
  /** 优先级 */
  priority: TaskPriority;
  createdAt: string;
}

// ==================== 确认记录 ====================

/** 确认操作类型 */
export type ConfirmAction = 'completed' | 'delayed' | 'ignored';

/** 确认日志表 */
export interface ConfirmLog {
  _id: string;
  taskId: string;
  babyId: string;
  userId: string;
  action: ConfirmAction;
  /** 实际完成时间 */
  completedTime: string;
  /** 延迟分钟数 (action=delayed 时) */
  delayMinutes?: number;
  /** 备注 */
  remark?: string;
  createdAt: string;
}

// ==================== 订阅配额 ====================

/** 配额状态 */
export type QuotaStatus = 'available' | 'consumed' | 'expired';

/** 订阅配额表 */
export interface SubscriptionQuota {
  _id: string;
  openId: string;
  /** 订阅消息模板ID */
  templateId: string;
  status: QuotaStatus;
  /** 授权时间 */
  authorizedAt: string;
  /** 过期时间 (7天) */
  expireAt: string;
  /** 消耗时间 */
  consumedAt?: string | null;
  /** 消耗该配额的事项ID */
  consumedByTaskId?: string | null;
  /** 关联推送日志ID */
  notificationLogId?: string | null;
}

// ==================== 推送日志 ====================

/** 发送状态 */
export type SendStatus = 'success' | 'failed' | 'quota_exhausted';

/** 推送日志表 */
export interface NotificationLog {
  _id: string;
  taskId: string;
  babyId: string;
  openId: string;
  templateId: string;
  quotaId?: string;
  sendStatus: SendStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  sendTime: string;
  /** 0=首次, 1=重试1, 2=重试2 */
  retryRound: number;
}

// ==================== 家庭表 (预留) ====================

export type FamilyRole = 'owner' | 'member';

export interface FamilyMember {
  userId: string;
  role: FamilyRole;
  joinedAt: string;
}

export interface Family {
  _id: string;
  name: string;
  ownerUserId: string;
  members: FamilyMember[];
  createdAt: string;
}

// ==================== 订阅消息模板 ====================

/** 模板标识 */
export type TemplateKey = 'feeding' | 'care' | 'medicine';

/** 订阅消息模板配置 */
export interface SubscribeTemplate {
  key: TemplateKey;
  templateId: string;
  title: string;
  /** 适用事项类型 */
  applicableTypes: TaskType[];
}

// ==================== 统计相关 ====================

/** 单日统计 */
export interface DailyStat {
  date: string;
  totalReminders: number;
  completedCount: number;
  delayedCount: number;
  ignoredCount: number;
  /** 完成率 */
  completionRate: number;
}

/** 事项类型统计 */
export interface TypeStat {
  type: TaskType;
  typeName: string;
  count: number;
  percentage: number;
}

/** 统计汇总 */
export interface StatsSummary {
  totalBabies: number;
  totalTasks: number;
  activeTasks: number;
  todayReminders: number;
  todayCompleted: number;
  todayCompletionRate: number;
  weeklyStats: DailyStat[];
  typeStats: TypeStat[];
}

// ==================== 首页时间线 ====================

/** 时间线条目 */
export interface TimelineItem {
  taskId: string;
  babyId: string;
  babyName: string;
  babyAvatar?: string;
  type: TaskType;
  customName?: string;
  typeName: string;
  typeIcon: string;
  typeColor: string;
  remindTime: string;
  /** 距上次时长描述 */
  lastDurationText?: string;
  /** 状态: pending=待处理, completed=已完成, delayed=已延迟, overdue=已超时 */
  status: 'pending' | 'completed' | 'delayed' | 'overdue';
  priority: TaskPriority;
}

// ==================== API 通用类型 ====================

/** 分页参数 */
export interface PageParams {
  page: number;
  pageSize: number;
}

/** 分页结果 */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** 云函数调用结果 */
export interface CloudResult<T = any> {
  code: number;
  message: string;
  data: T;
}

/** 配额汇总 */
export interface QuotaSummary {
  total: number;
  available: number;
  consumed: number;
  expired: number;
  byTemplate: Record<TemplateKey, number>;
}
