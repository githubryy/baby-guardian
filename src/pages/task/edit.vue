<template>
  <view class="page-task-edit">
    <view class="form-card">
      <!-- 事项类型 -->
      <view class="form-item">
        <text class="form-label">事项类型</text>
        <view class="type-grid">
          <view v-for="opt in TASK_TYPE_OPTIONS" :key="opt.value" class="type-option"
            :class="{ active: form.type === opt.value, disabled: isTypeDisabled(opt.value) }"
            :style="form.type === opt.value ? { borderColor: opt.color, background: opt.color + '10' } : {}"
            @tap="onSelectType(opt.value)">
            <view class="type-icon-box" :style="{ background: opt.color + '15' }">
              <u-icon :name="opt.icon" :size="16" :color="isTypeDisabled(opt.value) ? '#ccc' : opt.color" />
            </view>
            <text class="type-name"
              :style="{ color: isTypeDisabled(opt.value) ? '#ccc' : (form.type === opt.value ? opt.color : '#666') }">
              {{ opt.label }}
            </text>
            <text v-if="isTypeDisabled(opt.value)" class="type-exists-tag">已存在</text>
          </view>
        </view>
        <view class="form-hint-row">
          <u-icon name="info-circle" :size="13" color="#aaa" />
          <text class="form-hint">已有提醒的类型不可重复添加</text>
        </view>
      </view>

      <!-- 自定义名称 -->
      <view v-if="form.type === 'custom'" class="form-item">
        <text class="form-label">事项名称</text>
        <u-input v-model="form.customName" placeholder="如：抚触按摩、排气操" border="surround" :customStyle="{ height: '80rpx' }"
          maxlength="20" />
      </view>

      <!-- 优先级 -->
      <view class="form-item">
        <text class="form-label">优先级</text>
        <view class="priority-row">
          <view v-for="opt in PRIORITY_OPTIONS" :key="opt.value" class="priority-option"
            :class="{ active: form.priority === opt.value }"
            :style="form.priority === opt.value ? { borderColor: opt.color, color: opt.color, background: opt.color + '0A' } : {}"
            @tap="form.priority = opt.value">
            <text>{{ opt.label }}</text>
          </view>
        </view>
        <view class="form-hint-row">
          <u-icon name="info-circle" :size="13" color="#aaa" />
          <text class="form-hint">{{ priorityHint }}</text>
        </view>
      </view>

      <!-- 事件模式 -->
      <view class="form-item">
        <text class="form-label">事件模式</text>
        <view class="mode-row">
          <view class="mode-option" :class="{ active: form.taskMode === 'once' }" @tap="form.taskMode = 'once'">
            <view class="mode-radio" :class="{ checked: form.taskMode === 'once' }">
              <view v-if="form.taskMode === 'once'" class="mode-radio-dot" />
            </view>
            <view class="mode-content">
              <text class="mode-name">一次性事件</text>
              <text class="mode-desc">完成后即结束</text>
            </view>
          </view>
          <view class="mode-option" :class="{ active: form.taskMode === 'recurring' }"
            @tap="form.taskMode = 'recurring'">
            <view class="mode-radio" :class="{ checked: form.taskMode === 'recurring' }">
              <view v-if="form.taskMode === 'recurring'" class="mode-radio-dot" />
            </view>
            <view class="mode-content">
              <text class="mode-name">循环执行事件</text>
              <text class="mode-desc">按间隔不断生成提醒</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 循环配置 -->
      <view v-if="form.taskMode === 'recurring'" class="form-item">
        <text class="form-label">循环次数</text>
        <view class="repeat-row">
          <view class="repeat-option" :class="{ active: isInfiniteLoop }" @tap="form.repeatCount = -1">
            <text>无限循环</text>
          </view>
          <view class="repeat-option" :class="{ active: !isInfiniteLoop }"
            @tap="form.repeatCount = form.repeatCount <= 0 ? 3 : form.repeatCount">
            <text>指定次数</text>
          </view>
        </view>
        <view v-if="!isInfiniteLoop" class="repeat-input-row">
          <text class="repeat-label">执行</text>
          <u-input v-model="repeatCountStr" type="number" placeholder="次数" border="surround"
            :customStyle="{ width: '160rpx', textAlign: 'center' }" />
          <text class="repeat-label">次后完成</text>
        </view>
      </view>

      <!-- 首次提醒时间 -->
      <view class="form-item">
        <text class="form-label">首次提醒时间</text>
        <picker mode="time" :value="form.firstTime" @change="form.firstTime = $event.detail.value">
          <view class="form-picker">
            <view class="picker-left">
              <u-icon name="clock" :size="16" color="#FF7B7B" />
              <text>{{ form.firstTime }}</text>
            </view>
            <u-icon name="arrow-right" :size="14" color="#ccc" />
          </view>
        </picker>
      </view>

      <!-- 间隔 -->
      <view class="form-item">
        <text class="form-label">提醒间隔</text>
        <view class="interval-presets">
          <view v-for="preset in intervalPresets" :key="preset.value" class="preset-option"
            :class="{ active: form.intervalMinutes === preset.value }" @tap="form.intervalMinutes = preset.value">
            <text>{{ preset.label }}</text>
          </view>
        </view>
        <view class="custom-interval">
          <text class="interval-label">自定义</text>
          <u-input v-model="customIntervalStr" type="number" placeholder="分钟" border="surround"
            :customStyle="{ flex: '1', textAlign: 'center' }" @confirm="applyCustomInterval" />
          <text class="interval-unit">分钟</text>
          <u-button class="custom-style" text="应用" size="mini" type="error" @click="applyCustomInterval" />
        </view>
      </view>

      <!-- 提醒窗口 -->
      <view class="form-item">
        <text class="form-label">提醒窗口</text>
        <view class="window-row">
          <picker mode="time" :value="form.reminderWindowStart"
            @change="form.reminderWindowStart = $event.detail.value">
            <view class="window-picker">
              <text>{{ form.reminderWindowStart }}</text>
            </view>
          </picker>
          <text class="window-separator">至</text>
          <picker mode="time" :value="form.reminderWindowEnd" @change="form.reminderWindowEnd = $event.detail.value">
            <view class="window-picker">
              <text>{{ form.reminderWindowEnd }}</text>
            </view>
          </picker>
        </view>
        <view class="form-hint-row">
          <u-icon name="info-circle" :size="13" color="#aaa" />
          <text class="form-hint">非提醒窗口内的事项将推迟到下一个窗口开始</text>
        </view>
      </view>

      <!-- 窗口策略 -->
      <view class="form-item">
        <text class="form-label">窗口外处理策略</text>
        <view class="strategy-row">
          <view class="strategy-option" :class="{ active: form.windowSkipStrategy === 'delay_to_next_window' }"
            @tap="form.windowSkipStrategy = 'delay_to_next_window'">
            <u-icon v-if="form.windowSkipStrategy === 'delay_to_next_window'" name="checkmark-circle-fill" :size="16"
              color="#FF7B7B" />
            <u-icon v-else name="checkmark-circle" :size="16" color="#ccc" />
            <text>推迟到下个窗口</text>
          </view>
          <view class="strategy-option" :class="{ active: form.windowSkipStrategy === 'skip_and_continue' }"
            @tap="form.windowSkipStrategy = 'skip_and_continue'">
            <u-icon v-if="form.windowSkipStrategy === 'skip_and_continue'" name="checkmark-circle-fill" :size="16"
              color="#FF7B7B" />
            <u-icon v-else name="checkmark-circle" :size="16" color="#ccc" />
            <text>跳过并继续</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-area">
      <u-button :text="isEdit ? '保存修改' : '添加事项'" type="error" shape="circle" :loading="saving" :disabled="saving"
        :customStyle="{ height: '88rpx', fontSize: '32rpx', fontWeight: '600', marginBottom: '16rpx', background: saving ? '' : 'linear-gradient(135deg, #FF7B7B, #FF6464)', boxShadow: saving ? 'none' : '0 8rpx 24rpx rgba(255, 123, 123, 0.35)' }"
        @click="onSave" />
      <u-button v-if="isEdit" text="删除事项" shape="circle" plain type="error"
        :customStyle="{ height: '88rpx', fontSize: '30rpx', background: '#FDEAEA' }" @click="onDelete" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useTaskStore } from '@/stores/task';
