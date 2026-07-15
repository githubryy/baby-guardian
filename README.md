# 宝宝守护者 - 育儿提醒微信小程序

> 基于 Vue 3 + TypeScript + uni-app + uView UI 开发的微信小程序，帮助新手父母科学管理宝宝日常提醒事项（喂养、换尿布、哄睡、用药等），通过微信订阅消息实现精准推送。**v2.0 支持家庭协作，多人同步照看宝宝。**

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
│   ├── pages/                       # 页面 (12 个)
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
│   │   ├── settings/index.vue       # 设置页
│   │   └── family/                  # 家庭协作 (v2.0)
│   │       ├── index.vue            # 家庭管理
│   │       ├── invite.vue           # 邀请家人
│   │       └── join.vue             # 加入家庭
│   ├── components/                  # 公共组件 (5 个)
│   │   ├── BabyCard.vue             # 宝宝卡片
│   │   ├── TaskItem.vue             # 事项条目
│   │   ├── TimelineItem.vue         # 时间线条目 (含操作人信息)
│   │   ├── QuotaBadge.vue           # 配额徽章 (conic-gradient 进度环)
│   │   └── EmptyState.vue           # 空状态
│   ├── api/                         # API 接口层
│   │   ├── user.ts                  # 用户接口
│   │   ├── baby.ts                  # 宝宝接口
│   │   ├── task.ts                  # 事项接口
│   │   ├── confirm.ts              # 确认接口
│   │   ├── stats.ts                # 统计接口
│   │   └── family.ts               # 家庭接口 (v2.0)
│   ├── stores/                      # Pinia 状态管理
│   │   ├── user.ts                  # 用户状态
│   │   ├── baby.ts                  # 宝宝状态
│   │   ├── task.ts                  # 事项状态
│   │   └── family.ts                # 家庭状态 (v2.0)
│   ├── types/                       # TypeScript 类型定义
│   │   └── index.ts                 # 全部类型 (含家庭协作类型)
│   ├── utils/                       # 工具函数
│   │   ├── constants.ts             # 常量配置 (事项类型/优先级/模板/家庭关系)
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
├── cloudfunctions/                  # 云函数 (8 个)
│   ├── shared/utils.js              # 公共工具库 (源文件，不部署)
│   ├── api-baby/                    # 宝宝 CRUD
│   ├── api-task/                    # 事项 CRUD + 时间线
│   ├── api-confirm/                 # 确认操作 + 历史
│   ├── api-stats/                   # 统计查询
│   ├── api-subscribe/               # 登录 + 配额管理
│   ├── api-family/                  # 家庭管理 (v2.0)
│   ├── cron-scan/                   # 定时扫描推送 (每分钟)
│   └── cron-cleanup/                # 定时清理 (每小时)
├── package.json
├── tsconfig.json
├── vite.config.ts                   # Vite 配置 (Sass 选项 + cloudfunctions 复制)
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

## 家庭协作功能（v2.0）

v2.0 新增家庭协作功能，支持多人同步照看一个宝宝。家庭成员通过邀请码加入，各自设置身份（爸爸妈妈、爷爷奶奶、外公外婆、育儿阿姨等），共享宝宝数据、提醒事项和操作记录。

### 功能概览

| 功能 | 说明 |
|------|------|
| 创建家庭 | 用户创建家庭后成为 owner，自动将已有宝宝和事项迁移到家庭 |
| 邀请家人 | 生成 6 位邀请码，通过微信分享小程序码邀请家人加入 |
| 加入家庭 | 输入邀请码，选择身份关系后加入家庭，数据自动迁移 |
| 成员管理 | 查看/编辑成员身份、移除成员、退出家庭（owner 不可退出） |
| 多人推送 | cron-scan 遍历家庭所有成员，向每个有配额的成员发送订阅消息 |
| 操作人追踪 | 每次确认操作记录操作人信息（昵称/头像/身份），时间线和历史记录中展示 |
| 身份标识 | 8 种家庭身份，每种身份有独立颜色和图标 |

