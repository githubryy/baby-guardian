<template>
  <view class="quota-badge" :class="{ 'low-quota': available <= 2, 'zero-quota': available === 0 }" @tap="handleTap">
    <view class="quota-ring" :style="ringStyle">
      <text class="quota-num">{{ available }}</text>
    </view>
    <text class="quota-text">{{ available > 2 ? '提醒充足' : available > 0 ? '即将不足' : '已耗尽' }}</text>
    <view v-if="available <= 2" class="quota-action tap-feedback">
      <u-icon name="reload" :size="12" color="#FF7B7B" />
      <text>补充</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/user';
import { guideBatchAuthorization } from '@/utils/subscribe';

const userStore = useUserStore();
const { quotaSummary } = storeToRefs(userStore);
const available = computed(() => quotaSummary.value?.available ?? 0);

const ringStyle = computed(() => {
  const total = quotaSummary.value?.total || 10;
  const percent = total > 0 ? Math.min(available.value / total, 1) : 0;
  const color = available.value > 2 ? '#ff7b7b' : available.value > 0 ? '#ef9f27' : '#e24b4a';
  return {
    background: `conic-gradient(${color} ${percent * 360}deg, rgba(255,255,255,0.3) ${percent * 360}deg)`,
  };
});

async function handleTap() {
  if (available.value > 2) return;
  await guideBatchAuthorization('配额补充');
  userStore.refreshQuota();
}
</script>

<style lang="scss" scoped>
.quota-badge {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 6rpx 18rpx 6rpx 6rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 999rpx;
  backdrop-filter: blur(8px);

  .quota-ring {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      inset: 4rpx;
      border-radius: 50%;
      background: rgba(255, 123, 123, 0.9);
    }

    .quota-num {
      position: relative;
      z-index: 1;
      font-size: 22rpx;
      font-weight: 700;
      color: #fff;
    }
  }

  .quota-text {
    font-size: 22rpx;
    color: #fff;
    font-weight: 500;
  }

  .quota-action {
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 4rpx 14rpx;
    background: #fff;
    border-radius: 999rpx;
    font-size: 20rpx;
    color: #ff7b7b;
    font-weight: 600;
  }

  &.low-quota {
    background: rgba(239, 159, 39, 0.25);
    animation: pulse 2s ease-in-out infinite;

    .quota-ring::after {
      background: rgba(239, 159, 39, 0.9);
    }
  }

  &.zero-quota {
    background: rgba(226, 75, 74, 0.25);
    animation: pulse 1.5s ease-in-out infinite;

    .quota-ring::after {
      background: rgba(226, 75, 74, 0.9);
    }
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.85;
    transform: scale(1.03);
  }
}
</style>