import { useBabyStore } from '@/stores/baby';
import { getTaskDetail } from '@/api/task';
import { TASK_TYPE_OPTIONS, PRIORITY_OPTIONS, TASK_TYPE_CONFIG, DEFAULT_WINDOW } from '@/utils/constants';
import { guideBatchAuthorization } from '@/utils/subscribe';
import type { TaskType, TaskPriority, WindowSkipStrategy, TaskMode } from '@/types';

const taskStore = useTaskStore();
const babyStore = useBabyStore();

const isEdit = ref(false);
const editId = ref('');
const customIntervalStr = ref('');
const saving = ref(false);

const form = ref({
  type: 'feeding' as TaskType,
  customName: '',
  firstTime: '08:00',
  intervalMinutes: 180,
  reminderWindowStart: DEFAULT_WINDOW.start,
  reminderWindowEnd: DEFAULT_WINDOW.end,
  windowSkipStrategy: 'delay_to_next_window' as WindowSkipStrategy,
  priority: 'p1' as TaskPriority,
  taskMode: 'once' as TaskMode,
  repeatCount: -1,
});

const intervalPresets = [
  { label: '1小时', value: 60 },
  { label: '2小时', value: 120 },
  { label: '3小时', value: 180 },
  { label: '4小时', value: 240 },
  { label: '6小时', value: 360 },
  { label: '8小时', value: 480 },
  { label: '每天', value: 1440 },
];

