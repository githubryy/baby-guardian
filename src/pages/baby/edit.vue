<template>
  <view class="page-baby-edit">
    <view class="form-card">
      <!-- 头像 -->
      <view class="avatar-section" @tap="chooseAvatar">
        <view class="avatar" :style="{ background: avatarBg }">
          <image v-if="form.avatarUrl" :src="form.avatarUrl" mode="aspectFill" class="avatar-img" />
          <u-icon v-else name="account-fill" :size="56" :color="avatarIconColor" />
        </view>
        <view class="avatar-tip-wrap">
          <u-icon name="photo-fill" :size="14" color="#FF7B7B" />
          <text class="avatar-tip">点击设置头像</text>
        </view>
      </view>

      <!-- 姓名 -->
      <view class="form-item">
        <text class="form-label">宝宝昵称</text>
        <u-input v-model="form.name" placeholder="请输入宝宝昵称" border="surround"
          :customStyle="{ height: '80rpx' }" maxlength="20" />
      </view>

      <!-- 性别 -->
      <view class="form-item">
        <text class="form-label">性别</text>
        <view class="gender-picker">
          <view class="gender-option" :class="{ active: form.gender === 'male' }"
            @tap="form.gender = 'male'">
            <u-icon name="man" :size="28" :color="form.gender === 'male' ? '#378add' : '#999'" />
            <text class="gender-text" :class="{ active: form.gender === 'male' }">男宝</text>
          </view>
          <view class="gender-option" :class="{ active: form.gender === 'female' }"
            @tap="form.gender = 'female'">
            <u-icon name="woman" :size="28" :color="form.gender === 'female' ? '#FF7B7B' : '#999'" />
            <text class="gender-text" :class="{ active: form.gender === 'female' }">女宝</text>
          </view>
        </view>
      </view>

      <!-- 出生日期 -->
      <view class="form-item">
        <text class="form-label">出生日期</text>
        <picker mode="date" :value="form.birthday" :end="today" @change="onDateChange">
          <view class="form-picker">
            <view class="picker-left">
              <u-icon name="calendar" :size="16" color="#FF7B7B" />
              <text :class="{ placeholder: !form.birthday }">
                {{ form.birthday || '请选择出生日期' }}
              </text>
            </view>
            <u-icon name="arrow-right" :size="14" color="#ccc" />
          </view>
        </picker>
      </view>

      <!-- 早产儿 -->
      <view class="form-item">
        <view class="switch-row">
          <view class="switch-label">
            <text class="form-label">早产儿</text>
            <text class="form-hint">早产宝宝可设置预产期校正</text>
          </view>
          <u-switch v-model="form.isPremature" activeColor="#FF7B7B" size="40" />
        </view>
      </view>

      <!-- 预产期 (早产儿) -->
      <view v-if="form.isPremature" class="form-item">
        <text class="form-label">预产期</text>
        <picker mode="date" :value="form.dueDate" :end="today" @change="onDueDateChange">
          <view class="form-picker">
            <view class="picker-left">
              <u-icon name="calendar" :size="16" color="#FF7B7B" />
              <text :class="{ placeholder: !form.dueDate }">
                {{ form.dueDate || '请选择预产期' }}
              </text>
            </view>
            <u-icon name="arrow-right" :size="14" color="#ccc" />
          </view>
        </picker>
      </view>

      <!-- 备注 -->
      <view class="form-item">
        <text class="form-label">备注</text>
        <u-textarea v-model="form.remark" placeholder="过敏信息、特殊注意事项等"
          :maxlength="200" :autoHeight="true" border="surround" count />
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-area">
      <u-button :text="isEdit ? '保存修改' : '添加宝宝'" type="error" shape="circle"
        :loading="saving" :disabled="saving"
        :customStyle="{ height: '88rpx', fontSize: '32rpx', fontWeight: '600', marginBottom: '16rpx', background: saving ? '' : 'linear-gradient(135deg, #FF7B7B, #FF6464)', boxShadow: saving ? 'none' : '0 8rpx 24rpx rgba(255, 123, 123, 0.35)' }"
        @click="onSave" />
      <u-button v-if="isEdit" text="删除宝宝" shape="circle" plain type="error"
        :customStyle="{ height: '88rpx', fontSize: '30rpx', background: '#FDEAEA' }"
        @click="onDelete" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useBabyStore } from '@/stores/baby';
import { today, calcAge } from '@/utils/time';
import type { BabyGender } from '@/types';

const babyStore = useBabyStore();

const isEdit = ref(false);
const editId = ref('');
const saving = ref(false);

const form = ref({
  name: '',
  gender: 'unknown' as BabyGender,
  birthday: '',
  isPremature: false,
  dueDate: '',
  remark: '',
  avatarUrl: '',
});

