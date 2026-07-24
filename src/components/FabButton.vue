<template>
  <view
    v-if="hasBaby"
    class="fab"
    :class="{
      'fab-is-dragging': isDragging,
      'fab-is-snapping': isSnapping,
      'fab-is-tapped': isTapped,
      'fab-no-entry': !showEntryAnim,
    }"
    :style="fabStyle"
    @touchstart="onTouchStart"
    @touchmove.stop.prevent="onTouchMove"
    @touchend="onTouchEnd"
  >
    <u-icon name="plus" :size="28" color="#fff" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useBabyStore } from '@/stores/baby';

const props = withDefaults(defineProps<{
  /** 点击导航路径，默认添加事项页 */
  to?: string;
}>(), {
  to: '/pages/task/edit',
});

const emit = defineEmits<{
  tap: [];
}>();

const babyStore = useBabyStore();
const { hasBaby } = storeToRefs(babyStore);

// ============ 定位参数 ============
const FAB_SIZE = 52; // 52px = 104rpx，uni-app 下 touch 坐标用 px
const EDGE_MARGIN = 20; // 边距 20px = 40rpx
const DRAG_THRESHOLD = 8; // 移动超过 8px 才算拖拽

const systemInfo = uni.getSystemInfoSync();

// 同步读取缓存位置，避免 onMounted 异步导致的默认位置闪现
function loadSavedPosition(): { x: number; y: number } | null {
  try {
    const saved = uni.getStorageSync('fab_position');
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
      return { x: saved.x, y: saved.y };
    }
  } catch (_) { /* ignore */ }
  return null;
}

const savedPos = loadSavedPosition();
const posX = ref<number>(savedPos ? savedPos.x : -1); // -1 表示使用 CSS 默认位置
const posY = ref<number>(savedPos ? savedPos.y : -1);

// 有缓存位置时跳过入场动画，避免页面切换时按钮跳动
const showEntryAnim = ref(!savedPos);

// ============ 拖拽状态 ============
const isDragging = ref(false);
const isSnapping = ref(false);
const isTapped = ref(false);
let startTouchX = 0;
let startTouchY = 0;
let startFABX = 0;
let startFABY = 0;
let hasMoved = false;

// 动态 style
const fabStyle = computed(() => {
  const style: Record<string, string> = {};
  if (posX.value >= 0) style.left = posX.value + 'px';
  if (posY.value >= 0) style.top = posY.value + 'px';
  if (posX.value < 0) style.right = EDGE_MARGIN + 'px';
  if (posY.value < 0) style.bottom = '200rpx';
  return style;
});

// 获取移动边界
function getBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
  const screenW = systemInfo.windowWidth;
  const screenH = systemInfo.windowHeight;
  return {
    minX: EDGE_MARGIN,
    maxX: screenW - FAB_SIZE - EDGE_MARGIN,
    minY: EDGE_MARGIN,
    maxY: screenH - FAB_SIZE - EDGE_MARGIN,
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ============ 触摸事件 ============
function onTouchStart(e: any) {
  isDragging.value = false;
  hasMoved = false;
  const touch = e.touches[0];
  startTouchX = touch.clientX;
  startTouchY = touch.clientY;
  startFABX = posX.value;
  startFABY = posY.value;
}

function onTouchMove(e: any) {
  const touch = e.touches[0];
  const dx = touch.clientX - startTouchX;
  const dy = touch.clientY - startTouchY;

  // 超过阈值才开始拖拽
  if (!hasMoved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
  hasMoved = true;
  isDragging.value = true;

  // 初始位置为默认值时，根据 CSS 推算实际像素位置
  if (startFABX < 0 || startFABY < 0) {
    const screenW = systemInfo.windowWidth;
    const screenH = systemInfo.windowHeight;
    // CSS: right: 40rpx(20px), bottom: 200rpx(100px)
    startFABX = screenW - FAB_SIZE - EDGE_MARGIN;
    startFABY = screenH - FAB_SIZE - 100;
  }

  const bounds = getBounds();
  posX.value = clamp(startFABX + dx, bounds.minX, bounds.maxX);
  posY.value = clamp(startFABY + dy, bounds.minY, bounds.maxY);
}

function onTouchEnd() {
  isDragging.value = false;

  if (!hasMoved) {
    // 单击：导航 + 按压反馈
    isTapped.value = true;
    setTimeout(() => { isTapped.value = false; }, 200);
    uni.navigateTo({ url: props.to });
    emit('tap');
    return;
  }

  // 计算吸附目标位置
  const screenW = systemInfo.windowWidth;
  const centerX = screenW / 2;
  const bounds = getBounds();
  const snapX = posX.value < centerX ? bounds.minX : bounds.maxX;

  // 开启吸附过渡动画
  isSnapping.value = true;
  nextTick(() => {
    posX.value = snapX;
    // 保存位置
    try {
      uni.setStorageSync('fab_position', { x: posX.value, y: posY.value });
    } catch (_) { /* ignore */ }
    // 动画结束后清除状态
    setTimeout(() => { isSnapping.value = false; }, 450);
  });
}
</script>

<style lang="scss" scoped>
.fab {
  position: fixed;
  z-index: 999;
  width: 104rpx;
  height: 104rpx;
  background: linear-gradient(135deg, #ff7b7b, #ff6464);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 28rpx rgba(255, 123, 123, 0.45);
  // 默认不发 transition 给位置，避免拖拽延迟和初始定位跳动
  transition: opacity 0.2s, box-shadow 0.35s, transform 0.25s ease;

  animation:
    fab-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both,
    fab-pulse 3s 2s ease-in-out infinite;

  // 页面切换时跳过入场动画，位置直接到位
  &.fab-no-entry {
    animation: fab-pulse 3s 2s ease-in-out infinite;
  }

  // ===== 拖拽中：放大 + 阴影加深 =====
  &.fab-is-dragging {
    transform: scale(1.32);
    box-shadow: 0 16rpx 42rpx rgba(255, 123, 123, 0.5);
    transition: none;
    animation: fab-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; // 只保留入场
  }

  // ===== 吸附动画：弹性缓动滑动 =====
  &.fab-is-snapping {
    transition:
      left 0.4s cubic-bezier(0.22, 1, 0.36, 1),
      top 0.4s cubic-bezier(0.22, 1, 0.36, 1),
      transform 0.3s ease;
  }

  // ===== 点击反馈：缩小弹回 =====
  &.fab-is-tapped {
    transform: scale(0.88);
    transition: transform 0.12s ease;
  }
}

// ===== 入场动画 =====
@keyframes fab-in {
  from {
    opacity: 0;
    transform: scale(0.4) rotate(-45deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

// ===== 呼吸脉冲 =====
@keyframes fab-pulse {
  0%,
  100% {
    transform: scale(.95);
  }
  50% {
    transform: scale(1.04);
  }
}
</style>