const priorityHint = computed(() => {
  if (form.value.priority === 'p0') return '紧急事项，使用订阅消息推送';
  if (form.value.priority === 'p1') return '重要事项，使用订阅消息推送';
  return '普通事项，使用小程序内通知（不消耗配额）';
});

// 阻止选择的类型集合（只有已完成和已结束的事件才可以重复选择）
const activeTaskTypes = computed(() => {
  if (isEdit.value) return new Set<TaskType>(); // 编辑模式下不限制
  const babyId = babyStore.currentBabyId;
  return new Set(
    taskStore.timeline
      .filter((t) => t.babyId === babyId && t.status !== 'completed' && t.status !== 'stopped')
      .map((t) => t.type)
  );
});

function isTypeDisabled(type: TaskType): boolean {
  if (isEdit.value) return true; // 编辑模式全部禁用
  return activeTaskTypes.value.has(type);
}

// 是否无限循环
const isInfiniteLoop = computed(() => form.value.repeatCount === -1);

// 循环次数显示字符串
const repeatCountStr = computed({
  get: () => {
    if (form.value.repeatCount <= 0) return '';
    return String(form.value.repeatCount);
  },
  set: (val: string) => {
    const n = Number(val);
    if (n > 0) {
      form.value.repeatCount = Math.min(n, 999);
    }
  },
});

watch(() => form.value.type, (newType) => {
  const config = TASK_TYPE_CONFIG[newType];
  if (config && !isEdit.value) {
    form.value.intervalMinutes = config.defaultInterval;
    form.value.priority = config.defaultPriority;
  }
});

// 默认值与禁用联动：如果默认类型被禁用，自动切换到第一个可选类型
watch(activeTaskTypes, (disabledTypes) => {
  if (isEdit.value) return;
  if (!disabledTypes.has(form.value.type)) return;
  const available = TASK_TYPE_OPTIONS.find((opt) => !disabledTypes.has(opt.value));
  if (available) {
    form.value.type = available.value;
  }
}, { immediate: true });

onLoad((options) => {
  // options 为空表示"添加事项"模式，有 id 表示"编辑事项"模式
  if (options?.id) {
    isEdit.value = true;
    editId.value = options.id;
    loadTaskDetail();
  }
});

