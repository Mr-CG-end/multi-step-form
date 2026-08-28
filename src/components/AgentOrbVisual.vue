<template>
  <canvas ref="canvasRef" class="orb-visual" aria-hidden="true"></canvas>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import type { PageAgentDemoStatus } from "@/types/page-agent";

const props = defineProps<{
  state: PageAgentDemoStatus;
  paused: boolean;
  active: boolean;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const SIZE = 96;
const CENTER = SIZE / 2;
const TAU = Math.PI * 2;
let context: CanvasRenderingContext2D | null = null;
let motionQuery: MediaQueryList | null = null;
let frame = 0;
let previousTime = 0;
let elapsed = 0;
let stateStartedAt = 0;

// A small, bounded canvas lets the outline itself deform without updating Vue
// state or repainting the surrounding page. All contours share the same flow.
function contour(radius: number, amplitude: number, phase = 0): Path2D {
  const path = new Path2D();
  for (let index = 0; index <= 96; index += 1) {
    const angle = (index / 96) * TAU;
    const wave =
      Math.sin(angle * 3 + elapsed * 1.4 + phase) * 0.56 +
      Math.sin(angle * 5 - elapsed * 1.05 + phase * 0.7) * 0.29 +
      Math.cos(angle * 2 + elapsed * 0.75 - phase) * 0.15;
    const distance = radius + wave * amplitude;
    const x = CENTER + Math.cos(angle) * distance;
    const y = CENTER + Math.sin(angle) * distance;
    if (index === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();
  return path;
}

function draw(): void {
  const ctx = context;
  if (!ctx) return;
  const reduced = motionQuery?.matches;
  const running = props.state === "running";
  const loading = props.state === "loading";
  const age = elapsed - stateStartedAt;
  const amplitude = reduced ? 0 : running ? 5.4 : loading ? 4.6 : 3.7;
  const pulse = props.state === "completed" && age < 0.8
    ? Math.sin((age / 0.8) * Math.PI) * 1.7
    : 0;
  const radius = (props.active ? 29.5 : 30.5) + pulse;
  const error = props.state === "error";

  ctx.clearRect(0, 0, SIZE, SIZE);
  const edge = ctx.createLinearGradient(16, 14, 78, 84);
  edge.addColorStop(0, error ? "#c78491" : "#96d9ed");
  edge.addColorStop(0.38, error ? "#b9697e" : "#418bc1");
  edge.addColorStop(0.7, error ? "#b9697e" : "#7879b9");
  edge.addColorStop(1, error ? "#c78491" : "#67b9d3");

  // These are close, undulating ribbons, not expanding circular ripples.
  const ribbons = [
    { radius: radius + 5.2, phase: 1.7, alpha: 0.19, width: 1.1 },
    { radius: radius + 2.7, phase: -1.2, alpha: 0.48, width: 1.35 },
  ];
  for (const ribbon of ribbons) {
    const path = contour(ribbon.radius, amplitude * 1.16, ribbon.phase);
    ctx.globalAlpha = ribbon.alpha;
    ctx.fillStyle = edge;
    ctx.fill(path);
    ctx.strokeStyle = edge;
    ctx.lineWidth = ribbon.width;
    ctx.stroke(path);
  }
  ctx.globalAlpha = 1;

  const body = contour(radius, amplitude);
  const fill = ctx.createRadialGradient(36, 26, 3, 48, 52, 40);
  fill.addColorStop(0, "#346f9e");
  fill.addColorStop(0.45, "#144976");
  fill.addColorStop(1, "#082a54");
  ctx.save();
  ctx.shadowColor = "rgba(2, 41, 90, 0.2)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = fill;
  ctx.fill(body);
  ctx.restore();

  ctx.save();
  ctx.clip(body);
  const lightX = 42 + Math.cos(elapsed * 0.8) * 11;
  const lightY = 36 + Math.sin(elapsed * 0.65) * 9;
  const light = ctx.createRadialGradient(lightX, lightY, 1, lightX, lightY, 32);
  light.addColorStop(0, "rgba(148, 224, 239, 0.48)");
  light.addColorStop(0.52, "rgba(106, 163, 215, 0.2)");
  light.addColorStop(1, "rgba(106, 163, 215, 0)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.restore();

  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.65;
  ctx.stroke(body);
  ctx.globalAlpha = 0.36;
  ctx.strokeStyle = "#d6f1f8";
  ctx.lineWidth = 0.65;
  ctx.stroke(contour(radius - 2, amplitude * 0.86, 0.3));
  ctx.globalAlpha = 1;
}

function tick(time: number): void {
  frame = 0;
  if (props.paused || motionQuery?.matches) return;
  if (!previousTime) previousTime = time;
  const delta = time - previousTime;
  // 30 fps is ample for this slow liquid outline; the hit target stays fixed.
  if (delta >= 1000 / 30) {
    const speed = props.state === "running" ? 1.65 : props.state === "stopped" ? 0.6 : 1;
    elapsed += Math.min(delta, 60) / 1000 * speed;
    previousTime = time;
    draw();
  }
  frame = requestAnimationFrame(tick);
}

function syncMotion(): void {
  cancelAnimationFrame(frame);
  frame = 0;
  previousTime = 0;
  draw();
  if (!props.paused && !motionQuery?.matches) frame = requestAnimationFrame(tick);
}

watch(() => props.state, () => {
  stateStartedAt = elapsed;
  syncMotion();
});
watch(() => [props.paused, props.active], syncMotion);

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = SIZE * ratio;
  canvas.height = SIZE * ratio;
  context = canvas.getContext("2d");
  context?.scale(ratio, ratio);
  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  motionQuery.addEventListener("change", syncMotion);
  syncMotion();
});

onUnmounted(() => {
  cancelAnimationFrame(frame);
  motionQuery?.removeEventListener("change", syncMotion);
  context = null;
});
</script>

<style scoped>
.orb-visual {
  position: absolute;
  inset: -14px;
  width: 84px;
  height: 84px;
  pointer-events: none;
}
</style>
