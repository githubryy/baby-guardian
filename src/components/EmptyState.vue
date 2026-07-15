<template>
  <view class="empty-state fade-in">
    <view class="empty-icon-wrap">
      <view class="empty-icon-bg" />
      <view class="empty-icon">
        <u-icon :name="uIcon || 'heart-fill'" :size="56" :color="iconColor" />
      </view>
    </view>
    <view class="empty-text">{{ text }}</view>
    <view v-if="subText" class="empty-sub-text">{{ subText }}</view>
    <u-button v-if="actionText" :text="actionText" type="error" shape="circle"
      :customStyle="actionBtnStyle" @click="$emit('action')" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  icon?: string;
  uIcon?: string;
  text: string;
  subText?: string;
  actionText?: string;
}>();

defineEmits<{
  (e: 'action'): void;
}>();

const iconColor = computed(() => '#FF7B7B');

const actionBtnStyle = {
  marginTop: '36rpx',
  width: '280rpx',
  height: '80rpx',
  fontSize: '28rpx',
  fontWeight: '600',
  background: 'linear-gradient(135deg, #FF7B7B, #FF9B9B)',
  border: 'none',
  boxShadow: '0 8rpx 24rpx rgba(255, 123, 123, 0.35)',
};
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 40rpx;

  .empty-icon-wrap {
    position: relative;
    margin-bottom: 32rpx;

    .empty-icon-bg {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 160rpx;
      height: 160rpx;
      border-radius: 50%;
      background: linear-gradient(135deg, #fff0f0, #ffe0e0);
      opacity: 0.6;
    }

    .empty-icon {
      position: relative;
      width: 160rpx;
      height: 160rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: float 3s ease-in-out infinite;
    }
  }

  .empty-text {
    font-size: 30rpx;
    color: #999;
    margin-bottom: 8rpx;
    font-weight: 500;
  }

  .empty-sub-text {
    font-size: 24rpx;
    color: #bbb;
    margin-bottom: 4rpx;
    text-align: center;
    line-height: 1.5;
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-12rpx);
  }
}
</style>
