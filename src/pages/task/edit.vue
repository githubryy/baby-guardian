<template>
  <view class="page-task-edit">
    <view class="form-card">
      <!-- 事项类型 -->
      <view class="form-item">
        <text class="form-label">事项类型</text>
        <view class="type-grid">
          <view v-for="opt in TASK_TYPE_OPTIONS" :key="opt.value" class="type-option"
            :class="{ active: form.type === opt.value, disabled: isEdit }"
            :style="form.type === opt.value ? { borderColor: opt.color, background: opt.color + '10' } : {}"
            @tap="onSelectType(opt.value)">
            <view class="type-icon-box" :style="{ background: opt.color + '15' }">
              <u-icon :name="opt.uIcon" :size="28" :color="opt.color" />
            </view>
            <text class="type-name" :style="{ color: form.type === opt.value ? opt.color : '#666' }">
              {{ opt.label }}
            </text>
          </view>
        </view>
      </view>

      <!-- 自定义名称 -->
      <view v-if="form.type === 'custom'" class="form-item">
        <text class="form-label">事项名称</text>
        <u-input v-model="form.customName" placeholder="如：抚触按摩、排气操" border="surround"
          :customStyle="{ height: '80rpx' }" maxlength="20" />
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
            :class="{ active: form.intervalMinutes === preset.value }"
            @tap="form.intervalMinutes = preset.value">
            <text>{{ preset.label }}</text>
          </view>
        </view>
        <view class="custom-interval">
          <text class="interval-label">自定义</text>
          <u-input v-model="customIntervalStr" type="number" placeholder="分钟" border="surround"
            :customStyle="{ flex: '1', textAlign: 'center' }" @confirm="applyCustomInterval" />
          <text class="interval-unit">分钟</text>
          <u-button text="应用" size="mini" type="error" @click="applyCustomInterval" />
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
          <picker mode="time" :value="form.reminderWindowEnd"
            @change="form.reminderWindowEnd = $event.detail.value">
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
          <view class="strategy-option"
            :class="{ active: form.windowSkipStrategy === 'delay_to_next_window' }"
            @tap="form.windowSkipStrategy = 'delay_to_next_window'">
            <u-icon v-if="form.windowSkipStrategy === 'delay_to_next_window'" name="checkmark-circle-fill" :size="16" color="#FF7B7B" />
            <u-icon v-else name="radio-button-unchecked" :size="16" color="#ccc" />
            <text>推迟到下个窗口</text>
          </view>
          <view class="strategy-option"
            :class="{ active: form.windowSkipStrategy === 'skip_and_continue' }"
            @tap="form.windowSkipStrategy = 'skip_and_continue'">
            <u-icon v-if="form.windowSkipStrategy === 'skip_and_continue'" name="checkmark-circle-fill" :size="16" color="#FF7B7B" />
            <u-icon v-else name="radio-button-unchecked" :size="16" color="#ccc" />
            <text>跳过并继续</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-area">
      <u-button :text="isEdit ? '保存修改' : '添加事项'" type="error" shape="circle"
        :loading="saving" :disabled="saving"
        :customStyle="{ height: '88rpx', fontSize: '32rpx', fontWeight: '600', marginBottom: '16rpx', background: saving ? '' : 'linear-gradient(135deg, #FF7B7B, #FF6464)', boxShadow: saving ? 'none' : '0 8rpx 24rpx rgba(255, 123, 123, 0.35)' }"
        @click="onSave" />
      <u-button v-if="isEdit" text="删除事项" shape="circle" plain type="error"
        :customStyle="{ height: '88rpx', fontSize: '30rpx', background: '#FDEAEA' }"
        @click="onDelete" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useTaskStore } from '@/stores/task';
import { useBabyStore } from '@/stores/baby';
import { TASK_TYPE_OPTIONS, PRIORITY_OPTIONS, TASK_TYPE_CONFIG, DEFAULT_WINDOW } from '@/utils/constants';
import type { TaskType, TaskPriority, WindowSkipStrategy } from '@/types';

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

watch(() => form.value.type, (newType) => {
  const config = TASK_TYPE_CONFIG[newType];
  if (config && !isEdit.value) {
    form.value.intervalMinutes = config.defaultInterval;
    form.value.priority = config.defaultPriority;
  }
});

onLoad((options) => {
  if (options?.id) {
    isEdit.value = true;
    editId.value = options.id;
    loadTaskDetail();
  }
});

function loadTaskDetail() {
  const task = taskStore.taskList.find((t) => t._id === editId.value);
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
    };
    uni.setNavigationBarTitle({ title: '编辑事项' });
  }
}

function onSelectType(type: TaskType) {
  if (isEdit.value) return;
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
      customName: form.value.type === 'custom' ? form.value.customName.trim() : undefined,
      firstTime: form.value.firstTime,
      intervalMinutes: form.value.intervalMinutes,
      reminderWindowStart: form.value.reminderWindowStart,
      reminderWindowEnd: form.value.reminderWindowEnd,
      windowSkipStrategy: form.value.windowSkipStrategy,
      priority: form.value.priority,
    };

    if (isEdit.value) {
      const ok = await taskStore.updateTask(editId.value, data);
      if (ok) {
        uni.showToast({ title: '已保存', icon: 'success' });
        setTimeout(() => uni.navigateBack(), 600);
      }
    } else {
      const ok = await taskStore.addTask(data);
      if (ok) {
        const { guideBatchAuthorization } = await import('@/utils/subscribe');
        guideBatchAuthorization('添加事项后');
        uni.showToast({ title: '已添加', icon: 'success' });
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
      opacity: 0.5;
    }
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
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx;
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
}
</style>
