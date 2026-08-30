import { nextTick, onUnmounted, ref } from "vue";
import { gsap } from "gsap";

function shouldReduceTransition(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
  return (
    (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2) ||
    (navigatorWithMemory.deviceMemory !== undefined && navigatorWithMemory.deviceMemory <= 2)
  );
}

function normalizeTargets(
  target: string | HTMLElement | (HTMLElement | Element)[],
): HTMLElement[] {
  let elements: Element[];
  if (typeof target === "string") {
    elements = Array.from(document.querySelectorAll(target));
  } else if (Array.isArray(target)) {
    elements = target.filter(Boolean);
  } else {
    elements = [target];
  }

  return elements
    .filter((element): element is HTMLElement => element instanceof HTMLElement)
    .filter(
      (element, index, collection) =>
        !collection.some(
          (candidate, candidateIndex) =>
            candidateIndex !== index && candidate.contains(element),
        ),
    );
}

function waitForRender(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve();
    };

    const timeoutId = window.setTimeout(finish, 120);
    requestAnimationFrame(finish);
  });
}

export function useLanguageTransition() {
  const isTransitioning = ref(false);
  let activeTween: gsap.core.Tween | null = null;
  let transitionVersion = 0;
  let fallbackTimer: number | null = null;
  let originalOpacity = new Map<HTMLElement, string>();

  const restore = () => {
    if (!isTransitioning.value) return;
    isTransitioning.value = false;
    transitionVersion += 1;
    if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
    fallbackTimer = null;
    const tween = activeTween;
    activeTween = null;
    tween?.kill();
    originalOpacity.forEach((value, element) => {
      if (value) element.style.opacity = value;
      else element.style.removeProperty("opacity");
    });
    originalOpacity = new Map();
  };

  const switchWithDissolve = (
    targetSelector: string | HTMLElement | (HTMLElement | Element)[],
    onLocaleChange: () => void,
  ): void => {
    // A newer selection supersedes the previous animation. Restoring first
    // also invalidates the previous async callback via transitionVersion.
    if (isTransitioning.value) restore();
    if (shouldReduceTransition()) {
      onLocaleChange();
      return;
    }

    const targets = normalizeTargets(targetSelector);
    if (targets.length === 0) {
      onLocaleChange();
      return;
    }

    isTransitioning.value = true;
    const version = ++transitionVersion;
    originalOpacity = new Map(
      targets.map((element) => [element, element.style.opacity]),
    );

    gsap.killTweensOf(targets);
    activeTween = gsap.to(targets, {
      duration: 0.14,
      opacity: 0.18,
      ease: "power2.in",
      onComplete: async () => {
        try {
          if (version !== transitionVersion) return;
          onLocaleChange();
          await nextTick();
          await waitForRender();
          if (version !== transitionVersion) return;

          activeTween = gsap.to(targets, {
            duration: 0.22,
            opacity: 1,
            ease: "power2.out",
            onComplete: restore,
            onInterrupt: restore,
          });
        } catch {
          restore();
        }
      },
      onInterrupt: restore,
    });

    // 页面切后台或浏览器降帧时，GSAP ticker 可能延迟完成回调；
    // 到时直接完成当前 Tween，避免语言切换锁死交互。
    fallbackTimer = window.setTimeout(() => {
      if (version !== transitionVersion || !isTransitioning.value) return;
      activeTween?.progress(1);
    }, 900);
  };

  onUnmounted(restore);
  return { isTransitioning, switchWithDissolve, cancelTransition: restore };
}
