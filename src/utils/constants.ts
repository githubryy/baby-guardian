/**
 * 全局常量定义
 */
import type { TaskType, TaskPriority, TemplateKey, SubscribeTemplate, FamilyRelation } from '@/types';

/** 执行模式配置 */
export const TASK_MODE_CONFIG = {
  recurring: { name: '重复', color: '#FF7B7B', bgColor: '#FFF0F0' },
  once: { name: '单次', color: '#7B9EFF', bgColor: '#F0F4FF' },
} as const;

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
    templateId: 'cJTFLqrWfBPcHGmBsMiVp86CZ5Tf4Gl9oAHIWKtcLaQ', // 替换为实际模板ID
    title: '喂养提醒',
    applicableTypes: ['feeding'],
  },
  {
    key: 'care',
    templateId: 'WvNgDqkdCzyJuTeirnpFjNDX3oVYJ7wLmGuK8hJbVu4', // 替换为实际模板ID
    title: '护理提醒',
    applicableTypes: ['diaper', 'sleep'],
  },
  {
    key: 'medicine',
    templateId: 'Iqg9G1yjGeuWB4NZ9C6xbQa9hbvn_IRn8B2gezTcElw', // 替换为实际模板ID
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
  FAMILY: 'api-family',
  CRON_SCAN: 'cron-scan',
  CRON_CLEANUP: 'cron-cleanup',
} as const;

/** 家庭成员身份配置 */
export const FAMILY_RELATION_CONFIG: Record<FamilyRelation, {
  name: string;
  shortName: string;
  uIcon: string;
  color: string;
  bgColor: string;
}> = {
  father: {
    name: '宝爸',
    shortName: '爸',
    uIcon: 'man',
    color: '#378add',
    bgColor: '#E8F2FC',
  },
  mother: {
    name: '宝妈',
    shortName: '妈',
    uIcon: 'woman',
    color: '#FF7B7B',
    bgColor: '#FFF0F0',
  },
  grandfather: {
    name: '爷爷',
    shortName: '爷',
    uIcon: 'man',
    color: '#7f77dd',
    bgColor: '#F0EEFC',
  },
  grandmother: {
    name: '奶奶',
    shortName: '奶',
    uIcon: 'woman',
    color: '#9c27b0',
    bgColor: '#F3E5F5',
  },
  grandfather_in_law: {
    name: '外公',
    shortName: '公',
    uIcon: 'man',
    color: '#1d9e75',
    bgColor: '#E8F7F0',
  },
  grandmother_in_law: {
    name: '外婆',
    shortName: '婆',
    uIcon: 'woman',
    color: '#ef9f27',
    bgColor: '#FEF5E7',
  },
  nanny: {
    name: '育儿阿姨',
    shortName: '姨',
    uIcon: 'account-fill',
    color: '#00bcd4',
    bgColor: '#E0F7FA',
  },
  other: {
    name: '其他',
    shortName: '他',
    uIcon: 'account-fill',
    color: '#999',
    bgColor: '#F5F5F5',
  },
};

/** 家庭身份选项（用于选择器） */
export const FAMILY_RELATION_OPTIONS = Object.entries(FAMILY_RELATION_CONFIG).map(([value, config]) => ({
  value: value as FamilyRelation,
  label: config.name,
  uIcon: config.uIcon,
  color: config.color,
}));

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