async function loadTaskDetail() {
  // 先从本地 store 查找，找不到则从服务端拉取
  let task = taskStore.taskList.find((t) => t._id === editId.value);
  if (!task) {
    try {
      task = await getTaskDetail(editId.value);
    } catch {
      uni.showToast({ title: '加载事项失败', icon: 'none' });
      return;
    }
  }
  if (task) {
    form.value = {
      type: task.type,
      customName: task.customName || '',
      firstTime: task.firstTime,
      intervalMinutes: task.intervalMinutes,
      reminderWindowStart: task.reminderWindowStart,
      reminderWindowEnd: task.reminderWindowEnd,
      windowSkipStrategy: task.windowSkipStrategy,
      priority: task.priority,
      taskMode: task.taskMode || 'once',
      repeatCount: task.repeatCount ?? -1,
    };
    !intervalPresets.some((p) => p.value === task.intervalMinutes) && (customIntervalStr.value = String(task.intervalMinutes))
    uni.setNavigationBarTitle({ title: '编辑事项' });
  }
}

function onSelectType(type: TaskType) {
  if (isEdit.value) return;
  if (isTypeDisabled(type)) {
    uni.showToast({ title: '该类型已有活跃提醒，不可重复添加', icon: 'none' });
    return;
  }
  form.value.type = type;
}

function applyCustomInterval() {
  const val = Number(customIntervalStr.value);
  if (val && val > 0) {
    form.value.intervalMinutes = val;
    uni.showToast({ title: '已设置', icon: 'none' });
  }
}

async function onSave() {
  if (saving.value) return;
  if (form.value.type === 'custom' && !form.value.customName.trim()) {
    uni.showToast({ title: '请输入事项名称', icon: 'none' });
    return;
  }
  if (!babyStore.currentBaby) {
    uni.showToast({ title: '请先添加宝宝', icon: 'none' });
    return;
  }

  saving.value = true;
  try {
    const data = {
      babyId: babyStore.currentBabyId,
      type: form.value.type,
      typeName: TASK_TYPE_CONFIG[form.value.type].name,
      customName: form.value.type === 'custom' ? form.value.customName.trim() : undefined,
      firstTime: form.value.firstTime,
      intervalMinutes: form.value.intervalMinutes,
      reminderWindowStart: form.value.reminderWindowStart,
      reminderWindowEnd: form.value.reminderWindowEnd,
      windowSkipStrategy: form.value.windowSkipStrategy,
      priority: form.value.priority,
      taskMode: form.value.taskMode,
      repeatCount: form.value.taskMode === 'recurring' ? form.value.repeatCount : -1,
    };

    if (isEdit.value) {
      const ok = await taskStore.updateTask(editId.value, data);
      if (ok) {
        uni.showToast({ title: '已保存', icon: 'success' });
        setTimeout(() => uni.navigateBack(), 600);
      }
    } else {
      // 在 tap 上下文中先发起订阅授权，避免 await 后丢失手势上下文
      const accepted = await guideBatchAuthorization('添加事项后', data.type);
      // 用户取消授权，不执行后续操作
      if (accepted === 0) return
      const ok = await taskStore.addTask(data);
      if (ok) {
        setTimeout(() => uni.navigateBack(), 600);
      }
    }
  } finally {
    saving.value = false;
  }
}

async function onDelete() {
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除此提醒事项吗？',
      confirmColor: '#FF7B7B',
      success: (res) => resolve(!!res.confirm),
    });
  });
  if (!confirmed) return;

  const ok = await taskStore.deleteTask(editId.value);
  if (ok) uni.navigateBack();
}
</script>

<style lang="scss" scoped>
.page-task-edit {
  min-height: 100vh;
  background: #f8f8f8;
  padding: 24rpx;
  padding-bottom: 200rpx;
}

