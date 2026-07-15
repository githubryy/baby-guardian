<template>
  <view class="page-settings page-enter">
    <!-- 用户信息 -->
    <view class="user-card slide-up">
      <view class="avatar" :style="{ background: '#FFF0F0' }">
        <image v-if="avatarUrl" :src="avatarUrl" mode="aspectFill" class="avatar-img" />
        <u-icon v-else name="account-fill" :size="42" color="#FF7B7B" />
      </view>
      <view class="user-info">
        <text class="user-name">{{ nickName }}</text>
        <text class="user-desc">守护宝宝的每一天</text>
      </view>
      <view class="user-badge">
        <text class="badge-text">守护者</text>
      </view>
    </view>

    <!-- 配额信息 -->
    <view class="section slide-up" style="animation-delay: 0.06s">
      <view class="section-title">提醒配额</view>
      <view class="quota-card tap-shrink" @tap="onSupplementQuota">
        <view class="quota-info">
          <view class="quota-icon-big" :class="{ 'low': availableQuota <= 2 }">
            <u-icon name="bell-fill" :size="24" :color="availableQuota <= 2 ? '#ef9f27' : '#FF7B7B'" />
          </view>
          <view class="quota-detail">
            <view class="quota-num-row">
              <text class="quota-available">{{ availableQuota }}</text>
              <text class="quota-unit">次可用</text>
            </view>
            <text class="quota-desc">授权后可获得提醒配额 (7天有效)</text>
          </view>
        </view>
        <view class="quota-action tap-feedback">
          <text>补充</text>
          <u-icon name="arrow-right" :size="13" color="#FF7B7B" />
        </view>
      </view>
    </view>

    <!-- 宝宝管理 -->
    <view class="section slide-up" style="animation-delay: 0.12s">
      <view class="section-title">宝宝管理</view>
      <view class="menu-list">
        <view class="menu-item tap-shrink" @tap="goBabyList">
          <view class="menu-icon-wrap baby-bg">
            <u-icon name="account-fill" :size="22" color="#FF7B7B" />
          </view>
          <text class="menu-text">宝宝列表</text>
          <u-icon name="arrow-right" :size="16" color="#ccc" />
        </view>
        <view class="menu-item tap-shrink" @tap="goAddBaby">
          <view class="menu-icon-wrap add-bg">
            <u-icon name="plus-circle-fill" :size="22" color="#378add" />
          </view>
          <text class="menu-text">添加宝宝</text>
          <u-icon name="arrow-right" :size="16" color="#ccc" />
        </view>
      </view>
    </view>

    <!-- 提醒设置 -->
    <view class="section slide-up" style="animation-delay: 0.18s">
      <view class="section-title">提醒设置</view>
      <view class="menu-list">
        <view class="menu-item">
          <view class="menu-icon-wrap push-bg">
            <u-icon name="bell-fill" :size="22" color="#ef9f27" />
          </view>
          <text class="menu-text">全局推送</text>
          <u-switch v-model="pushProxy" activeColor="#FF7B7B" size="40" />
        </view>
        <view class="menu-item tap-shrink">
          <view class="menu-icon-wrap moon-bg">
            <u-icon name="eye-fill" :size="22" color="#7f77dd" />
          </view>
          <text class="menu-text">免打扰开始</text>
          <picker mode="time" :value="settings.quietHoursStart"
            @change="onQuietStartChange">
            <view class="menu-value-wrap">
              <text class="menu-value">{{ settings.quietHoursStart }}</text>
              <u-icon name="arrow-right" :size="14" color="#ccc" />
            </view>
          </picker>
        </view>
        <view class="menu-item tap-shrink">
          <view class="menu-icon-wrap sun-bg">
            <u-icon name="eye-fill" :size="22" color="#ef9f27" />
          </view>
          <text class="menu-text">免打扰结束</text>
          <picker mode="time" :value="settings.quietHoursEnd"
            @change="onQuietEndChange">
            <view class="menu-value-wrap">
              <text class="menu-value">{{ settings.quietHoursEnd }}</text>
              <u-icon name="arrow-right" :size="14" color="#ccc" />
            </view>
          </picker>
        </view>
      </view>
    </view>

    <!-- 关于 -->
    <view class="section slide-up" style="animation-delay: 0.24s">
      <view class="section-title">关于</view>
      <view class="menu-list">
        <view class="menu-item tap-shrink" @tap="showAbout">
          <view class="menu-icon-wrap info-bg">
            <u-icon name="info-circle-fill" :size="22" color="#1d9e75" />
          </view>
          <text class="menu-text">关于宝宝守护者</text>
          <u-icon name="arrow-right" :size="16" color="#ccc" />
        </view>
        <view class="menu-item tap-shrink" @tap="showHelp">
          <view class="menu-icon-wrap help-bg">
            <u-icon name="question-circle-fill" :size="22" color="#9c27b0" />
          </view>
          <text class="menu-text">使用帮助</text>
          <u-icon name="arrow-right" :size="16" color="#ccc" />
        </view>
        <view class="menu-item tap-shrink" @tap="showFeedback">
          <view class="menu-icon-wrap feedback-bg">
            <u-icon name="chat-fill" :size="22" color="#00bcd4" />
          </view>
          <text class="menu-text">意见反馈</text>
          <u-icon name="arrow-right" :size="16" color="#ccc" />
        </view>
      </view>
    </view>

    <view class="version">宝宝守护者 v1.0.0</view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/user';
