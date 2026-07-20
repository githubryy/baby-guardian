<template>
  <view class="page-family page-enter">
    <!-- 无家庭 -->
    <template v-if="!hasFamily && !loading">
      <view class="empty-hero slide-up">
        <view class="hero-icon">
          <u-icon name="account-fill" :size="56" color="#FF7B7B" />
        </view>
        <text class="hero-title">开启家庭协作</text>
        <text class="hero-desc">邀请家人一起照看宝宝，实时同步喂养、护理记录，不再错过每一次提醒</text>
      </view>

      <view class="action-cards">
        <view class="action-card slide-up tap-shrink" style="animation-delay: 0.1s" @tap="goCreate">
          <view class="action-icon create-bg">
            <u-icon name="plus-circle-fill" :size="32" color="#FF7B7B" />
          </view>
          <view class="action-body">
            <text class="action-title">创建家庭</text>
            <text class="action-desc">创建家庭组，邀请家人加入</text>
          </view>
          <u-icon name="arrow-right" :size="18" color="#ccc" />
        </view>

        <view class="action-card slide-up tap-shrink" style="animation-delay: 0.16s" @tap="goJoin">
          <view class="action-icon join-bg">
            <u-icon name="account-fill" :size="32" color="#378add" />
          </view>
          <view class="action-body">
            <text class="action-title">加入家庭</text>
            <text class="action-desc">输入邀请码，加入已有家庭</text>
          </view>
          <u-icon name="arrow-right" :size="18" color="#ccc" />
        </view>
      </view>

      <view class="feature-list slide-up" style="animation-delay: 0.22s">
        <view class="feature-item">
          <u-icon name="checkmark-circle-fill" :size="20" color="#1d9e75" />
          <text class="feature-text">多人共享宝宝信息与提醒事项</text>
        </view>
        <view class="feature-item">
          <u-icon name="checkmark-circle-fill" :size="20" color="#1d9e75" />
          <text class="feature-text">实时同步操作记录，谁做了什么一目了然</text>
        </view>
        <view class="feature-item">
          <u-icon name="checkmark-circle-fill" :size="20" color="#1d9e75" />
          <text class="feature-text">设置身份：爸爸、妈妈、爷爷、奶奶、育儿阿姨等</text>
        </view>
        <view class="feature-item">
          <u-icon name="checkmark-circle-fill" :size="20" color="#1d9e75" />
          <text class="feature-text">家庭成员完成事项后，自动通知其他成员</text>
        </view>
      </view>
    </template>

    <!-- 有家庭 -->
    <template v-else-if="hasFamily">
      <!-- 家庭信息卡 -->
      <view class="family-header slide-up">
        <view class="family-name-row">
          <view class="family-icon">
            <u-icon name="home-fill" :size="28" color="#fff" />
          </view>
          <view class="family-meta">
            <text class="family-name">{{ familyName }}</text>
            <text class="family-info">{{ memberCount }} 位成员</text>
          </view>
        </view>
        <view class="family-actions">
          <view class="family-action-btn tap-feedback" @tap="goInvite">
            <u-icon name="plus-people-fill" :size="18" color="#FF7B7B" />
            <text class="action-btn-text">邀请</text>
          </view>
        </view>
      </view>

      <!-- 成员列表 -->
      <view class="section slide-up" style="animation-delay: 0.06s">
        <view class="section-header">
          <text class="section-title">家庭成员</text>
          <u-tag :text="`${memberCount}人`" type="primary" size="mini" shape="circle" plain />
        </view>
        <view class="member-list">
          <view v-for="member in members" :key="member.userId" class="member-item">
            <view class="member-avatar" :style="{ background: getRelationBg(member.relation) }">
              <image v-if="member.avatarUrl" :src="member.avatarUrl" mode="aspectFill" class="avatar-img" />
              <u-icon v-else :name="getRelationIcon(member.relation)" :size="28" :color="getRelationColor(member.relation)" />
            </view>
            <view class="member-info">
              <view class="member-name-row">
                <text class="member-name">{{ member.nickName }}</text>
                <u-tag v-if="member.role === 'owner'" text="创建者" type="warning" size="mini" shape="circle" />
                <u-tag v-else-if="member.role === 'admin'" text="管理员" type="primary" size="mini" shape="circle" plain />
              </view>
              <view class="member-relation-row">
                <view class="relation-chip" :style="{ background: getRelationBg(member.relation) }">
                  <u-icon :name="getRelationIcon(member.relation)" :size="12" :color="getRelationColor(member.relation)" />
                  <text class="relation-text" :style="{ color: getRelationColor(member.relation) }">{{ getRelationName(member.relation) }}</text>
                </view>
                <text class="member-joined">{{ formatJoinDate(member.joinedAt) }}加入</text>
              </view>
            </view>
            <!-- 操作按钮 -->
            <view v-if="canManage && member.role !== 'owner'" class="member-actions">
              <view class="member-action tap-shrink" @tap="onEditRelation(member)">
                <u-icon name="edit-pen" :size="18" color="#999" />
              </view>
              <view class="member-action tap-shrink" @tap="onRemoveMember(member)">
                <u-icon name="close" :size="18" color="#e24b4a" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 家庭设置 -->
      <view class="section slide-up" style="animation-delay: 0.12s">
        <view class="section-header">
          <text class="section-title">家庭设置</text>
        </view>
        <view class="settings-list">
          <view class="settings-item">
            <view class="settings-icon bell-bg">
              <u-icon name="bell-fill" :size="20" color="#ef9f27" />
            </view>
            <view class="settings-body">
              <text class="settings-label">操作通知</text>
              <text class="settings-desc">成员完成事项时通知其他人</text>
            </view>
            <u-switch v-model="notifyProxy" activeColor="#FF7B7B" size="20" />
          </view>
        </view>
      </view>

      <!-- 退出家庭 -->
      <view v-if="!isOwner" class="section slide-up" style="animation-delay: 0.18s">
        <view class="leave-btn tap-shrink" @tap="onLeaveFamily">
          <u-icon name="arrow-left" :size="18" color="#e24b4a" />
          <text class="leave-text">退出家庭</text>
        </view>
      </view>

      <view class="bottom-space" />
    </template>

    <!-- 加载中 -->
    <template v-else>
      <view class="loading-wrap">
        <u-icon name="loading" :size="32" color="#FF7B7B" />
        <text class="loading-text">加载中...</text>
      </view>
    </template>

    <!-- 创建家庭弹窗 -->
    <u-popup :show="showCreate" mode="center" :round="20" @close="showCreate = false">
      <view class="popup-content">
        <text class="popup-title">创建家庭</text>
        <view class="popup-input-wrap">
          <u-input v-model="createName" placeholder="输入家庭名称（如：小明一家）" border="surround" clearable />
        </view>
        <view class="popup-actions">
          <u-button text="取消" @click="showCreate = false" />
          <u-button text="创建" type="primary" :loading="creating" @click="doCreate" />
        </view>
      </view>
    </u-popup>

    <!-- 编辑身份弹窗 -->
    <u-popup :show="showEditRelation" mode="bottom" :round="20" @close="showEditRelation = false">
      <view class="relation-popup">
        <text class="popup-title">设置身份</text>
        <text class="popup-subtitle">{{ editingMember?.nickName }}</text>
        <view class="relation-grid">
          <view v-for="opt in relationOptions" :key="opt.value" class="relation-option tap-shrink"
            :class="{ active: editingRelation === opt.value }"
            @tap="editingRelation = opt.value">
            <view class="relation-opt-icon" :style="{ background: opt.bgColor }">
              <u-icon :name="opt.uIcon" :size="24" :color="opt.color" />
            </view>
            <text class="relation-opt-name">{{ opt.label }}</text>
          </view>
        </view>
        <view class="popup-actions">
          <u-button text="取消" @click="showEditRelation = false" />
          <u-button text="确认" type="primary" @click="doUpdateRelation" />
        </view>
      </view>
    </u-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { storeToRefs } from 'pinia';
