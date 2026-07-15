/**
 * 全局常量定义
 */
import type { TaskType, TaskPriority, TemplateKey, SubscribeTemplate } from '@/types';

/** 事项类型配置 */
export const TASK_TYPE_CONFIG: Record<TaskType, {
  name: string;
  icon: string;
  uIcon: string;
  color: string;
  bgColor: string;
  defaultInterval: number;
  defaultPriority: TaskPriority;
  templateKey: TemplateKey | null;
}> = {
  feeding: {
    name: '喂养',
    icon: '🍼',
    uIcon: 'gift-fill',
    color: '#FF7B7B',
    bgColor: '#FFF0F0',
    defaultInterval: 180,
    defaultPriority: 'p1',
    templateKey: 'feeding',
  },
  diaper: {
    name: '换尿布',
    icon: '🧷',
    uIcon: 'tags-fill',
    color: '#378add',
    bgColor: '#E8F2FC',
    defaultInterval: 120,
    defaultPriority: 'p2',
    templateKey: 'care',
  },
  sleep: {
    name: '哄睡',
    icon: '🌙',
    uIcon: 'eye-fill',
    color: '#7f77dd',
    bgColor: '#F0EEFC',
    defaultInterval: 240,
    defaultPriority: 'p2',
    templateKey: 'care',
  },
  vitamin: {
    name: '维生素D',
    icon: '💊',
    uIcon: 'medal-fill',
    color: '#1d9e75',
    bgColor: '#E8F7F0',
    defaultInterval: 1440,
    defaultPriority: 'p0',
    templateKey: 'medicine',
  },
  medicine: {
    name: '用药',
    icon: '💉',
    uIcon: 'bookmark-fill',
    color: '#e24b4a',
    bgColor: '#FDEAEA',
    defaultInterval: 480,
    defaultPriority: 'p0',
    templateKey: 'medicine',
  },
  custom: {
    name: '自定义',
    icon: '📝',
    uIcon: 'edit-pen',
    color: '#ef9f27',
    bgColor: '#FEF5E7',
    defaultInterval: 240,
    defaultPriority: 'p1',
    templateKey: null,
  },
};

/** 优先级配置 */
export const PRIORITY_CONFIG: Record<TaskPriority, {
  name: string;
  color: string;
  bgColor: string;
  pushMethod: string;
}> = {
  p0: {
    name: '紧急',
    color: '#e24b4a',
    bgColor: '#FDEAEA',
    pushMethod: '订阅消息',
  },
  p1: {
    name: '重要',
    color: '#ef9f27',
    bgColor: '#FEF5E7',
    pushMethod: '订阅消息',
  },
  p2: {
    name: '普通',
    color: '#378add',
    bgColor: '#E8F2FC',
    pushMethod: '小程序内通知',
  },
};

/** 订阅消息模板 (实际 templateId 需在微信公众平台申请后替换) */
export const SUBSCRIBE_TEMPLATES: SubscribeTemplate[] = [
  {
    key: 'feeding',
    templateId: '', // 替换为实际模板ID
    title: '喂养提醒',
    applicableTypes: ['feeding'],
  },
  {
    key: 'care',
    templateId: '', // 替换为实际模板ID
    title: '护理提醒',
    applicableTypes: ['diaper', 'sleep'],
  },
  {
    key: 'medicine',
    templateId: '', // 替换为实际模板ID
    title: '用药提醒',
    applicableTypes: ['vitamin', 'medicine'],
  },
];

/** 配额有效期 (7天) */
export const QUOTA_EXPIRE_DAYS = 7;

/** 批量处理最大数量 */
export const BATCH_PROCESS_LIMIT = 50;

/** 云函数名称 */
export const CLOUD_FUNCTIONS = {
  BABY: 'api-baby',
  TASK: 'api-task',
  CONFIRM: 'api-confirm',
  STATS: 'api-stats',
  SUBSCRIBE: 'api-subscribe',
  CRON_SCAN: 'cron-scan',
  CRON_CLEANUP: 'cron-cleanup',
} as const;

/** 事项类型选项 (用于选择器) */
export const TASK_TYPE_OPTIONS = Object.entries(TASK_TYPE_CONFIG).map(([value, config]) => ({
  value: value as TaskType,
  label: config.name,
  icon: config.icon,
  uIcon: config.uIcon,
  color: config.color,
}));

/** 优先级选项 */
export const PRIORITY_OPTIONS = Object.entries(PRIORITY_CONFIG).map(([value, config]) => ({
  value: value as TaskPriority,
  label: config.name,
  color: config.color,
}));

/** 默认提醒窗口 */
export const DEFAULT_WINDOW = {
  start: '08:00',
  end: '22:00',
};

/** 默认免打扰时间 */
export const DEFAULT_QUIET_HOURS = {
  start: '22:00',
  end: '07:00',
};
