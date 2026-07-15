# 宝宝守护者 - 育儿提醒微信小程序

> 基于 Vue 3 + TypeScript + uni-app + uView UI 开发的微信小程序，帮助新手父母科学管理宝宝日常提醒事项（喂养、换尿布、哄睡、用药等），通过微信订阅消息实现精准推送。

## 技术栈

| 层级 | 技术选型 | 版本 | 说明 |
|------|---------|------|------|
| 前端框架 | Vue 3 + TypeScript | Vue 3.4 / TS 5.4 | 响应式开发，类型安全 |
| 跨端框架 | uni-app (Vue 3) | 3.0.0-4060 | 编译为微信小程序 |
| UI 组件库 | uView UI (uview-plus) | ^3.3.51 | 统一视觉风格，easycom 自动引入 |
| 状态管理 | Pinia | ^2.1.7 | 轻量级状态管理 |
| 后端服务 | 微信云开发 | - | 云函数 + 云数据库 |
| 推送方案 | 一次性订阅消息 + 配额管理 | - | 应对微信平台限制 |
| 构建工具 | Vite | ^5.2.8 | 快速 HMR + 构建 |

## 项目结构

```
baby-guardian/
├── src/                             # 前端源码
│   ├── pages/                       # 页面 (9 个)
│   │   ├── index/index.vue          # 首页 (时间线 + 概览 + FAB)
│   │   ├── baby/
│   │   │   ├── list.vue             # 宝宝列表
│   │   │   └── edit.vue             # 添加/编辑宝宝
│   │   ├── task/
│   │   │   ├── list.vue             # 事项列表
│   │   │   └── edit.vue             # 添加/编辑事项
│   │   ├── confirm/index.vue        # 确认页 (完成/延迟/忽略)
│   │   ├── stats/index.vue          # 统计页 (环形图 + 柱状图)
│   │   ├── history/index.vue        # 历史记录
│   │   └── settings/index.vue       # 设置页
│   ├── components/                  # 公共组件 (5 个)
│   │   ├── BabyCard.vue             # 宝宝卡片
│   │   ├── TaskItem.vue             # 事项条目
│   │   ├── TimelineItem.vue         # 时间线条目
│   │   ├── QuotaBadge.vue           # 配额徽章 (conic-gradient 进度环)
│   │   └── EmptyState.vue           # 空状态
│   ├── api/                         # API 接口层
│   │   ├── user.ts                  # 用户接口
│   │   ├── baby.ts                  # 宝宝接口
│   │   ├── task.ts                  # 事项接口
│   │   ├── confirm.ts              # 确认接口
│   │   └── stats.ts                # 统计接口
│   ├── stores/                      # Pinia 状态管理
│   │   ├── user.ts                  # 用户状态
│   │   ├── baby.ts                  # 宝宝状态
│   │   └── task.ts                  # 事项状态
│   ├── types/                       # TypeScript 类型定义
│   │   └── index.ts                 # 全部类型 (17 个接口/类型)
│   ├── utils/                       # 工具函数
│   │   ├── constants.ts             # 常量配置 (事项类型/优先级/模板)
│   │   ├── request.ts               # 云函数请求封装
│   │   ├── time.ts                  # 时间工具
│   │   └── subscribe.ts             # 订阅消息工具
│   ├── static/icons/                # tabBar 图标 (8 个 81x81px)
│   ├── App.vue                      # 根组件 (全局样式 + 动画)
│   ├── main.ts                      # 入口文件 (Pinia + uView 注册)
│   ├── manifest.json                # uni-app 配置
│   ├── pages.json                   # 页面路由 + easycom + tabBar
│   ├── uni.scss                     # 全局 SCSS 变量 + uView 主题覆盖
│   └── env.d.ts                     # 环境类型声明
├── cloudfunctions/                  # 云函数 (7 个)
│   ├── shared/utils.js              # 公共工具库
│   ├── api-baby/                    # 宝宝 CRUD
│   ├── api-task/                    # 事项 CRUD + 时间线
│   ├── api-confirm/                 # 确认操作 + 历史
│   ├── api-stats/                   # 统计查询
│   ├── api-subscribe/               # 登录 + 配额管理
│   ├── cron-scan/                   # 定时扫描推送 (每分钟)
│   └── cron-cleanup/                # 定时清理 (每小时)
├── package.json
├── tsconfig.json
├── vite.config.ts                   # Vite 配置 (Sass 选项)
└── project.config.json              # 微信开发者工具配置
```

## uView UI 集成

### 引入方式