### 家庭身份

| 身份标识 | 名称 | 简称 | 颜色 | uView 图标 |
|---------|------|------|------|-----------|
| `father` | 爸爸 | 爸 | #378ADD | `man` |
| `mother` | 妈妈 | 妈 | #FF7B7B | `woman` |
| `grandfather` | 爷爷 | 爷 | #7F77DD | `man` |
| `grandmother` | 奶奶 | 奶 | #9C27B0 | `woman` |
| `grandfather_in_law` | 外公 | 公 | #1D9E75 | `man` |
| `grandmother_in_law` | 外婆 | 婆 | #E24B4A | `woman` |
| `nanny` | 育儿阿姨 | 阿姨 | #EF9F27 | `account-fill` |
| `other` | 其他 | 其他 | #999999 | `account` |

### 家庭角色权限

| 角色 | 权限 |
|------|------|
| `owner` | 全部权限（创建者专属，不可被移除，不可退出） |
| `admin` | 编辑成员身份、管理事项 |
| `member` | 查看家庭数据、确认操作 |

### 数据架构变更

v2.0 通过 `familyId` 贯穿所有数据查询：

| 集合 | 变更 |
|------|------|
| `users` | 新增 `familyId`、`relation` 字段 |
| `babies` | 新增 `familyId`、`createdBy` 字段 |
| `reminder_tasks` | 新增 `familyId`、`assigneeId`、`lastCompletedBy/Name/Relation` |
| `confirm_logs` | 新增 `familyId`、`operatorId/Name/Avatar/Relation` |
| `families` | 新增 `inviteCode`、`settings`、`updatedAt`，members 增加 `relation`、`role` 改为三档 |

> **向后兼容**：未加入家庭的用户，`familyId` 默认 = `userId`，所有查询逻辑自动兼容 v1.0 单用户模式。

### 使用流程

1. **设置页** → 点击「家庭协作」→ 进入家庭管理页
2. **创建家庭** → 输入家庭名称 → 成为 owner，自动迁移宝宝和事项
3. **邀请家人** → 点击「邀请家人」→ 展示 6 位邀请码 → 微信分享小程序码
4. **家人加入** → 打开分享链接 → 输入邀请码 → 选择身份关系 → 加入成功
5. **日常使用** → 所有家庭成员共享宝宝/事项/时间线 → 每次操作记录操作人信息
6. **推送通知** → cron-scan 向家庭所有有配额的成员推送订阅消息

### 新增页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 家庭管理 | `pages/family/index` | 创建/加入家庭、成员列表、设置 |
| 邀请家人 | `pages/family/invite` | 邀请码展示、分享、刷新 |
| 加入家庭 | `pages/family/join` | 输入邀请码、选择身份 |

### api-family 云函数接口

| Action | 说明 |
|--------|------|
| `create` | 创建家庭，创建者成为 owner，迁移宝宝和事项 |
| `getMyFamily` | 获取当前用户的家庭信息 |
| `joinByCode` | 通过邀请码加入家庭 |
| `generateInviteCode` | 重新生成邀请码 |
| `updateMember` | 更新成员身份/角色 |
| `removeMember` | 移除成员 |
| `leaveFamily` | 退出家庭（owner 不可退出） |
| `updateSettings` | 更新家庭设置 |
| `getMembers` | 获取成员列表 |

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

## 数据库集合与索引

云开发数据库共需创建 **8 个集合**。在微信开发者工具 → 云开发控制台 → 数据库 → 点击 **+** 依次创建。

所有集合权限统一设为 **仅创建者可读写**（云函数通过管理端 SDK 操作，不受前端权限限制）。

---

### 1. `users` — 用户表

