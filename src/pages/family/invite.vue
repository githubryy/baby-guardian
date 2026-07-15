<template>
  <view class="page-invite page-enter">
    <!-- 邀请码卡片 -->
    <view class="invite-card slide-up">
      <view class="card-header">
        <view class="header-icon">
          <u-icon name="gift-fill" :size="28" color="#fff" />
        </view>
        <text class="header-title">邀请家人</text>
        <text class="header-desc">分享邀请码，让家人一起参与照看宝宝</text>
      </view>

      <view class="code-display">
        <text class="code-label">家庭邀请码</text>
        <view class="code-box">
          <text class="code-text">{{ displayCode }}</text>
        </view>
        <view class="code-actions">
          <view class="code-action tap-shrink" @tap="onCopy">
            <u-icon name="file-text-fill" :size="16" color="#FF7B7B" />
            <text class="action-label">复制</text>
          </view>
          <view class="code-action tap-shrink" @tap="onRefresh">
            <u-icon name="reload" :size="16" color="#378add" />
            <text class="action-label">刷新</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 分享按钮 -->
    <view class="share-section slide-up" style="animation-delay: 0.1s">
      <u-button text="分享给家人" type="primary" size="large" :customStyle="{ borderRadius: '24rpx' }"
        open-type="share" @click="onShare" />
      <text class="share-hint">点击上方按钮可直接分享到微信聊天</text>
    </view>

    <!-- 使用说明 -->
    <view class="guide-section slide-up" style="animation-delay: 0.16s">
      <view class="guide-title-row">
        <u-icon name="info-circle" :size="18" color="#999" />
        <text class="guide-title">如何邀请家人</text>
      </view>
      <view class="guide-steps">
        <view class="guide-step">
          <view class="step-num">1</view>
          <view class="step-body">
            <text class="step-title">复制邀请码或分享小程序</text>
            <text class="step-desc">将邀请码复制或通过微信分享给家人</text>
          </view>
        </view>
        <view class="guide-step">
          <view class="step-num">2</view>
          <view class="step-body">
            <text class="step-title">家人打开小程序</text>
            <text class="step-desc">家人在微信中打开宝宝守护者小程序</text>
          </view>
        </view>
        <view class="guide-step">
          <view class="step-num">3</view>
          <view class="step-body">
            <text class="step-title">输入邀请码加入</text>
            <text class="step-desc">在「我的 > 家庭管理 > 加入家庭」中输入邀请码</text>
          </view>
        </view>
        <view class="guide-step">
          <view class="step-num">4</view>
          <view class="step-body">
            <text class="step-title">选择身份</text>
            <text class="step-desc">选择爸爸、妈妈、爷爷、奶奶等身份后即可加入</text>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-space" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow, onShareAppMessage } from '@dcloudio/uni-app';
import { storeToRefs } from 'pinia';
import { useFamilyStore } from '@/stores/family';

const familyStore = useFamilyStore();
const { inviteCode } = storeToRefs(familyStore);

const displayCode = computed(() => {
  if (!inviteCode.value) return '------';
  return inviteCode.value;
});

onShow(() => {
  if (!familyStore.hasFamily) {
    familyStore.loadFamily();
  }
});

function onCopy() {
  if (!inviteCode.value) return;
  uni.setClipboardData({
    data: inviteCode.value,
    success: () => {
      uni.showToast({ title: '邀请码已复制', icon: 'success' });
    },
  });
}

async function onRefresh() {
  const newCode = await familyStore.refreshInviteCode();
  if (newCode) {
    uni.showToast({ title: '邀请码已刷新', icon: 'success' });
  }
}

function onShare() {
  // 按钮的 open-type="share" 会自动触发分享
}

onShareAppMessage(() => {
  return {
    title: `一起照看宝宝吧！家庭邀请码：${inviteCode.value}`,
    path: `/pages/family/join?code=${inviteCode.value}`,
  };
});
</script>

<style lang="scss" scoped>
.page-invite {
  min-height: 100vh;
  background: #f8f8f8;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.invite-card {
  background: linear-gradient(135deg, #ff7b7b, #ff9b9b);
  border-radius: 28rpx;
  padding: 40rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(255, 123, 123, 0.25);
  overflow: hidden;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: -60rpx;
    right: -60rpx;
    width: 240rpx;
    height: 240rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
  }

  .card-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 36rpx;
    position: relative;

    .header-icon {
      width: 88rpx;
      height: 88rpx;
      border-radius: 24rpx;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20rpx;
    }

    .header-title {
      font-size: 34rpx;
      font-weight: 700;
      color: #fff;
      margin-bottom: 8rpx;
    }

    .header-desc {
      font-size: 24rpx;
      color: rgba(255, 255, 255, 0.85);
      text-align: center;
    }
  }

  .code-display {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 20rpx;
    padding: 36rpx 32rpx;
    position: relative;

    .code-label {
      display: block;
      font-size: 24rpx;
      color: #999;
      text-align: center;
      margin-bottom: 16rpx;
    }

    .code-box {
      display: flex;
      justify-content: center;
      margin-bottom: 24rpx;

      .code-text {
        font-size: 64rpx;
        font-weight: 800;
        color: #ff7b7b;
        letter-spacing: 12rpx;
        font-variant-numeric: tabular-nums;
      }
    }

    .code-actions {
      display: flex;
      justify-content: center;
      gap: 48rpx;

      .code-action {
        display: flex;
        align-items: center;
        gap: 6rpx;
        padding: 10rpx 20rpx;
        background: #f5f5f5;
        border-radius: 999rpx;

        .action-label {
          font-size: 24rpx;
          color: #666;
          font-weight: 500;
        }
      }
    }
  }
}

.share-section {
  margin-bottom: 40rpx;

  .share-hint {
    display: block;
    text-align: center;
    font-size: 22rpx;
    color: #bbb;
    margin-top: 16rpx;
  }
}

.guide-section {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  .guide-title-row {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-bottom: 24rpx;

    .guide-title {
      font-size: 28rpx;
      color: #666;
      font-weight: 600;
    }
  }

  .guide-steps {
    .guide-step {
      display: flex;
      gap: 20rpx;
      margin-bottom: 28rpx;

      &:last-child {
        margin-bottom: 0;
      }

      .step-num {
        width: 40rpx;
        height: 40rpx;
        border-radius: 50%;
        background: linear-gradient(135deg, #ff7b7b, #ff9b9b);
        color: #fff;
        font-size: 24rpx;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .step-body {
        flex: 1;

        .step-title {
          display: block;
          font-size: 28rpx;
          color: #2d2d2d;
          font-weight: 500;
          margin-bottom: 4rpx;
        }

        .step-desc {
          display: block;
          font-size: 24rpx;
          color: #aaa;
        }
      }
    }
  }
}

.bottom-space {
  height: 80rpx;
}
</style>