项目使用 **easycom 自动引入**，无需手动 import uView 组件。在 `pages.json` 中配置：

```json
{
  "easycom": {
    "autoscan": true,
    "custom": {
      "^u--(.*)": "uview-plus/components/u-$1/u-$1.vue",
      "^up-(.*)": "uview-plus/components/u-$1/u-$1.vue",
      "^u-([^-].*)": "uview-plus/components/u-$1/u-$1.vue"
    }
  }
}
```

### 使用的 uView 组件

| 组件 | 用途 | 使用页面/组件 |
|------|------|-------------|
| `u-icon` | 所有图标展示 | 全部 14 个 Vue 文件 |
| `u-button` | 操作按钮 (保存/删除/添加) | task/edit, baby/edit, EmptyState |
| `u-tag` | 状态/优先级/计数标签 | TimelineItem, TaskItem, BabyCard, history, stats |
| `u-switch` | 开关切换 | TaskItem, settings, baby/edit |
| `u-input` | 文本输入 | task/edit, baby/edit |
| `u-textarea` | 多行文本输入 | baby/edit (备注) |

### 主题色覆盖

在 `uni.scss` 中覆盖 uView SCSS 变量为品牌色：

```scss
@import 'uview-plus/theme.scss';

$u-primary: #FF7B7B;          /* 品牌主色 */
$u-primary-light: #FFB3B3;
$u-primary-dark: #E55C5C;
$u-primary-disabled: #FFD0D0;
$u-primary-light-9: #FFF0F0;

$u-success: #1d9e75;
$u-warning: #ef9f27;
$u-error: #e24b4a;
$u-info: #378add;
```

### 图标映射

事项类型图标使用 uView UI 的 `u-icon`，映射定义在 `constants.ts` 中：

| 事项类型 | uIcon 名称 | 颜色 | 默认间隔 |
|---------|-----------|------|---------|
| 喂养 | `gift-fill` | #FF7B7B | 3 小时 |
| 换尿布 | `tags-fill` | #378ADD | 2 小时 |
| 哄睡 | `eye-fill` | #7F77DD | 4 小时 |
| 维生素D | `medal-fill` | #1D9E75 | 24 小时 |
| 用药 | `bookmark-fill` | #E24B4A | 8 小时 |
| 自定义 | `edit-pen` | #EF9F27 | 4 小时 |

## UI/UX 特性

| 特性 | 实现方式 |
|------|---------|
| 骨架屏 | `skeleton` CSS 类 + 渐变动画，首页/历史页加载时展示 |
| 入场动画 | `page-enter` + `slide-up-stagger` 逐项弹入 |
| Tap 反馈 | `.tap-feedback` / `.tap-shrink` 全局缩放类 |
| FAB 弹入 | 首页浮动添加按钮 spring 动画 |
| 进度环 | `conic-gradient` 实现配额徽章三档颜色 |
| 统计图表 | CSS 环形进度 + 柱状图渐变动画 |
| 表单 Loading | 保存按钮三点 loading 动画 |
| Toast 反馈 | 操作成功/失败即时提示 |

## tabBar 配置

底部导航栏 4 个页签，图标位于 `src/static/icons/`（81x81px PNG）：

| 页签 | 页面 | 图标 |
|------|------|------|
| 首页 | pages/index/index | home.png / home-active.png |
| 统计 | pages/stats/index | stats.png / stats-active.png |
| 记录 | pages/history/index | history.png / history-active.png |
| 我的 | pages/settings/index | settings.png / settings-active.png |

- 普通态颜色：`#999999`
- 选中态颜色：`#FF7B7B`

## 核心架构设计

### P0 问题解决方案

| 问题 | 方案 |
|------|------|
| 长期订阅不可用 | 一次性订阅消息 + 配额管理 (7天时效) |
| 定时触发器最小1分钟 | cron-scan 每分钟执行，分批处理50条 |
| 缺少配额表 | `subscription_quotas` 表追踪授权/消耗/过期 |

### P1 风险应对

| 风险 | 应对 |
|------|------|
| 配额7天时效 | 过期自动标记，首页显示可用次数 |
| 提醒窗口逻辑 | `delay_to_next_window` / `skip_and_continue` |
| 云函数超时 | 分批50条 + 乐观锁 + 20s超时 |
| 重试消耗配额 | 首次订阅消息，重试降级为红点通知 |

### P2 优化策略

| 优化 | 实现 |
|------|------|
| 批量订阅引导 | 关键节点同时请求3个模板授权 |
| 分层提醒 | P0/P1用订阅消息，P2用小程序内通知 |
| 时区处理 | UTC存储 + 云函数内北京时间转换 |

