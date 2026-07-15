<template>
  <view class="baby-card tap-shrink" :class="{ active: baby.isActive }" @tap="$emit('tap', baby)">
    <view class="avatar" :style="{ background: avatarBg }">
      <image v-if="baby.avatarUrl" :src="baby.avatarUrl" mode="aspectFill" class="avatar-img" />
      <u-icon v-else :name="genderIcon" :size="42" :color="genderColor" />
      <view v-if="baby.isActive" class="active-check">
        <u-icon name="checkmark" :size="12" color="#fff" />
      </view>
    </view>
    <view class="info">
      <view class="name-row">
        <text class="name">{{ baby.name }}</text>
        <u-tag v-if="baby.isActive" text="当前" type="error" size="mini" shape="circle" plain />
      </view>
      <view class="meta-row">
        <text class="meta-item">{{ ageText }}</text>
        <text class="meta-divider">·</text>
        <text class="meta-item">{{ genderText }}</text>
        <template v-if="baby.isPremature">
          <text class="meta-divider">·</text>
          <u-tag text="早产儿" type="warning" size="mini" shape="circle" plain />
        </template>
      </view>
    </view>
    <view class="actions">
      <u-button text="编辑" size="mini" shape="circle" plain @click.stop="$emit('edit', baby)" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Baby } from '@/types';
import { calcAge } from '@/utils/time';

const props = defineProps<{
  baby: Baby;
}>();

defineEmits<{
  (e: 'tap', baby: Baby): void;
  (e: 'edit', baby: Baby): void;
}>();

const ageText = computed(() => {
  const age = calcAge(props.baby.birthday);
  return age.text;
});

const genderText = computed(() => {
  const map = { male: '男宝', female: '女宝', unknown: '未设置' };
  return map[props.baby.gender];
});

const genderIcon = computed(() => {
  if (props.baby.gender === 'male') return 'man';
  if (props.baby.gender === 'female') return 'woman';
  return 'account-fill';
});

const genderColor = computed(() => {
  if (props.baby.gender === 'male') return '#378add';
  if (props.baby.gender === 'female') return '#FF7B7B';
  return '#999';
});

const avatarBg = computed(() => {
  if (props.baby.gender === 'male') return '#E8F2FC';
  if (props.baby.gender === 'female') return '#FFF0F0';
  return '#F5F5F5';
});
</script>

<style lang="scss" scoped>
.baby-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 32rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
  border: 2rpx solid transparent;
  transition: all 0.2s ease;

  &.active {
    border-color: #ff7b7b;
    background: linear-gradient(135deg, #fff, #fffafa);
    box-shadow: 0 4rpx 16rpx rgba(255, 123, 123, 0.12);
  }

  .avatar {
    position: relative;
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;
    flex-shrink: 0;

    .avatar-img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
    }

    .active-check {
      position: absolute;
      bottom: -2rpx;
      right: -2rpx;
      width: 32rpx;
      height: 32rpx;
      border-radius: 50%;
      background: #ff7b7b;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3rpx solid #fff;
    }
  }

  .info {
    flex: 1;
    min-width: 0;

    .name-row {
      display: flex;
      align-items: center;
      gap: 12rpx;
      margin-bottom: 8rpx;

      .name {
        font-size: 32rpx;
        font-weight: 600;
        color: #2d2d2d;
      }
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 8rpx;

      .meta-item {
        font-size: 24rpx;
        color: #999;
      }

      .meta-divider {
        font-size: 20rpx;
        color: #ddd;
      }
    }
  }

  .actions {
    flex-shrink: 0;
  }
}
</style>
