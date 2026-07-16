<template>
  <view class="page-role">
    <!-- 顶部装饰区 -->
    <view class="hero-section">
      <view class="hero-bg" />
      <view class="hero-content">
        <view class="hero-icon-wrap">
          <view class="hero-icon">
            <u-icon name="heart-fill" :size="48" color="#fff" />
          </view>
        </view>
        <text class="hero-title">欢迎加入宝宝守护者</text>
        <text class="hero-subtitle">请选择您的身份，为您提供更贴心的育儿服务</text>
      </view>
    </view>

    <!-- 主要内容区 -->
    <view class="main-section">
      <!-- 主要角色（爸妈） -->
      <view class="section-title">常用身份</view>
      <view class="role-grid">
        <view
          v-for="role in primaryRoles"
          :key="role.value"
          class="role-card tap-feedback"
          :class="{ 'role-card--selected': selectedRole === role.value }"
          :style="roleCardStyle(role)"
          @tap="selectedRole = role.value"
        >
          <view class="role-icon-wrap" :style="{ background: role.bgColor }">
            <u-icon :name="role.uIcon" :size="40" :color="role.color" />
          </view>
          <text class="role-name">{{ role.name }}</text>
          <text class="role-desc">{{ role.desc }}</text>
          <view v-if="selectedRole === role.value" class="role-check">
            <u-icon name="checkmark-circle-fill" :size="32" color="#FF7B7B" />
          </view>
        </view>
      </view>

      <!-- 更多身份 -->
      <view class="section-title secondary-title">其他身份</view>
      <view class="role-small-grid">
        <view
          v-for="role in otherRoles"
          :key="role.value"
          class="role-small-card tap-shrink"
          :class="{ 'role-small-card--selected': selectedRole === role.value }"
          @tap="selectedRole = role.value"
        >
          <view class="role-small-icon" :style="{ background: role.bgColor }">
            <u-icon :name="role.uIcon" :size="24" :color="role.color" />
          </view>
          <text class="role-small-name">{{ role.name }}</text>
        </view>
      </view>

      <!-- 确认按钮 -->
      <view class="btn-area safe-bottom">
        <button
          class="confirm-btn tap-feedback"
          :class="{ 'confirm-btn--disabled': !selectedRole || saving }"
          :disabled="!selectedRole || saving"
          @tap="handleConfirm"
        >
          <u-loading-icon v-if="saving" :size="18" color="#fff" />
          <text v-else>开始使用</text>
        </button>
        <text class="skip-text tap-shrink" @tap="handleSkip">暂不设置，稍后再选</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '@/stores/user';
import { FAMILY_RELATION_CONFIG } from '@/utils/constants';
import type { FamilyRelation } from '@/types';

const userStore = useUserStore();
const selectedRole = ref<FamilyRelation | null>(null);
const saving = ref(false);

/** 主要角色：宝妈 + 宝爸 */
const primaryRoles = [
  {
    value: 'mother' as FamilyRelation,
    name: '我是妈妈',
    desc: '记录哺乳、护理，陪伴宝宝成长',
    uIcon: FAMILY_RELATION_CONFIG.mother.uIcon,
    color: FAMILY_RELATION_CONFIG.mother.color,
    bgColor: FAMILY_RELATION_CONFIG.mother.bgColor,
  },
  {
    value: 'father' as FamilyRelation,
    name: '我是爸爸',
    desc: '管理提醒事项，分担育儿责任',
    uIcon: FAMILY_RELATION_CONFIG.father.uIcon,
    color: FAMILY_RELATION_CONFIG.father.color,
    bgColor: FAMILY_RELATION_CONFIG.father.bgColor,
  },
];

/** 其他身份 */
const otherRoles = [
  {
    value: 'grandmother' as FamilyRelation,
    name: '奶奶',
    uIcon: FAMILY_RELATION_CONFIG.grandmother.uIcon,
    color: FAMILY_RELATION_CONFIG.grandmother.color,
    bgColor: FAMILY_RELATION_CONFIG.grandmother.bgColor,
  },
  {
    value: 'grandfather' as FamilyRelation,
    name: '爷爷',
    uIcon: FAMILY_RELATION_CONFIG.grandfather.uIcon,
    color: FAMILY_RELATION_CONFIG.grandfather.color,
    bgColor: FAMILY_RELATION_CONFIG.grandfather.bgColor,
  },
  {
    value: 'grandmother_in_law' as FamilyRelation,
    name: '外婆',
    uIcon: FAMILY_RELATION_CONFIG.grandmother_in_law.uIcon,
    color: FAMILY_RELATION_CONFIG.grandmother_in_law.color,
    bgColor: FAMILY_RELATION_CONFIG.grandmother_in_law.bgColor,
  },
  {
    value: 'grandfather_in_law' as FamilyRelation,
    name: '外公',
    uIcon: FAMILY_RELATION_CONFIG.grandfather_in_law.uIcon,
    color: FAMILY_RELATION_CONFIG.grandfather_in_law.color,
    bgColor: FAMILY_RELATION_CONFIG.grandfather_in_law.bgColor,
  },
  {
    value: 'nanny' as FamilyRelation,
    name: '育儿阿姨',
    uIcon: FAMILY_RELATION_CONFIG.nanny.uIcon,
    color: FAMILY_RELATION_CONFIG.nanny.color,
    bgColor: FAMILY_RELATION_CONFIG.nanny.bgColor,
  },
  {
    value: 'other' as FamilyRelation,
    name: '其他',
    uIcon: FAMILY_RELATION_CONFIG.other.uIcon,
    color: FAMILY_RELATION_CONFIG.other.color,
    bgColor: FAMILY_RELATION_CONFIG.other.bgColor,
  },
];