## 数据模型 (7 张表)

| 集合 | 用途 | 关键字段 |
|------|------|---------|
| `users` | 用户信息 + 设置 | openId, settings, familyId |
| `babies` | 宝宝信息 | userId, gender, birthday, isPremature |
| `reminder_tasks` | 提醒事项配置 | babyId, type, intervalMinutes, nextRemindTime, priority |
| `confirm_logs` | 确认操作记录 | taskId, action, completedTime |
| `subscription_quotas` | 订阅配额管理 | openId, templateId, status, expireAt |
| `notification_logs` | 推送日志 | taskId, sendStatus, retryRound |
| `families` | 家庭表 (v2预留) | ownerUserId, members |

## 快速开始

### 环境要求

- Node.js >= 18
- 微信开发者工具 (最新稳定版)
- 微信小程序账号 (需开通云开发)

### 1. 安装依赖

```bash
cd baby-guardian
npm install
```

### 2. 开发模式

```bash
npm run dev:mp-weixin
```

编译后的代码在 `dist/dev/mp-weixin/`，用微信开发者工具打开此目录。

### 3. 生产构建

```bash
npm run build:mp-weixin
```

构建产物在 `dist/build/mp-weixin/`。

### 4. 类型检查

```bash
npm run type-check
```

### 5. 云函数部署

1. 在 `cloudfunctions/api-subscribe/index.js` 中替换 `TEMPLATES` 为实际申请的模板ID
2. 在 `src/manifest.json` 中填写小程序 `appid`
3. 在 `src/App.vue` 中替换云环境 ID（搜索 `baby-guardian-prod`）
4. 使用微信开发者工具上传部署所有云函数
5. 在云开发控制台创建 7 个数据库集合并添加索引

### 6. 数据库索引

在云开发控制台为以下集合创建索引：

| 集合 | 索引字段 | 类型 |
|------|---------|------|
| reminder_tasks | nextRemindTime + enabled | 复合索引 |
| reminder_tasks | babyId | 单字段 |
| reminder_tasks | userId + enabled | 复合索引 |
| subscription_quotas | openId + status + expireAt | 复合索引 |
| confirm_logs | babyId + completedTime | 复合索引 |
| notification_logs | taskId + sendTime | 复合索引 |
| babies | userId | 单字段 |

### 7. 定时触发器配置

在微信开发者工具中为云函数添加定时触发器：

- `cron-scan`: `0 * * * * * *` (每分钟)
- `cron-cleanup`: `0 0 * * * * *` (每小时)

## Sass 配置说明

项目使用 Dart Sass，`vite.config.ts` 中配置了以下 Sass 选项：

```typescript
css: {
  preprocessorOptions: {
    scss: {
      quietDeps: true,                                    // 静默依赖库内部的 @import 警告
      silenceDeprecations: ['import', 'legacy-js-api'],   // 静默 uni.scss @import + 旧版 JS API 警告
    },
  },
}
```

> **说明**：uni-app 的 `uni.scss` 会被注入到每个组件的 `<style>` 前面，导致 SCSS `@use` 规则不在首行而编译报错，因此 `uni.scss` 中只能使用 `@import`。通过 `silenceDeprecations` 静默该弃用警告。

## 事项类型与优先级

### 优先级分层

| 优先级 | 名称 | 推送方式 | 颜色 |
|--------|------|---------|------|
| P0 | 紧急 | 订阅消息 | #E24B4A (红) |
| P1 | 重要 | 订阅消息 | #EF9F27 (橙) |
| P2 | 普通 | 小程序内通知 | #378ADD (蓝) |

### 订阅消息模板

需在微信公众平台申请 3 个一次性订阅消息模板：

| 模板标识 | 标题 | 适用事项 |
|---------|------|---------|
| feeding | 喂养提醒 | 喂养 |
| care | 护理提醒 | 换尿布、哄睡 |
| medicine | 用药提醒 | 维生素D、用药 |

## 注意事项

1. **订阅消息模板**: 需在微信公众平台申请 3 个一次性订阅消息模板，将模板 ID 填入 `src/utils/constants.ts` 的 `SUBSCRIBE_TEMPLATES`
2. **云环境**: 需在微信开发者工具中开通云开发，并将环境 ID 填入 `src/App.vue`
3. **类目选择**: 小程序类目建议选择"工具"或"生活服务"
4. **审核合规**: 模板内容需合规，不诱导用户点击
5. **uView 版本**: 项目使用 uview-plus ^3.3.51，实际安装版本可能更高，API 兼容
