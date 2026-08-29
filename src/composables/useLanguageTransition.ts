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

export function useLanguageTransition() {
  const isTransitioning = ref(false);
  let activeTween: gsap.core.Tween | null = null;
  let transitionVersion = 0;
  let originalOpacity = new Map<HTMLElement, string>();

  const restore = () => {
    transitionVersion += 1;
    activeTween?.kill();
    activeTween = null;
    originalOpacity.forEach((value, element) => {
      if (value) element.style.opacity = value;
      else element.style.removeProperty("opacity");
    });
    originalOpacity = new Map();
    isTransitioning.value = false;
  };

  const switchWithDissolve = (
    targetSelector: string | HTMLElement | (HTMLElement | Element)[],
    onLocaleChange: () => void,
  ): void => {
    if (isTransitioning.value) return;
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
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          );
          if (version !== transitionVersion) return;

          activeTween = gsap.to(targets, {
            duration: 0.22,
            opacity: 1,
            ease: "power2.out",
            onComplete: restore,
          });
        } catch {
          restore();
        }
      },
    });
  };

  onUnmounted(restore);
  return { isTransitioning, switchWithDissolve };
}
