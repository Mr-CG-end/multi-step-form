import { nextTick, onMounted, onUnmounted, ref, type Ref } from "vue";

const STORAGE_KEY = "multi-step-form-agent-orb-position-v1";
const ORB_SIZE = 56;
const SAFE_MARGIN = 14;
const DRAG_THRESHOLD = 6;

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
  isOpen: Ref<boolean>,
  onActivate: () => void,
  guideRef?: Ref<HTMLElement | null>,
) {
  const isDragging = ref(false);
  const isPageHidden = ref(false);
  const panelPlacement = ref("left");

  let position: Point = { x: 0, y: 0 };
  let pointerId: number | null = null;
  let startPointer: Point = { x: 0, y: 0 };
  let startPosition: Point = { x: 0, y: 0 };
  let frameId = 0;
  let pendingPosition: Point | null = null;
  let normalizedPosition: StoredPosition = {
    version: 1,
    xRatio: 1,
    yRatio: 0.82,
  };
  let panelSize: { width: number; height: number } | null = null;

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
    updateGuidePosition();
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
          (parsed.xRatio as number) >= 0 &&
          (parsed.xRatio as number) <= 1 &&
          (parsed.yRatio as number) >= 0 &&
          (parsed.yRatio as number) <= 1
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

  function updatePanelPosition(measure = true): void {
    const panel = panelRef.value;
    if (!panel || !isOpen.value) return;

    const gap = 14;
    const viewport = viewportBounds();
    panel.style.maxHeight = `${Math.max(
      0,
      viewport.height - SAFE_MARGIN * 2,
    )}px`;
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
      {
        side: "left",
        fits: spaces.left >= panelWidth + gap,
        space: spaces.left,
      },
      {
        side: "right",
        fits: spaces.right >= panelWidth + gap,
        space: spaces.right,
      },
      { side: "top", fits: spaces.top >= panelHeight + gap, space: spaces.top },
      {
        side: "bottom",
        fits: spaces.bottom >= panelHeight + gap,
        space: spaces.bottom,
      },
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

  function updateGuidePosition(): void {
    const guide = guideRef?.value;
    if (!guide) return;

    const gap = 14;
    const viewport = viewportBounds();
    const guideWidth = guide.offsetWidth || 280;
    const guideHeight = guide.offsetHeight || 135;
    const orbCenter = {
      x: position.x + ORB_SIZE / 2,
      y: position.y + ORB_SIZE / 2,
    };
    const bounds = {
      left: viewport.minX,
      right: viewport.minX + viewport.width - SAFE_MARGIN,
      top: viewport.minY,
      bottom: viewport.minY + viewport.height - SAFE_MARGIN,
    };
    const orbRect = {
      left: position.x,
      right: position.x + ORB_SIZE,
      top: position.y,
      bottom: position.y + ORB_SIZE,
    };
    const clamp = (value: number, min: number, max: number) =>
      Math.min(Math.max(min, value), Math.max(min, max));
    const candidates = [
      {
        placement: "left",
        left: position.x - guideWidth - gap,
        top: orbCenter.y - guideHeight / 2,
      },
      {
        placement: "right",
        left: position.x + ORB_SIZE + gap,
        top: orbCenter.y - guideHeight / 2,
      },
      {
        placement: "top",
        left: orbCenter.x - guideWidth / 2,
        top: position.y - guideHeight - gap,
      },
      {
        placement: "bottom",
        left: orbCenter.x - guideWidth / 2,
        top: position.y + ORB_SIZE + gap,
      },
    ].map((candidate) => {
      const left = clamp(candidate.left, bounds.left, bounds.right - guideWidth);
      const top = clamp(candidate.top, bounds.top, bounds.bottom - guideHeight);
      const overlaps =
        left < orbRect.right &&
        left + guideWidth > orbRect.left &&
        top < orbRect.bottom &&
        top + guideHeight > orbRect.top;
      const gapAvailable =
        candidate.placement === "left"
          ? position.x - bounds.left >= guideWidth + gap
          : candidate.placement === "right"
            ? bounds.right - orbRect.right >= guideWidth + gap
            : candidate.placement === "top"
              ? position.y - bounds.top >= guideHeight + gap
              : bounds.bottom - orbRect.bottom >= guideHeight + gap;
      return { ...candidate, left, top, fits: !overlaps, preferred: !overlaps && gapAvailable };
    });

    const selected =
      candidates.find((candidate) => candidate.preferred) ||
      candidates.find((candidate) => candidate.fits) ||
      candidates.sort((a, b) => {
        const distance = (candidate: (typeof candidates)[number]) =>
          Math.min(
            Math.abs(candidate.left + guideWidth / 2 - orbCenter.x),
            Math.abs(candidate.top + guideHeight / 2 - orbCenter.y),
          );
        return distance(b) - distance(a);
      })[0];

    guide.style.transform = `translate3d(${selected.left}px, ${selected.top}px, 0)`;
    guide.dataset.placement = selected.placement;
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || pointerId !== null) return;
    pointerId = event.pointerId;
    startPointer = { x: event.clientX, y: event.clientY };
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
    }
    if (!isDragging.value) return;
    event.preventDefault();
    schedulePosition({ x: startPosition.x + dx, y: startPosition.y + dy });
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
    updateGuidePosition();
  };

  onMounted(() => {
    onVisibilityChange();
    restorePosition();
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