import { useFamilyStore } from '@/stores/family';
import { useUserStore } from '@/stores/user';
import { FAMILY_RELATION_CONFIG, FAMILY_RELATION_OPTIONS } from '@/utils/constants';
import type { FamilyMember, FamilyRelation } from '@/types';

const familyStore = useFamilyStore();
const userStore = useUserStore();
const { family, members, hasFamily, familyName, memberCount, loading } = storeToRefs(familyStore);

const showCreate = ref(false);
const createName = ref('');
const creating = ref(false);
const showEditRelation = ref(false);
const editingMember = ref<FamilyMember | null>(null);
const editingRelation = ref<FamilyRelation>('father');

const relationOptions = FAMILY_RELATION_OPTIONS.map(opt => ({
  ...opt,
  bgColor: FAMILY_RELATION_CONFIG[opt.value].bgColor,
}));

const isOwner = computed(() => {
  if (!family.value || !userStore.user) return false;
  return family.value.ownerUserId === userStore.user._id;
});

const canManage = computed(() => {
  if (!family.value || !userStore.user) return false;
  const myMember = family.value.members.find(m => m.userId === userStore.user!._id);
  return myMember?.role === 'owner' || myMember?.role === 'admin';
});

const notifyProxy = computed({
  get: () => family.value?.settings?.notifyOnComplete ?? true,
  set: (val: boolean) => familyStore.updateSettings({ notifyOnComplete: val }),
});