.form-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.form-item {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }

  .form-label {
    display: block;
    font-size: 28rpx;
    color: #333;
    margin-bottom: 16rpx;
    font-weight: 500;
  }

  .form-hint-row {
    display: flex;
    align-items: center;
    gap: 6rpx;
    margin-top: 8rpx;

    .form-hint {
      font-size: 22rpx;
      color: #aaa;
    }
  }

  .form-picker {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 80rpx;

    .picker-left {
      display: flex;
      align-items: center;
      gap: 8rpx;
      font-size: 30rpx;
      color: #2d2d2d;
    }
  }
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;

  .type-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
    padding: 24rpx 16rpx;
    background: #f5f5f5;
    border-radius: 16rpx;
    border: 2rpx solid transparent;

    .type-icon-box {
      width: 56rpx;
      height: 56rpx;
      border-radius: 14rpx;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .type-name {
      font-size: 24rpx;
      color: #666;
    }

    &.disabled {
      opacity: 0.45;
      pointer-events: none;
    }
  }

  .type-exists-tag {
    font-size: 18rpx;
    color: #ccc;
    background: #f0f0f0;
    padding: 2rpx 10rpx;
    border-radius: 6rpx;
    margin-top: 2rpx;
  }
}

.priority-row {
  display: flex;
  gap: 16rpx;

  .priority-option {
    flex: 1;
    text-align: center;
    padding: 16rpx 0;
    background: #f5f5f5;
    border-radius: 12rpx;
    border: 2rpx solid transparent;
    font-size: 28rpx;
    color: #666;

    &.active {
      font-weight: 600;
    }
  }
}

// 事件模式
.mode-row {
  display: flex;
  gap: 16rpx;

  .mode-option {
    flex: 1;
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    padding: 24rpx;
    background: #f5f5f5;
    border-radius: 16rpx;
    border: 2rpx solid transparent;
    transition: all 0.2s ease;

    &.active {
      background: #fff0f0;
      border-color: #ff7b7b;
    }

    .mode-radio {
      width: 40rpx;
      height: 40rpx;
      border-radius: 50%;
      border: 2rpx solid #ccc;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2rpx;

      &.checked {
        border-color: #ff7b7b;
      }

      .mode-radio-dot {
        width: 22rpx;
        height: 22rpx;
        border-radius: 50%;
        background: #ff7b7b;
      }
    }

    .mode-content {
      display: flex;
      flex-direction: column;

      .mode-name {
        font-size: 28rpx;
        color: #2d2d2d;
        font-weight: 500;
      }

      .mode-desc {
        font-size: 22rpx;
        color: #999;
        margin-top: 4rpx;
      }
    }
  }
}

// 循环次数
.repeat-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;

  .repeat-option {
    flex: 1;
    text-align: center;
    padding: 16rpx 0;
    background: #f5f5f5;
    border-radius: 12rpx;
    border: 2rpx solid transparent;
    font-size: 28rpx;
    color: #666;

    &.active {
      background: #fff0f0;
      border-color: #ff7b7b;
      color: #ff7b7b;
      font-weight: 600;
    }
  }
}

.repeat-input-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;

  .repeat-label {
    font-size: 26rpx;
    color: #666;
    white-space: nowrap;
  }
}

.interval-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 16rpx;

  .preset-option {
    padding: 12rpx 28rpx;
    background: #f5f5f5;
    border-radius: 999rpx;
    font-size: 26rpx;
    color: #666;

    &.active {
      background: #ff7b7b;
      color: #fff;
    }
  }
}

.custom-interval {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 2fr;
  align-items: center;
  gap: 15px;
  background: #f9f9f9;
  border-radius: 12rpx;

  .interval-label {
    font-size: 26rpx;
    color: #999;
  }

  .interval-unit {
    font-size: 24rpx;
    color: #999;
  }
}

.window-row {
  display: flex;
  align-items: center;
  gap: 16rpx;

  .window-picker {
    flex: 1;
    text-align: center;
    padding: 16rpx;
    background: #f5f5f5;
    border-radius: 12rpx;
    font-size: 30rpx;
  }

  .window-separator {
    font-size: 26rpx;
    color: #999;
  }
}

.strategy-row {
  display: flex;
  gap: 16rpx;

  .strategy-option {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    padding: 16rpx;
    background: #f5f5f5;
    border-radius: 12rpx;
    border: 2rpx solid transparent;
    font-size: 26rpx;
    color: #666;

    &.active {
      background: #fff0f0;
      border-color: #ff7b7b;
      color: #ff7b7b;
      font-weight: 600;
    }
  }
}

.action-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.04);
  z-index: 1000;
}
</style>