用户首次登录时自动创建，每个微信用户一条记录。

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 文档主键（自动生成） |
| `openId` | string | 微信 openId，用户唯一标识 |
| `unionId` | string | 微信 unionId（可选） |
| `nickName` | string | 昵称 |
| `avatarUrl` | string | 头像 URL |
| `settings` | object | 用户设置对象 |
| `settings.globalPushEnabled` | boolean | 全局推送开关，默认 `true` |
| `settings.quietHoursStart` | string | 免打扰开始时间，如 `"22:00"` |
| `settings.quietHoursEnd` | string | 免打扰结束时间，如 `"07:00"` |
| `familyId` | string | 家庭 ID（未加入家庭时默认 = 用户自身 ID） |
| `relation` | string | 家庭身份关系：`father`/`mother`/`grandfather`/`grandmother`/`grandfather_in_law`/`grandmother_in_law`/`nanny`/`other` |
| `createdAt` | string | 创建时间，ISO 8601 UTC |
| `updatedAt` | string | 更新时间，ISO 8601 UTC |

**索引：**

| 索引名 | 字段 | 类型 | 用途 |
|--------|------|------|------|
| `idx_openId` | `openId` | 单字段 | 通过 openId 查用户 |

---

### 2. `babies` — 宝宝表

一个用户可管理多个宝宝，每次添加宝宝时创建一条。

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 文档主键 |
| `userId` | string | 所属用户 ID（关联 `users._id`） |
| `familyId` | string | 家庭 ID（v2.0，默认 = userId） |
| `createdBy` | string | 创建者用户 ID（v2.0） |
| `name` | string | 宝宝昵称 |
| `avatarUrl` | string | 宝宝头像 URL（可选） |
| `gender` | string | `"male"` / `"female"` / `"unknown"` |
| `birthday` | string | 出生日期，ISO 8601 |
| `isPremature` | boolean | 是否早产儿 |
| `dueDate` | string | 预产期（早产儿用，可选） |
| `remark` | string | 备注（可选） |
| `isActive` | boolean | 是否当前选中的宝宝 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

**索引：**

| 索引名 | 字段 | 类型 | 用途 |
|--------|------|------|------|
| `idx_userId` | `userId` | 单字段 | 查某用户下所有宝宝 |

---

### 3. `reminder_tasks` — 提醒事项表（核心）

最核心的集合，每条记录代表一个周期性提醒事项（如"每 3 小时喂一次奶"）。`cron-scan` 每分钟扫描此表。

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 文档主键 |
| `babyId` | string | 关联宝宝 ID（关联 `babies._id`） |
| `userId` | string | 创建者用户 ID |
| `familyId` | string | 家庭 ID（v2.0，默认 = userId） |
| `type` | string | `"feeding"` / `"diaper"` / `"sleep"` / `"vitamin"` / `"medicine"` / `"custom"` |
| `customName` | string | 自定义名称（type=custom 时使用） |
| `enabled` | boolean | 是否启用 |
| `firstTime` | string | 首次提醒时间，如 `"08:00"` |
| `intervalMinutes` | number | 间隔分钟数，如 180 = 3 小时 |
| `nextRemindTime` | string | **下次提醒时间**，ISO 8601 UTC（cron-scan 按此字段扫描） |
| `lastCompletedTime` | string | 上次完成时间（可选） |
| `lastCompletedBy` | string | 上次完成者用户 ID（v2.0） |
| `lastCompletedByName` | string | 上次完成者昵称（v2.0） |
| `lastCompletedByRelation` | string | 上次完成者身份关系（v2.0） |
| `assigneeId` | string | 指定负责人 ID（v2.0，可选） |
| `reminderWindowStart` | string | 提醒窗口开始，如 `"08:00"` |
| `reminderWindowEnd` | string | 提醒窗口结束，如 `"22:00"` |
| `windowSkipStrategy` | string | `"delay_to_next_window"` / `"skip_and_continue"` |
| `retryCount` | number | 重试次数（>0 时降级为红点通知） |
| `processingLock` | boolean | 乐观锁，防止 cron 重复处理 |
| `lockedAt` | string | 锁定时间（可选） |
| `priority` | string | `"p0"` / `"p1"` / `"p2"`（决定推送策略） |
| `createdAt` | string | 创建时间 |

