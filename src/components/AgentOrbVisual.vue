<template>
  <div
    class="aurora-orb-container"
    :class="[stateClass, { 'is-active': active }]"
  >
    <!-- 外圈弥散彩色呼吸光晕 -->
    <div class="aurora-halo" aria-hidden="true"></div>

    <!-- 脉冲扩散波纹 (在运行或激活时触发) -->
    <div class="aurora-pulse-wave" aria-hidden="true"></div>

    <!-- 极光球体核心主体 -->
    <div class="aurora-sphere">
      <!-- 底层深度暗流 -->
      <div class="aurora-plasma plasma-primary"></div>
      <!-- 顶层高亮逆向流光 -->
      <div class="aurora-plasma plasma-secondary"></div>
      <!-- 状态专属色彩覆盖层 -->
      <div class="aurora-state-layer"></div>
      <!-- 3D 水晶高光与毛玻璃边缘反光 -->
      <div class="aurora-glass-glare"></div>
      <div class="aurora-rim-highlight"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { PageAgentDemoStatus } from "@/types/page-agent";

const props = defineProps<{
  state: PageAgentDemoStatus;
  paused: boolean;
  active: boolean;
}>();

const stateClass = computed(() => `status-${props.state}`);
</script>

<style scoped lang="scss">
.aurora-orb-container {
  position: absolute;
  inset: -12px;
  width: 80px;
  height: 80px;
  display: grid;
  place-items: center;
  pointer-events: none;
  contain: layout style;
  user-select: none;
}

/* 外围弥散光晕 (Halo Glow) */
.aurora-halo {
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    #00f2fe 0%,
    #4facfe 22%,
    #7f00ff 45%,
    #ff007f 68%,
    #ff9e00 85%,
    #00f2fe 100%
  );
  filter: blur(14px);
  opacity: 0.55;
  transform: scale(0.95);
  animation: aurora-spin 8s linear infinite;
  transition:
    opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

/* 脉冲扩散波纹 */
.aurora-pulse-wave {
  position: absolute;
  inset: 12px;
  border-radius: 50%;
  border: 1.5px solid rgba(127, 0, 255, 0.4);
  opacity: 0;
  pointer-events: none;
}

/* 水晶球体主体 */
.aurora-sphere {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow:
    0 8px 24px -4px rgba(15, 23, 42, 0.45),
    0 2px 6px 0 rgba(0, 0, 0, 0.25);
  transform: translateZ(0);
}

/* 极光流体层（双层反向旋转融合） */
.aurora-plasma {
  position: absolute;
  inset: -35%;
  border-radius: 44%;
  filter: blur(8px);
  mix-blend-mode: screen;
}

.plasma-primary {
  background: conic-gradient(
    from 180deg,
    #00f2fe 0%,
    #7f00ff 30%,
    #ff007f 60%,
    #ff8a00 85%,
    #00f2fe 100%
  );
  animation: aurora-spin 6s linear infinite;
  opacity: 0.92;
}

.plasma-secondary {
  background: radial-gradient(
    circle at 35% 30%,
    rgba(255, 255, 255, 0.8) 0%,
    #4facfe 35%,
    #7b2cbf 70%,
    transparent 90%
  );
  animation: aurora-spin-reverse 4.5s ease-in-out infinite alternate;
  opacity: 0.85;
}

/* 状态专用覆盖层 */
.aurora-state-layer {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.35s ease;
  mix-blend-mode: overlay;
}

/* 3D 顶部玻璃镜面高光弧 */
.aurora-glass-glare {
  position: absolute;
  top: 3px;
  left: 10px;
  right: 10px;
  height: 20px;
  border-radius: 50% 50% 45% 45%;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.75) 0%,
    rgba(255, 255, 255, 0.15) 60%,
    rgba(255, 255, 255, 0) 100%
  );
  pointer-events: none;
}

/* 1px 晶钻边缘高光 (Rim Light) */
.aurora-rim-highlight {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow:
    inset 0 0 0 1.2px rgba(255, 255, 255, 0.65),
    inset 0 -3px 8px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

/* ================= 状态与交互联动 ================= */

/* 激活或 Hover 时光晕增强 */
.aurora-orb-container.is-active .aurora-halo,
.aurora-orb-container:hover .aurora-halo {
  opacity: 0.85;
  transform: scale(1.1);
  filter: blur(18px);
}

/* 运行中 / 加载中状态 (加速旋转 + 脉冲扩散) */
.status-running .plasma-primary,
.status-loading .plasma-primary {
  animation-duration: 1.8s;
}

.status-running .plasma-secondary,
.status-loading .plasma-secondary {
  animation-duration: 1.4s;
}

.status-running .aurora-halo,
.status-loading .aurora-halo {
  animation-duration: 2.2s;
  opacity: 0.9;
  transform: scale(1.15);
}

.status-running .aurora-pulse-wave {
  animation: aurora-pulse 1.4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}

/* 成功状态（翠绿-青蓝极光） */
.status-completed .aurora-state-layer {
  opacity: 1;
  background: radial-gradient(
    circle,
    #00f5a0 0%,
    #00d9e9 70%,
    transparent 100%
  );
}
.status-completed .aurora-halo {
  background: conic-gradient(from 0deg, #00f5a0, #00d9e9, #67e8f9, #00f5a0);
}

/* 错误状态（珊瑚粉红极光） */
.status-error .aurora-state-layer {
  opacity: 1;
  background: radial-gradient(
    circle,
    #ff416c 0%,
    #ff4b2b 75%,
    transparent 100%
  );
}
.status-error .aurora-halo {
  background: conic-gradient(from 0deg, #ff416c, #ff4b2b, #ff758c, #ff416c);
}

/* 关键帧动画 */
@keyframes aurora-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes aurora-spin-reverse {
  0% {
    transform: rotate(360deg) scale(0.95);
  }
  100% {
    transform: rotate(0deg) scale(1.15);
  }
}

@keyframes aurora-pulse {
  0% {
    transform: scale(0.9);
    opacity: 0.85;
  }
  100% {
    transform: scale(1.65);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .aurora-halo,
  .plasma-primary,
  .plasma-secondary,
  .aurora-pulse-wave {
    animation: none !important;
  }
}
</style>