/** 选中态卡片阴影 */
function roleCardStyle(role: (typeof primaryRoles)[0]) {
  return selectedRole.value === role.value
    ? { borderColor: role.color, boxShadow: `0 4rpx 20rpx ${role.color}33` }
    : {};
}

/** 确认选择并保存 */
async function handleConfirm() {
  if (!selectedRole.value || saving.value) return;
  saving.value = true;
  try {
    await userStore.setRelation(selectedRole.value);
    uni.showToast({ title: '设置成功', icon: 'success' });
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' });
    }, 600);
  } catch (e) {
    uni.showToast({ title: '保存失败，请重试', icon: 'none' });
  } finally {
    saving.value = false;
  }
}

/** 跳过设置 */
function handleSkip() {
  uni.switchTab({ url: '/pages/index/index' });
}
</script>

<style lang="scss" scoped>
.page-role {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
}

/* ========== 顶部装饰 ========== */
.hero-section {
  position: relative;
  overflow: hidden;

  .hero-bg {
    position: absolute;
    top: -120rpx;
    left: -60rpx;
    right: -60rpx;
    height: 520rpx;
    background: linear-gradient(135deg, #FF7B7B 0%, #FF9B9B 50%, #FFB8B8 100%);
    border-radius: 0 0 50% 50%;
  }

  .hero-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80rpx 40rpx 60rpx;
    padding-top: calc(80rpx + env(safe-area-inset-top));

    .hero-icon-wrap {
      margin-bottom: 32rpx;

      .hero-icon {
        width: 120rpx;
        height: 120rpx;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: hero-pulse 2s ease-in-out infinite;
      }
    }

    .hero-title {
      font-size: 40rpx;
      font-weight: 700;
      color: #fff;
      margin-bottom: 16rpx;
    }

    .hero-subtitle {
      font-size: 26rpx;
      color: rgba(255, 255, 255, 0.85);
      text-align: center;
      line-height: 1.6;
    }
  }
}

@keyframes hero-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

/* ========== 主要内容 ========== */
.main-section {
  flex: 1;
  padding: 40rpx 32rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2d2d2d;
  margin-bottom: 24rpx;

  &.secondary-title {
    margin-top: 40rpx;
    color: #999;
  }
}

/* ========== 角色大卡片（爸妈） ========== */
.role-grid {
  display: flex;
  gap: 24rpx;
}

.role-card {
  flex: 1;
  position: relative;
  background: #fff;
  border: 2rpx solid #f0f0f0;
  border-radius: 24rpx;
  padding: 40rpx 24rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.3s ease;

  .role-icon-wrap {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20rpx;
  }

  .role-name {
    font-size: 30rpx;
    font-weight: 600;
    color: #2d2d2d;
    margin-bottom: 10rpx;
  }

  .role-desc {
    font-size: 22rpx;
    color: #999;
    line-height: 1.5;
  }

  .role-check {
    position: absolute;
    top: 12rpx;
    right: 12rpx;
  }
}

/* ========== 小卡片（其他身份） ========== */
.role-small-grid {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 20rpx;
}

.role-small-card {
  width: calc((100% - 40rpx) / 3);
  background: #fff;
  border: 2rpx solid #f0f0f0;
  border-radius: 20rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  transition: all 0.25s ease;

  &.role-small-card--selected {
    border-color: #FF7B7B;
    background: #FFF5F5;
  }

  .role-small-icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .role-small-name {
    font-size: 24rpx;
    color: #666;
    font-weight: 500;
  }
}

/* ========== 按钮区 ========== */
.btn-area {
  margin-top: 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.confirm-btn {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #FF7B7B, #FF6464);
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 24rpx rgba(255, 123, 123, 0.35);
  border: none;

  &--disabled {
    opacity: 0.5;
    box-shadow: none;
  }
}

.skip-text {
  font-size: 26rpx;
  color: #bbb;
}
</style>