import { guideBatchAuthorization } from '@/utils/subscribe';

const userStore = useUserStore();
const { nickName, avatarUrl, settings, availableQuota } = storeToRefs(userStore);

const pushProxy = computed({
  get: () => settings.value.globalPushEnabled,
  set: (val: boolean) => userStore.updateSettings({ globalPushEnabled: val }),
});

onShow(() => {
  userStore.refreshQuota();
});

function goBabyList() {
  uni.navigateTo({ url: '/pages/baby/list' });
}

function goAddBaby() {
  uni.navigateTo({ url: '/pages/baby/edit' });
}

async function onQuietStartChange(e: any) {
  await userStore.updateSettings({ quietHoursStart: e.detail.value });
}

async function onQuietEndChange(e: any) {
  await userStore.updateSettings({ quietHoursEnd: e.detail.value });
}

async function onSupplementQuota() {
  await guideBatchAuthorization('配额补充');
  userStore.refreshQuota();
}

function showAbout() {
  uni.showModal({
    title: '宝宝守护者',
    content: '一款专为新手父母设计的育儿提醒助手，帮助您科学喂养、按时护理，守护宝宝健康成长的每一天。',
    showCancel: false,
    confirmColor: '#FF7B7B',
  });
}

function showHelp() {
  uni.showModal({
    title: '使用帮助',
    content: '1. 添加宝宝信息\n2. 配置提醒事项（喂养、换尿布、用药等）\n3. 授权订阅消息获取推送\n4. 收到提醒后确认完成\n\n提醒配额说明：每次授权获得1条推送配额，7天内有效。配额不足时可通过首页或设置页补充。',
    showCancel: false,
    confirmColor: '#FF7B7B',
  });
}

function showFeedback() {
  uni.showActionSheet({
    itemList: ['功能建议', '问题反馈', '其他'],
    success: () => {
      uni.showToast({ title: '感谢您的反馈！', icon: 'none' });
    },
  });
}
</script>

<style lang="scss" scoped>
.page-settings {
  min-height: 100vh;
  background: #f8f8f8;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: linear-gradient(135deg, #ff7b7b, #ff9b9b);
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(255, 123, 123, 0.25);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -40rpx;
    right: -40rpx;
    width: 200rpx;
    height: 200rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
  }

  .avatar {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 3rpx solid rgba(255, 255, 255, 0.5);
    flex-shrink: 0;

    .avatar-img {
      width: 100%;
      height: 100%;
    }
  }

  .user-info {
    flex: 1;

    .user-name {
      display: block;
      font-size: 36rpx;
      font-weight: 700;
      color: #fff;
    }

    .user-desc {
      display: block;
      font-size: 24rpx;
      color: rgba(255, 255, 255, 0.8);
      margin-top: 8rpx;
    }
  }

  .user-badge {
    padding: 8rpx 20rpx;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 999rpx;

    .badge-text {
      font-size: 22rpx;
      color: #fff;
      font-weight: 500;
    }
  }
}

.section {
  margin-bottom: 32rpx;

  .section-title {
    font-size: 26rpx;
    color: #999;
    margin-bottom: 16rpx;
    padding-left: 8rpx;
    font-weight: 500;
  }
}

.quota-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  .quota-info {
    display: flex;
    align-items: center;
    gap: 20rpx;

    .quota-icon-big {
      width: 72rpx;
      height: 72rpx;
      border-radius: 20rpx;
      background: linear-gradient(135deg, #fff0f0, #ffe0e0);
      display: flex;
      align-items: center;
      justify-content: center;

      &.low {
        background: linear-gradient(135deg, #fef5e7, #fce4b3);
        animation: pulse 2s ease-in-out infinite;
      }
    }

    .quota-detail {
      .quota-num-row {
        display: flex;
        align-items: baseline;
        gap: 4rpx;

        .quota-available {
          font-size: 36rpx;
          font-weight: 700;
          color: #2d2d2d;
          font-variant-numeric: tabular-nums;
        }

        .quota-unit {
          font-size: 22rpx;
          color: #999;
        }
      }

      .quota-desc {
        display: block;
        font-size: 22rpx;
        color: #aaa;
        margin-top: 2rpx;
      }
    }
  }

  .quota-action {
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 10rpx 24rpx;
    background: linear-gradient(135deg, #fff0f0, #ffe8e8);
    border-radius: 999rpx;
    font-size: 26rpx;
    color: #ff7b7b;
    font-weight: 600;
  }
}

.menu-list {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  .menu-item {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding: 24rpx 32rpx;
    border-bottom: 1rpx solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }

    .menu-icon-wrap {
      width: 56rpx;
      height: 56rpx;
      border-radius: 14rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.baby-bg { background: #fff0f0; }
      &.add-bg { background: #e8f2fc; }
      &.push-bg { background: #fef5e7; }
      &.moon-bg { background: #e8eaf6; }
      &.sun-bg { background: #fff8e1; }
      &.info-bg { background: #e8f7f0; }
      &.help-bg { background: #f3e5f5; }
      &.feedback-bg { background: #e0f7fa; }
    }

    .menu-text {
      flex: 1;
      font-size: 30rpx;
      color: #2d2d2d;
    }

    .menu-value-wrap {
      display: flex;
      align-items: center;
      gap: 4rpx;

      .menu-value {
        font-size: 28rpx;
        color: #999;
      }
    }
  }
}

.version {
  text-align: center;
  font-size: 24rpx;
  color: #ccc;
  padding: 24rpx;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>
