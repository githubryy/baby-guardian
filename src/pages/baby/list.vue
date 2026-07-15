<template>
  <view class="page-baby-list page-enter">
    <view class="page-header">
      <text class="page-title">我的宝宝</text>
      <text class="page-subtitle">管理宝宝信息，支持添加多个宝宝</text>
    </view>

    <view v-if="babyList.length > 0" class="baby-list slide-up-stagger">
      <BabyCard v-for="baby in babyList" :key="baby._id" :baby="baby" @tap="onSelectBaby"
        @edit="onEditBaby" />
    </view>

    <view class="add-btn-wrap tap-feedback">
      <view class="add-btn" @tap="goAddBaby">
        <u-icon name="plus" :size="18" color="#FF7B7B" />
        <text class="add-text">添加宝宝</text>
      </view>
    </view>

    <EmptyState v-if="!loading && babyList.length === 0" uIcon="account-fill" text="还没有添加宝宝"
      subText="添加宝宝信息，开始守护之旅" actionText="添加宝宝" @action="goAddBaby" />
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { storeToRefs } from 'pinia';
import { useBabyStore } from '@/stores/baby';
import type { Baby } from '@/types';
import BabyCard from '@/components/BabyCard.vue';
import EmptyState from '@/components/EmptyState.vue';

const babyStore = useBabyStore();
const { babyList, loading } = storeToRefs(babyStore);

onShow(() => {
  babyStore.loadBabyList();
});

async function onSelectBaby(baby: Baby) {
  if (!baby.isActive) {
    await babyStore.switchBaby(baby._id);
    uni.showToast({ title: `已切换到 ${baby.name}`, icon: 'none' });
  }
  uni.navigateBack();
}

function onEditBaby(baby: Baby) {
  uni.navigateTo({ url: `/pages/baby/edit?id=${baby._id}` });
}

function goAddBaby() {
  uni.navigateTo({ url: '/pages/baby/edit' });
}
</script>

<style lang="scss" scoped>
.page-baby-list {
  min-height: 100vh;
  background: #f8f8f8;
  padding: 24rpx;
}

.page-header {
  margin-bottom: 32rpx;

  .page-title {
    display: block;
    font-size: 40rpx;
    font-weight: 700;
    color: #2d2d2d;
    margin-bottom: 8rpx;
  }

  .page-subtitle {
    font-size: 26rpx;
    color: #999;
  }
}

.baby-list {
  margin-bottom: 24rpx;
}

.add-btn-wrap {
  margin-bottom: 24rpx;

  .add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    height: 96rpx;
    background: #fff;
    border: 2rpx dashed #ff7b7b;
    border-radius: 24rpx;
    transition: all 0.2s ease;

    .add-text {
      font-size: 30rpx;
      color: #ff7b7b;
    }
  }
}
</style>
