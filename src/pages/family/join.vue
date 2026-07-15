<template>
  <view class="page-join page-enter">
    <!-- 输入邀请码 -->
    <view class="input-card slide-up">
      <view class="card-icon">
        <u-icon name="account-fill" :size="32" color="#FF7B7B" />
      </view>
      <text class="card-title">加入家庭</text>
      <text class="card-desc">输入家人分享的邀请码，加入家庭一起照看宝宝</text>

      <view class="code-input-wrap">
        <u-input v-model="codeInput" placeholder="请输入6位邀请码" border="surround" maxlength="6"
          :customStyle="{ textAlign: 'center', fontSize: '48rpx', fontWeight: '700', letterSpacing: '16rpx', height: '100rpx' }"
          @input="onCodeInput" />
      </view>
    </view>

    <!-- 选择身份 -->
    <view class="relation-section slide-up" style="animation-delay: 0.1s">
      <view class="section-title-row">
        <u-icon name="account-fill" :size="18" color="#2d2d2d" />
        <text class="section-title">选择您的身份</text>
      </view>
      <view class="relation-grid">
        <view v-for="opt in relationOptions" :key="opt.value" class="relation-option tap-shrink"
          :class="{ active: selectedRelation === opt.value }"
          @tap="selectedRelation = opt.value">
          <view class="relation-opt-icon" :style="{ background: opt.bgColor }">
            <u-icon :name="opt.uIcon" :size="26" :color="opt.color" />
          </view>
          <text class="relation-opt-name">{{ opt.label }}</text>
          <view v-if="selectedRelation === opt.value" class="check-mark">
            <u-icon name="checkmark-circle-fill" :size="20" color="#FF7B7B" />
          </view>
        </view>
      </view>
    </view>

    <!-- 加入按钮 -->
    <view class="join-btn-wrap slide-up" style="animation-delay: 0.16s">
      <u-button text="加入家庭" type="primary" size="large" :customStyle="{ borderRadius: '24rpx' }"
        :disabled="!canJoin" :loading="joining" @click="onJoin" />
    </view>

    <!-- 说明 -->
    <view class="join-tips slide-up" style="animation-delay: 0.2s">
      <u-icon name="info-circle" :size="14" color="#ccc" />
      <text class="tips-text">加入家庭后，您可以查看家庭中共享的宝宝信息、提醒事项和操作记录。您的宝宝信息也会同步到家庭中。</text>
    </view>

    <view class="bottom-space" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useFamilyStore } from '@/stores/family';
import { FAMILY_RELATION_CONFIG, FAMILY_RELATION_OPTIONS } from '@/utils/constants';
import type { FamilyRelation } from '@/types';

const familyStore = useFamilyStore();

const codeInput = ref('');
const selectedRelation = ref<FamilyRelation>('mother');
const joining = ref(false);

const relationOptions = FAMILY_RELATION_OPTIONS.map(opt => ({
  ...opt,
  bgColor: FAMILY_RELATION_CONFIG[opt.value].bgColor,
}));

const canJoin = computed(() => codeInput.value.length === 6 && !!selectedRelation.value);

onLoad((options) => {
  // 从分享链接带入的邀请码
  if (options?.code) {
    codeInput.value = options.code.toUpperCase();
  }
});

function onCodeInput(val: string) {
  codeInput.value = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function onJoin() {
  if (!canJoin.value) return;
  joining.value = true;
  const ok = await familyStore.joinByCode(codeInput.value, selectedRelation.value);
  joining.value = false;
  if (ok) {
    uni.showToast({ title: '加入成功', icon: 'success' });
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' });
    }, 1000);
  }
}
</script>

<style lang="scss" scoped>
.page-join {
  min-height: 100vh;
  background: #f8f8f8;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.input-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;

  .card-icon {
    width: 96rpx;
    height: 96rpx;
    border-radius: 24rpx;
    background: linear-gradient(135deg, #fff0f0, #ffe0e0);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20rpx;
  }

  .card-title {
    font-size: 36rpx;
    font-weight: 700;
    color: #2d2d2d;
    margin-bottom: 8rpx;
  }

  .card-desc {
    font-size: 26rpx;
    color: #999;
    text-align: center;
    margin-bottom: 36rpx;
  }

  .code-input-wrap {
    width: 100%;
  }
}

.relation-section {
  margin-bottom: 32rpx;

  .section-title-row {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-bottom: 20rpx;
    padding-left: 8rpx;

    .section-title {
      font-size: 30rpx;
      font-weight: 600;
      color: #2d2d2d;
    }
  }

  .relation-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;

    .relation-option {
      width: calc((100% - 40rpx) / 3);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12rpx;
      padding: 28rpx 0;
      border-radius: 20rpx;
      border: 2rpx solid transparent;
      background: #fff;
      box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
      position: relative;

      &.active {
        border-color: #FF7B7B;
        background: #FFF0F0;
      }

      .relation-opt-icon {
        width: 72rpx;
        height: 72rpx;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .relation-opt-name {
        font-size: 26rpx;
        color: #2d2d2d;
        font-weight: 500;
      }

      .check-mark {
        position: absolute;
        top: 12rpx;
        right: 12rpx;
      }
    }
  }
}

.join-btn-wrap {
  margin-bottom: 24rpx;
}

.join-tips {
  display: flex;
  gap: 8rpx;
  padding: 0 16rpx;

  .tips-text {
    font-size: 22rpx;
    color: #ccc;
    line-height: 1.6;
  }
}

.bottom-space {
  height: 80rpx;
}
</style>
