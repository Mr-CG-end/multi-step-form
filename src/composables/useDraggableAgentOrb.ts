import { nextTick, onMounted, onUnmounted, ref, type Ref } from "vue";

const STORAGE_KEY = "multi-step-form-agent-orb-position-v1";
const ORB_SIZE = 56;
const SAFE_MARGIN = 14;
const DRAG_THRESHOLD = 6;
const TRAIL_DISTANCE = 7;
const POOL_SIZE = 28;
const AURORA_COLORS = [
  "rgba(0, 242, 254, 0.9)",   // Cyan
  "rgba(127, 0, 255, 0.9)",   // Violet
  "rgba(255, 0, 127, 0.9)",   // Magenta
  "rgba(79, 172, 254, 0.9)",  // Azure
  "rgba(255, 179, 0, 0.9)",   // Amber Gold
];

interface Point {
  x: number;
  y: number;
}

interface StoredPosition {
  version: 1;
  xRatio: number;
  yRatio: number;
}

export function useDraggableAgentOrb(
  orbRef: Ref<HTMLElement | null>,
  panelRef: Ref<HTMLElement | null>,
  trailLayerRef: Ref<HTMLElement | null>,
  isOpen: Ref<boolean>,
  onActivate: () => void,
) {
  const isDragging = ref(false);
  const isPageHidden = ref(false);
  const panelPlacement = ref("left");

  let position: Point = { x: 0, y: 0 };
  let pointerId: number | null = null;
  let startPointer: Point = { x: 0, y: 0 };
  let startPosition: Point = { x: 0, y: 0 };
  let lastTrailPoint: Point = { x: 0, y: 0 };
  let previousPointer: Point = { x: 0, y: 0 };
  let frameId = 0;
  let pendingPosition: Point | null = null;
  let particleIndex = 0;
  let normalizedPosition: StoredPosition = { version: 1, xRatio: 1, yRatio: 0.82 };
  let panelSize: { width: number; height: number } | null = null;
  const particles: HTMLElement[] = [];

  const viewportBounds = () => {
    const viewport = window.visualViewport;
    const minX = (viewport?.offsetLeft || 0) + SAFE_MARGIN;
    const minY = (viewport?.offsetTop || 0) + SAFE_MARGIN;
    const width = viewport?.width || window.innerWidth;
    const height = viewport?.height || window.innerHeight;
    return {
      minX,
      minY,
      maxX: Math.max(minX, minX + width - ORB_SIZE - SAFE_MARGIN * 2),
      maxY: Math.max(minY, minY + height - ORB_SIZE - SAFE_MARGIN * 2),
      width,
      height,
    };
  };

  const clampPosition = (point: Point): Point => {
    const { minX, minY, maxX, maxY } = viewportBounds();
    return {
      x: Math.min(maxX, Math.max(minX, point.x)),
      y: Math.min(maxY, Math.max(minY, point.y)),
    };
  };

  const applyPosition = (next: Point) => {
    position = clampPosition(next);
    if (orbRef.value) {
      orbRef.value.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
    }
    updatePanelPosition(false);
  };

  const schedulePosition = (next: Point) => {
    pendingPosition = next;
    if (frameId) return;
    frameId = window.requestAnimationFrame(() => {
      frameId = 0;
      if (pendingPosition) applyPosition(pendingPosition);
      pendingPosition = null;
    });
  };

  const savePosition = () => {
    const { minX, minY, maxX, maxY } = viewportBounds();
    const widthRange = Math.max(1, maxX - minX);
    const heightRange = Math.max(1, maxY - minY);
    const stored: StoredPosition = {
      version: 1,
      xRatio: (position.x - minX) / widthRange,
      yRatio: (position.y - minY) / heightRange,
    };
    normalizedPosition = stored;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Position persistence is optional.
    }
  };

  const restorePosition = () => {
    const { minX, minY, maxX, maxY } = viewportBounds();
    let xRatio = 1;
    let yRatio = 0.82;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredPosition>;
        if (
          parsed.version === 1 &&
          Number.isFinite(parsed.xRatio) &&
          Number.isFinite(parsed.yRatio) &&
          (parsed.xRatio as number) >= 0 && (parsed.xRatio as number) <= 1 &&
          (parsed.yRatio as number) >= 0 && (parsed.yRatio as number) <= 1
        ) {
          xRatio = Math.min(1, Math.max(0, parsed.xRatio as number));
          yRatio = Math.min(1, Math.max(0, parsed.yRatio as number));
        }
      }
    } catch {
      // Invalid data falls back to the right-hand default.
    }
    normalizedPosition = { version: 1, xRatio, yRatio };
    applyPosition({
      x: minX + (maxX - minX) * xRatio,
      y: minY + (maxY - minY) * yRatio,
    });
  };

  const createParticlePool = () => {
    const layer = trailLayerRef.value;
    if (!layer || particles.length > 0) return;
    for (let index = 0; index < POOL_SIZE; index += 1) {
      const particle = document.createElement("span");
      particle.className = "orb-smoke-particle";
      particle.addEventListener("animationend", () => {
        particle.classList.remove("is-active");
      });
      layer.appendChild(particle);
      particles.push(particle);
    }
  };

  const recycleParticles = () => {
    particles.forEach((particle) => particle.classList.remove("is-active"));
  };

  const emitParticle = (point: Point, velocity: Point) => {
    if (
      particles.length === 0 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const particle = particles[particleIndex % particles.length];
    particleIndex += 1;
    const seed = particleIndex * 31;
    const color = AURORA_COLORS[particleIndex % AURORA_COLORS.length];
    const size = 6 + (seed % 10);
    const angle = ((seed % 360) * Math.PI) / 180;
    const spread = (seed % 10) - 5;
    const speed = Math.hypot(velocity.x, velocity.y);
    const damp = Math.min(1.4, Math.max(0.5, speed * 0.07));
    const duration = 380 + (seed % 160);

    particle.classList.remove("is-active");
    void particle.offsetWidth;
    particle.style.setProperty("--particle-x", `${point.x}px`);
    particle.style.setProperty("--particle-y", `${point.y}px`);
    particle.style.setProperty("--particle-color", color);
    particle.style.setProperty("--particle-size", `${size}px`);
    particle.style.setProperty(
      "--particle-dx",
      `${-velocity.x * damp + Math.cos(angle) * spread}px`,
    );
    particle.style.setProperty(
      "--particle-dy",
      `${-velocity.y * damp + Math.sin(angle) * spread}px`,
    );
    particle.style.setProperty("--particle-duration", `${duration}ms`);
    particle.classList.add("is-active");
  };

  function updatePanelPosition(measure = true): void {
    const panel = panelRef.value;
    if (!panel || !isOpen.value) return;

    const gap = 14;
    const viewport = viewportBounds();
    panel.style.maxHeight = `${Math.max(0, viewport.height - SAFE_MARGIN * 2)}px`;
    if (measure || !panelSize) {
      panelSize = {
        width: panel.offsetWidth || Math.min(360, viewport.width - 24),
        height: panel.offsetHeight || Math.min(520, viewport.height - 24),
      };
    }
    const panelWidth = panelSize.width;
    const panelHeight = panelSize.height;
    const orbCenter = {
      x: position.x + ORB_SIZE / 2,
      y: position.y + ORB_SIZE / 2,
    };
    const spaces = {
      left: position.x - viewport.minX,
      right: viewport.maxX - position.x,
      top: position.y - viewport.minY,
      bottom: viewport.maxY - position.y,
    };

    const candidates = [
      { side: "left", fits: spaces.left >= panelWidth + gap, space: spaces.left },
      { side: "right", fits: spaces.right >= panelWidth + gap, space: spaces.right },
      { side: "top", fits: spaces.top >= panelHeight + gap, space: spaces.top },
      { side: "bottom", fits: spaces.bottom >= panelHeight + gap, space: spaces.bottom },
    ];
    const selected =
      candidates.find((candidate) => candidate.fits) ||
      [...candidates].sort((a, b) => b.space - a.space)[0];
    panelPlacement.value = selected.side;

    let left = orbCenter.x - panelWidth / 2;
    let top = orbCenter.y - panelHeight / 2;
    if (selected.side === "left") left = position.x - panelWidth - gap;
    if (selected.side === "right") left = position.x + ORB_SIZE + gap;
    if (selected.side === "top") top = position.y - panelHeight - gap;
    if (selected.side === "bottom") top = position.y + ORB_SIZE + gap;

    left = Math.max(
      viewport.minX,
      Math.min(
        viewport.minX + viewport.width - panelWidth - SAFE_MARGIN * 2,
        left,
      ),
    );
    top = Math.max(
      viewport.minY,
      Math.min(
        viewport.minY + viewport.height - panelHeight - SAFE_MARGIN * 2,
        top,
      ),
    );
    panel.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    panel.dataset.placement = selected.side;
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || pointerId !== null) return;
    pointerId = event.pointerId;
    startPointer = { x: event.clientX, y: event.clientY };
    previousPointer = { ...startPointer };
    lastTrailPoint = { ...startPointer };
    startPosition = { ...position };
    isDragging.value = false;
    orbRef.value?.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return;
    const dx = event.clientX - startPointer.x;
    const dy = event.clientY - startPointer.y;
    if (!isDragging.value && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      isDragging.value = true;
      createParticlePool();
    }
    if (!isDragging.value) return;
    event.preventDefault();
    schedulePosition({ x: startPosition.x + dx, y: startPosition.y + dy });

    const trailDistance = Math.hypot(
      event.clientX - lastTrailPoint.x,
      event.clientY - lastTrailPoint.y,
    );
    if (trailDistance >= TRAIL_DISTANCE) {
      emitParticle(
        { x: event.clientX, y: event.clientY },
        {
          x: event.clientX - previousPointer.x,
          y: event.clientY - previousPointer.y,
        },
      );
      lastTrailPoint = { x: event.clientX, y: event.clientY };
    }
    previousPointer = { x: event.clientX, y: event.clientY };
  };

  const finishPointer = (event: PointerEvent, cancelled = false) => {
    if (pointerId !== event.pointerId) return;
    orbRef.value?.releasePointerCapture(event.pointerId);
    const dragged = isDragging.value;
    pointerId = null;
    if (pendingPosition) {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      applyPosition(pendingPosition);
      pendingPosition = null;
    }
    recycleParticles();
    if (dragged) {
      savePosition();
      window.setTimeout(() => {
        isDragging.value = false;
      }, 0);
    } else if (!cancelled) {
      onActivate();
    }
  };

  const cancelPointer = (event: PointerEvent) => finishPointer(event, true);

  const onResize = () => {
    panelSize = null;
    const { minX, minY, maxX, maxY } = viewportBounds();
    applyPosition({
      x: minX + (maxX - minX) * normalizedPosition.xRatio,
      y: minY + (maxY - minY) * normalizedPosition.yRatio,
    });
  };

  const onVisibilityChange = () => {
    isPageHidden.value = document.hidden;
  };

  const refreshPanelPosition = async () => {
    await nextTick();
    panelSize = null;
    updatePanelPosition();
  };

  onMounted(() => {
    onVisibilityChange();
    restorePosition();
    createParticlePool();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onResize);
    document.addEventListener("visibilitychange", onVisibilityChange);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", onResize);
    window.visualViewport?.removeEventListener("resize", onResize);
    window.visualViewport?.removeEventListener("scroll", onResize);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (frameId) window.cancelAnimationFrame(frameId);
    particles.forEach((particle) => particle.remove());
    particles.length = 0;
  });

  return {
    isDragging,
    isPageHidden,
    panelPlacement,
    onPointerDown,
    onPointerMove,
    onPointerUp: finishPointer,
    onPointerCancel: cancelPointer,
    refreshPanelPosition,
  };
}