onShow(() => {
  familyStore.loadFamily();
});

function getRelationName(relation: FamilyRelation) {
  return FAMILY_RELATION_CONFIG[relation]?.name || '其他';
}
function getRelationIcon(relation: FamilyRelation) {
  return FAMILY_RELATION_CONFIG[relation]?.uIcon || 'account-fill';
}
function getRelationColor(relation: FamilyRelation) {
  return FAMILY_RELATION_CONFIG[relation]?.color || '#999';
}
function getRelationBg(relation: FamilyRelation) {
  return FAMILY_RELATION_CONFIG[relation]?.bgColor || '#F5F5F5';
}

function formatJoinDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function goCreate() {
  createName.value = '';
  showCreate.value = true;
}

function goJoin() {
  uni.navigateTo({ url: '/pages/family/join' });
}

function goInvite() {
  uni.navigateTo({ url: '/pages/family/invite' });
}

async function doCreate() {
  if (!createName.value.trim()) {
    uni.showToast({ title: '请输入家庭名称', icon: 'none' });
    return;
  }
  creating.value = true;
  const ok = await familyStore.createFamily(createName.value.trim());
  creating.value = false;
  if (ok) {
    showCreate.value = false;
  }
}

function onEditRelation(member: FamilyMember) {
  editingMember.value = member;
  editingRelation.value = member.relation;
  showEditRelation.value = true;
}

async function doUpdateRelation() {
  if (!editingMember.value) return;
  const ok = await familyStore.updateMember(editingMember.value.userId, {
    relation: editingRelation.value,
  });
  if (ok) {
    showEditRelation.value = false;
  }
}

async function onRemoveMember(member: FamilyMember) {
  await familyStore.removeMember(member.userId);
}

async function onLeaveFamily() {
  const ok = await familyStore.leaveFamily();
  if (ok) {
    uni.navigateBack();
  }
}
</script>