**索引（直接影响 cron-scan 性能，务必创建）：**

| 索引名 | 字段 | 类型 | 用途 |
|--------|------|------|------|
| `idx_nextRemindTime_enabled` | `nextRemindTime` + `enabled` | 复合索引 | cron 每分钟查询 `enabled=true && nextRemindTime <= now` |
| `idx_babyId` | `babyId` | 单字段 | 查某宝宝的所有事项 |
| `idx_userId_enabled` | `userId` + `enabled` | 复合索引 | 查某用户的启用事项 |

---

### 4. `confirm_logs` — 确认日志表

用户在确认页操作（完成/延迟/忽略）时写入一条记录。

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 文档主键 |
| `taskId` | string | 关联事项 ID（关联 `reminder_tasks._id`） |
| `babyId` | string | 关联宝宝 ID |
| `userId` | string | 关联用户 ID |
| `familyId` | string | 家庭 ID（v2.0） |
| `action` | string | `"completed"` / `"delayed"` / `"ignored"` |
| `completedTime` | string | 实际完成时间 |
| `delayMinutes` | number | 延迟分钟数（action=delayed 时） |
| `remark` | string | 备注（可选） |
| `operatorId` | string | 操作人用户 ID（v2.0） |
| `operatorName` | string | 操作人昵称（v2.0） |
| `operatorAvatar` | string | 操作人头像（v2.0） |
| `operatorRelation` | string | 操作人身份关系（v2.0） |
| `createdAt` | string | 创建时间 |

**索引：**

| 索引名 | 字段 | 类型 | 用途 |
|--------|------|------|------|
| `idx_babyId_completedTime` | `babyId` + `completedTime` | 复合索引 | 统计页查某宝宝的历史记录 |

---

### 5. `subscription_quotas` — 订阅配额表

微信一次性订阅消息每次用户授权 = 1 条配额，7 天有效。`cron-scan` 发推送前检查配额，发送后消耗配额。

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 文档主键 |
| `openId` | string | 用户 openId |
| `templateId` | string | 订阅消息模板 ID |
| `status` | string | `"available"` / `"consumed"` / `"expired"` |
| `authorizedAt` | string | 授权时间 |
| `expireAt` | string | 过期时间（授权后 7 天） |
| `consumedAt` | string | 消耗时间（可选） |
| `consumedByTaskId` | string | 消耗该配额的事项 ID（可选） |
| `notificationLogId` | string | 关联的推送日志 ID（可选） |

**索引：**

| 索引名 | 字段 | 类型 | 用途 |
|--------|------|------|------|
| `idx_openId_status_expireAt` | `openId` + `status` + `expireAt` | 复合索引 | cron-scan 查可用配额：`status=available && expireAt > now` |

---

### 6. `notification_logs` — 推送日志表

每次 `cron-scan` 发送订阅消息（或红点通知）都写一条日志。`cron-cleanup` 每天清理 30 天前的记录。

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 文档主键 |
| `taskId` | string | 关联事项 ID |
| `babyId` | string | 关联宝宝 ID |
| `openId` | string | 用户 openId |
| `templateId` | string | 使用的模板 ID |
| `quotaId` | string | 消耗的配额 ID（可选） |
| `sendStatus` | string | `"success"` / `"failed"` / `"quota_exhausted"` |
| `errorCode` | string | 错误码（可选） |
| `errorMessage` | string | 错误信息（可选） |
| `sendTime` | string | 发送时间 |
| `retryRound` | number | 重试轮次：0=首次，1=重试1，2=重试2 |

**索引：**

| 索引名 | 字段 | 类型 | 用途 |
|--------|------|------|------|
| `idx_taskId_sendTime` | `taskId` + `sendTime` | 复合索引 | 查某事项的推送历史 |

---

### 7. `families` — 家庭表（v2.0 家庭协作）