const avatarBg = computed(() => {
  if (form.value.gender === 'male') return '#E8F2FC';
  if (form.value.gender === 'female') return '#FFF0F0';
  return '#F5F5F5';
});

const avatarIconColor = computed(() => {
  if (form.value.gender === 'male') return '#378add';
  if (form.value.gender === 'female') return '#FF7B7B';
  return '#999';
});

onLoad((options) => {
  console.log('options', options);
  if (options?.id) {
    isEdit.value = true;
    editId.value = options.id;
    loadBabyDetail();
  }
});

function loadBabyDetail() {
  const baby = babyStore.babyList.find((b) => b._id === editId.value);
  if (baby) {
    form.value = {
      name: baby.name,
      gender: baby.gender,
      birthday: baby.birthday.split('T')[0],
      isPremature: baby.isPremature,
      dueDate: baby.dueDate?.split('T')[0] || '',
      remark: baby.remark || '',
      avatarUrl: baby.avatarUrl || '',
    };
    uni.setNavigationBarTitle({ title: '编辑宝宝' });
  }
}

function onDateChange(e: any) {
  form.value.birthday = e.detail.value;
}

function onDueDateChange(e: any) {
  form.value.dueDate = e.detail.value;
}

function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: (res) => {
      uploadAvatar(res.tempFilePaths[0]);
    },
  });
}

async function uploadAvatar(tempPath: string) {
  try {
    uni.showLoading({ title: '上传中...' });
    const cloudPath = `baby-avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const uploadRes = await wx.cloud.uploadFile({
      cloudPath,
      filePath: tempPath,
    });
    form.value.avatarUrl = uploadRes.fileID;
  } catch (err) {
    console.error('[头像上传失败]', err);
    uni.showToast({ title: '头像上传失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
}

async function onSave() {
  if (saving.value) return;
  if (!form.value.name.trim()) {
    uni.showToast({ title: '请输入宝宝昵称', icon: 'none' });
    return;
  }
  if (!form.value.birthday) {
    uni.showToast({ title: '请选择出生日期', icon: 'none' });
    return;
  }
  if (form.value.isPremature && !form.value.dueDate) {
    uni.showToast({ title: '早产儿请填写预产期', icon: 'none' });
    return;
  }

  saving.value = true;
  try {
    const data = {
      name: form.value.name.trim(),
      gender: form.value.gender,
      birthday: new Date(form.value.birthday).toISOString(),
      isPremature: form.value.isPremature,
      dueDate: form.value.dueDate ? new Date(form.value.dueDate).toISOString() : undefined,
      remark: form.value.remark.trim() || undefined,
      avatarUrl: form.value.avatarUrl || undefined,
    };

    if (isEdit.value) {
      const ok = await babyStore.updateBaby(editId.value, data);
      if (ok) {
        uni.showToast({ title: '已保存', icon: 'success' });
        setTimeout(() => uni.navigateBack(), 600);
      }
    } else {
      const ok = await babyStore.addBaby(data);
      if (ok) {
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
      content: '删除后不可恢复，确定要删除此宝宝信息吗？',
      confirmColor: '#FF7B7B',
      success: (res) => resolve(!!res.confirm),
    });
  });
  if (!confirmed) return;

  const ok = await babyStore.deleteBaby(editId.value);
  if (ok) uni.navigateBack();
}
</script>

<style lang="scss" scoped>
.page-baby-edit {
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

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 0;
  margin-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;

  .avatar {
    width: 140rpx;
    height: 140rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16rpx;
    overflow: hidden;

    .avatar-img {
      width: 100%;
      height: 100%;
    }
  }

  .avatar-tip-wrap {
    display: flex;
    align-items: center;
    gap: 6rpx;

    .avatar-tip {
      font-size: 24rpx;
      color: #ff7b7b;
    }
  }
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

  .form-hint {
    font-size: 22rpx;
    color: #aaa;
    margin-top: 4rpx;
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

    .placeholder {
      color: #ccc;
    }
  }
}

.gender-picker {
  display: flex;
  gap: 24rpx;

  .gender-option {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    height: 88rpx;
    background: #f5f5f5;
    border-radius: 16rpx;
    border: 2rpx solid transparent;

    .gender-text {
      font-size: 28rpx;
      color: #666;

      &.active {
        font-weight: 600;
      }
    }

    &.active {
      background: #fff0f0;
      border-color: #ff7b7b;

      .gender-text {
        color: #ff7b7b;
      }
    }
  }
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .switch-label {
    flex: 1;
  }
}

.action-area {
  position: fixed;
  z-index: 1000;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.04);
}
</style>