<style lang="scss" scoped>
.page-family {
  min-height: 100vh;
  background: #f8f8f8;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

/* 无家庭状态 */
.empty-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 40rpx 48rpx;

  .hero-icon {
    width: 140rpx;
    height: 140rpx;
    border-radius: 36rpx;
    background: linear-gradient(135deg, #fff0f0, #ffe0e0);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 32rpx;
  }

  .hero-title {
    font-size: 38rpx;
    font-weight: 700;
    color: #2d2d2d;
    margin-bottom: 16rpx;
  }

  .hero-desc {
    font-size: 26rpx;
    color: #999;
    text-align: center;
    line-height: 1.6;
  }
}

.action-cards {
  margin-bottom: 40rpx;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  .action-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &.create-bg { background: linear-gradient(135deg, #fff0f0, #ffe0e0); }
    &.join-bg { background: linear-gradient(135deg, #e8f2fc, #d0e8fa); }
  }

  .action-body {
    flex: 1;

    .action-title {
      display: block;
      font-size: 32rpx;
      font-weight: 600;
      color: #2d2d2d;
    }

    .action-desc {
      display: block;
      font-size: 24rpx;
      color: #aaa;
      margin-top: 4rpx;
    }
  }
}

.feature-list {
  padding: 0 16rpx;

  .feature-item {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 20rpx;

    .feature-text {
      font-size: 26rpx;
      color: #666;
    }
  }
}

/* 有家庭状态 */
.family-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #ff7b7b, #ff9b9b);
  border-radius: 24rpx;
  padding: 36rpx 32rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(255, 123, 123, 0.25);

  .family-name-row {
    display: flex;
    align-items: center;
    gap: 20rpx;

    .family-icon {
      width: 80rpx;
      height: 80rpx;
      border-radius: 20rpx;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .family-meta {
      .family-name {
        display: block;
        font-size: 34rpx;
        font-weight: 700;
        color: #fff;
      }

      .family-info {
        display: block;
        font-size: 24rpx;
        color: rgba(255, 255, 255, 0.8);
        margin-top: 4rpx;
      }
    }
  }

  .family-actions {
    .family-action-btn {
      display: flex;
      align-items: center;
      gap: 6rpx;
      padding: 12rpx 24rpx;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 999rpx;

      .action-btn-text {
        font-size: 26rpx;
        color: #ff7b7b;
        font-weight: 600;
      }
    }
  }
}

.section {
  margin-bottom: 32rpx;

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16rpx;
    padding-left: 8rpx;

    .section-title {
      font-size: 28rpx;
      color: #999;
      font-weight: 500;
    }
  }
}

.member-list {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  .member-item {
    display: flex;
    align-items: center;
    gap: 20rpx;
    padding: 24rpx 32rpx;
    border-bottom: 1rpx solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }

    .member-avatar {
      width: 88rpx;
      height: 88rpx;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;

      .avatar-img {
        width: 100%;
        height: 100%;
      }
    }

    .member-info {
      flex: 1;

      .member-name-row {
        display: flex;
        align-items: center;
        gap: 12rpx;

        .member-name {
          font-size: 30rpx;
          font-weight: 600;
          color: #2d2d2d;
        }
      }

      .member-relation-row {
        display: flex;
        align-items: center;
        gap: 16rpx;
        margin-top: 8rpx;

        .relation-chip {
          display: flex;
          align-items: center;
          gap: 4rpx;
          padding: 4rpx 14rpx;
          border-radius: 999rpx;

          .relation-text {
            font-size: 22rpx;
            font-weight: 500;
          }
        }

        .member-joined {
          font-size: 22rpx;
          color: #ccc;
        }
      }
    }

    .member-actions {
      display: flex;
      gap: 16rpx;

      .member-action {
        width: 56rpx;
        height: 56rpx;
        border-radius: 50%;
        background: #f5f5f5;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  }
}

.settings-list {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  .settings-item {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding: 24rpx 32rpx;

    .settings-icon {
      width: 56rpx;
      height: 56rpx;
      border-radius: 14rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.bell-bg { background: #fef5e7; }
    }

    .settings-body {
      flex: 1;

      .settings-label {
        display: block;
        font-size: 30rpx;
        color: #2d2d2d;
      }

      .settings-desc {
        display: block;
        font-size: 22rpx;
        color: #aaa;
        margin-top: 2rpx;
      }
    }
  }
}

.leave-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  .leave-text {
    font-size: 30rpx;
    color: #e24b4a;
    font-weight: 500;
  }
}

/* 加载状态 */
.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  gap: 20rpx;

  .loading-text {
    font-size: 26rpx;
    color: #999;
  }
}

/* 弹窗 */
.popup-content {
  padding: 40rpx;
  width: 600rpx;

  .popup-title {
    display: block;
    font-size: 34rpx;
    font-weight: 700;
    color: #2d2d2d;
    margin-bottom: 24rpx;
    text-align: center;
  }

  .popup-input-wrap {
    margin-bottom: 32rpx;
  }

  .popup-actions {
    display: flex;
    gap: 20rpx;
  }
}

.relation-popup {
  padding: 40rpx;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));

  .popup-title {
    display: block;
    font-size: 34rpx;
    font-weight: 700;
    color: #2d2d2d;
    text-align: center;
  }

  .popup-subtitle {
    display: block;
    font-size: 26rpx;
    color: #999;
    text-align: center;
    margin-top: 8rpx;
    margin-bottom: 32rpx;
  }

  .relation-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 24rpx;
    margin-bottom: 32rpx;

    .relation-option {
      width: calc((100% - 48rpx) / 3);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12rpx;
      padding: 24rpx 0;
      border-radius: 20rpx;
      border: 2rpx solid transparent;
      background: #f9f9f9;

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
    }
  }

  .popup-actions {
    display: flex;
    gap: 20rpx;
  }
}

.bottom-space {
  height: 80rpx;
}
</style>