v2.0 核心集合，支持多人协作照看宝宝。用户创建/加入家庭后，所有数据按 `familyId` 关联查询。

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 文档主键 |
| `name` | string | 家庭名称 |
| `ownerUserId` | string | 创建者用户 ID |
| `inviteCode` | string | 6 位邀请码（大写字母+数字，排除易混淆字符） |
| `members` | array | 成员列表 |
| `members[].userId` | string | 成员用户 ID |
| `members[].role` | string | `"owner"` / `"admin"` / `"member"` |
| `members[].relation` | string | 身份关系：`father`/`mother`/`grandfather`/`grandmother`/`grandfather_in_law`/`grandmother_in_law`/`nanny`/`other` |
| `members[].nickName` | string | 加入时昵称快照 |
| `members[].avatarUrl` | string | 加入时头像快照 |
| `members[].joinedAt` | string | 加入时间 |
| `settings` | object | 家庭设置 |
| `settings.notifyOnMemberAction` | boolean | 成员操作时是否通知其他成员，默认 `false` |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

**索引：**

| 索引名 | 字段 | 类型 | 用途 |
|--------|------|------|------|
| `idx_inviteCode` | `inviteCode` | 单字段 | 通过邀请码加入家庭 |
| `idx_ownerUserId` | `ownerUserId` | 单字段 | 查询用户创建的家庭 |

---

### 索引创建汇总

为方便对照，所有索引汇总如下：

| 集合 | 索引名 | 索引字段 | 类型 |
|------|--------|---------|------|
| `users` | `idx_openId` | `openId` | 单字段 |
| `babies` | `idx_userId` | `userId` | 单字段 |
| `reminder_tasks` | `idx_nextRemindTime_enabled` | `nextRemindTime` + `enabled` | 复合 |
| `reminder_tasks` | `idx_babyId` | `babyId` | 单字段 |
| `reminder_tasks` | `idx_userId_enabled` | `userId` + `enabled` | 复合 |
| `reminder_tasks` | `idx_familyId_enabled` | `familyId` + `enabled` | 复合 |
| `confirm_logs` | `idx_babyId_completedTime` | `babyId` + `completedTime` | 复合 |
| `confirm_logs` | `idx_familyId_completedTime` | `familyId` + `completedTime` | 复合 |
| `subscription_quotas` | `idx_openId_status_expireAt` | `openId` + `status` + `expireAt` | 复合 |
| `notification_logs` | `idx_taskId_sendTime` | `taskId` + `sendTime` | 复合 |
| `families` | `idx_inviteCode` | `inviteCode` | 单字段 |
| `families` | `idx_ownerUserId` | `ownerUserId` | 单字段 |

> **创建方式**：云开发控制台 → 数据库 → 选中集合 → 索引管理 → 添加索引。复合索引需按上表顺序添加字段。

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

> **重要**: 编译时 Vite 插件会自动将 `cloudfunctions/` 复制到 `dist/dev/mp-weixin/cloudfunctions/`（或 `dist/build/mp-weixin/cloudfunctions/`），微信开发者工具导入编译输出目录后即可看到云函数文件夹。
>
> 每个云函数已内联 `utils.js`（公共工具库），可独立部署。`shared/` 目录仅为源文件参考，不会出现在编译输出中，也无需上传。

1. 在 `cloudfunctions/api-subscribe/index.js` 中替换 `TEMPLATES` 为实际申请的模板ID
2. 在 `src/manifest.json` 中填写小程序 `appid`（`mp-weixin.appid` 字段）
3. 在 `src/App.vue` 中替换云环境 ID（搜索 `cloudbase-d8g1n7nag24fc86c3`，替换为你自己的环境 ID）
4. 运行 `npm run dev:mp-weixin` 编译，确认 `dist/dev/mp-weixin/cloudfunctions/` 目录存在
5. 用微信开发者工具导入 `dist/dev/mp-weixin/` 目录
6. 在开发者工具左侧文件树中找到 `cloudfunctions/` 文件夹，右键**每个**云函数（共 8 个）→ **上传并部署：云端安装依赖**
7. 在云开发控制台创建 8 个数据库集合并添加索引（详见上方 [数据库集合与索引](#数据库集合与索引) 章节）

| 云函数 | 说明 |
|--------|------|
| api-baby | 宝宝管理 CRUD |
| api-task | 事项管理 CRUD |
| api-confirm | 确认记录 |
| api-stats | 统计数据 |
| api-subscribe | 订阅消息 |
| api-family | 家庭管理（创建/加入/邀请/成员管理） |
| cron-scan | 定时扫描提醒（每分钟） |
| cron-cleanup | 定时清理过期数据（每小时） |

### 6. 定时触发器配置

项目已在云函数目录中预置 `config.json` 触发器配置文件，**上传部署云函数时会自动创建触发器**，无需手动操作。

#### 预置的触发器配置

| 云函数 | 配置文件 | Cron 表达式 | 执行频率 | 说明 |
|--------|---------|------------|---------|------|
| `cron-scan` | `cloudfunctions/cron-scan/config.json` | `0 * * * * * *` | 每分钟 | 扫描到期事项，发送订阅消息 |
| `cron-cleanup` | `cloudfunctions/cron-cleanup/config.json` | `0 0 * * * * *` | 每小时 | 清理过期配额、解锁超时锁、删除旧日志 |

#### Cron 表达式格式

微信云开发使用 **7 字段** Cron 表达式（比标准 Cron 多一个年字段）：

```
秒  分  时  日  月  周  年
0   *   *   *   *   *   *     ← 每分钟第 0 秒执行
0   0   *   *   *   *   *     ← 每小时第 0 分 0 秒执行
```

| 字段 | 取值范围 | 说明 |
|------|---------|------|
| 秒 | 0-59 | 第几秒执行 |
| 分 | 0-59 | 第几分执行 |
| 时 | 0-23 | 第几时执行 |
| 日 | 1-31 | 几号执行 |
| 月 | 1-12 | 几月执行 |
| 周 | 0-6 | 周几（0=周日） |
| 年 | 留空 | 不填表示每年 |

> `*` 表示任意值，`0` 表示固定值。`0 * * * * * *` = 每分钟的第 0 秒触发。

#### 配置文件内容

`cron-scan/config.json`：
```json
{
  "triggers": [
    {
      "name": "scanEveryMinute",
      "type": "timer",
      "config": "0 * * * * * *"
    }
  ]
}
```

`cron-cleanup/config.json`：
```json
{
  "triggers": [
    {
      "name": "cleanupEveryHour",
      "type": "timer",
      "config": "0 0 * * * * *"
    }
  ]
}
```

#### 操作步骤

触发器会在上传部署云函数时自动创建，无需额外操作：

1. 确保已完成第 5 步的云函数上传部署
2. 右键 `cron-scan` → **上传并部署：云端安装依赖** → 触发器自动创建
3. 右键 `cron-cleanup` → **上传并部署：云端安装依赖** → 触发器自动创建
4. 验证：打开**云开发控制台** → **云函数** → 选中 `cron-scan` → **触发器** tab，可以看到已创建的定时触发器

#### 手动管理触发器（可选）

如果需要修改触发频率或手动管理：

| 操作 | 方法 |
|------|------|
| 修改触发频率 | 编辑 `config.json` 中的 `config` 字段 → 重新上传部署该云函数 |
| 查看触发器 | 云开发控制台 → 云函数 → 选中函数 → 触发器 tab |
| 手动测试 | 云开发控制台 → 云函数 → 选中函数 → 点击「测试」→ 传入空 `{}` 即可手动触发 |
| 删除触发器 | 云开发控制台 → 云函数 → 触发器 tab → 删除对应触发器 |

> **注意**：触发器创建后立即生效。`cron-scan` 部署后每分钟都会执行，可在云函数日志中查看执行记录。如果数据库尚未准备好，建议先完成数据库集合创建再部署 `cron-scan`。

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
