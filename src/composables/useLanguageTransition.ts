import { nextTick, onUnmounted, ref } from "vue";
import { gsap } from "gsap";

interface CharacterSnapshot {
  text: string;
  rect: DOMRect;
  style: CSSStyleDeclaration;
  owner: HTMLElement;
  order: number;
}

interface SegmentPart {
  segment: string;
  index: number;
}

const MAX_ANIMATED_CHARACTERS = 520;

function shouldReduceTransition(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
  return (
    (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2) ||
    (navigatorWithMemory.deviceMemory !== undefined && navigatorWithMemory.deviceMemory <= 2)
  );
}

function ensureSmokeFilter(): void {
  if (document.getElementById("character-smoke-filter-defs")) return;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <svg id="character-smoke-filter-defs" width="0" height="0" aria-hidden="true" style="position:fixed;pointer-events:none">
      <defs>
        <filter id="character-smoke-filter" x="-45%" y="-60%" width="190%" height="220%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.035 0.08" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="B" />
        </filter>
      </defs>
    </svg>
  `.trim();
  if (wrapper.firstElementChild) document.body.appendChild(wrapper.firstElementChild);
}

function segmentText(text: string): SegmentPart[] {
  const Segmenter = (
    Intl as unknown as {
      Segmenter?: new (
        locale?: string,
        options?: { granularity: "grapheme" },
      ) => { segment: (value: string) => Iterable<SegmentPart> };
    }
  ).Segmenter;
  if (Segmenter) {
    return Array.from(
      new Segmenter(undefined, { granularity: "grapheme" }).segment(text),
    );
  }

  let offset = 0;
  return Array.from(text).map((segment) => {
    const part = { segment, index: offset };
    offset += segment.length;
    return part;
  });
}

function isEligibleTextNode(node: Text): boolean {
  if (!node.data.trim()) return false;
  const parent = node.parentElement;
  if (!parent) return false;
  if (
    parent.closest(
      "script, style, svg, input, textarea, select, option, [aria-hidden='true'], .sr-only",
    )
  ) {
    return false;
  }
  const style = window.getComputedStyle(parent);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    Number(style.opacity) !== 0
  );
}

function normalizeTargets(
  target: string | HTMLElement | (HTMLElement | Element)[],
): HTMLElement[] {
  let elements: Element[] = [];
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

function captureCharacters(targets: HTMLElement[]): CharacterSnapshot[] {
  const snapshots: CharacterSnapshot[] = [];
  let order = 0;

  for (const target of targets) {
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current && snapshots.length < MAX_ANIMATED_CHARACTERS) {
      const textNode = current as Text;
      if (isEligibleTextNode(textNode)) {
        const parent = textNode.parentElement;
        if (!parent) {
          current = walker.nextNode();
          continue;
        }
        const style = window.getComputedStyle(parent);
        for (const part of segmentText(textNode.data)) {
          if (!part.segment.trim()) continue;
          const range = document.createRange();
          range.setStart(textNode, part.index);
          range.setEnd(textNode, part.index + part.segment.length);
          const rect = range.getBoundingClientRect();
          range.detach();
          const hit = document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
          );
          // Do not lift text hidden behind the assistant or outside a scroller
          // above those surfaces when it is copied into the fixed overlay.
          if (rect.width > 0 && rect.height > 0 && hit && parent.contains(hit)) {
            snapshots.push({ text: part.segment, rect, style, owner: parent, order });
            order += 1;
          }
          if (snapshots.length >= MAX_ANIMATED_CHARACTERS) break;
        }
      }
      current = walker.nextNode();
    }
  }
  return snapshots;
}

function createCharacterLayer(
  snapshots: CharacterSnapshot[],
  className: string,
): { layer: HTMLElement; characters: HTMLElement[] } {
  const layer = document.createElement("div");
  layer.className = `language-smoke-layer ${className}`;
  Object.assign(layer.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483640",
    pointerEvents: "none",
    overflow: "hidden",
    contain: "strict",
  });

  const characters = snapshots.map((snapshot) => {
    const character = document.createElement("span");
    character.textContent = snapshot.text;
    Object.assign(character.style, {
      position: "fixed",
      left: `${snapshot.rect.left}px`,
      top: `${snapshot.rect.top}px`,
      minWidth: `${snapshot.rect.width}px`,
      height: `${snapshot.rect.height}px`,
      color: snapshot.style.color,
      fontFamily: snapshot.style.fontFamily,
      fontSize: snapshot.style.fontSize,
      fontStyle: snapshot.style.fontStyle,
      fontWeight: snapshot.style.fontWeight,
      lineHeight: snapshot.style.lineHeight,
      letterSpacing: snapshot.style.letterSpacing,
      textTransform: snapshot.style.textTransform,
      transformOrigin: "center center",
      willChange: "transform, opacity, filter",
      filter: "url(#character-smoke-filter)",
      whiteSpace: "pre",
    });
    layer.appendChild(character);
    return character;
  });
  document.body.appendChild(layer);
  return { layer, characters };
}

export function useLanguageTransition() {
  const isTransitioning = ref(false);
  let activeLayer: HTMLElement | null = null;
  let activeTween: gsap.core.Tween | null = null;
  let transitionVersion = 0;
  const concealedText = new Map<
    HTMLElement,
    { value: string; priority: string }
  >();

  const concealCharacters = (snapshots: CharacterSnapshot[]) => {
    snapshots.forEach(({ owner }) => {
      if (concealedText.has(owner)) return;
      concealedText.set(owner, {
        value: owner.style.getPropertyValue("-webkit-text-fill-color"),
        priority: owner.style.getPropertyPriority("-webkit-text-fill-color"),
      });
      owner.style.setProperty(
        "-webkit-text-fill-color",
        "transparent",
        "important",
      );
    });
  };

  const revealCharacters = () => {
    concealedText.forEach(({ value, priority }, element) => {
      if (value) {
        element.style.setProperty("-webkit-text-fill-color", value, priority);
      } else {
        element.style.removeProperty("-webkit-text-fill-color");
      }
    });
    concealedText.clear();
  };

  const restore = () => {
    transitionVersion += 1;
    activeTween?.kill();
    activeTween = null;
    activeLayer?.remove();
    activeLayer = null;
    revealCharacters();
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
    const oldSnapshots = captureCharacters(targets);
    if (oldSnapshots.length === 0) {
      onLocaleChange();
      return;
    }

    ensureSmokeFilter();
    isTransitioning.value = true;
    const version = ++transitionVersion;
    const oldLayer = createCharacterLayer(oldSnapshots, "is-dispersing");
    activeLayer = oldLayer.layer;
    concealCharacters(oldSnapshots);

    activeTween = gsap.to(oldLayer.characters, {
      duration: 0.28,
      opacity: 0,
      y: (index) => -8 - (index % 5) * 1.6,
      x: (index) => ((index * 13) % 11) - 5,
      scale: (index) => 0.82 + (index % 4) * 0.025,
      filter: "url(#character-smoke-filter) blur(6px)",
      stagger: (index) => (index % 8) * 0.008,
      ease: "power2.in",
      force3D: true,
      onComplete: async () => {
        try {
        oldLayer.layer.remove();
        activeLayer = null;
        onLocaleChange();
        await nextTick();
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        if (version !== transitionVersion) return;

        const newSnapshots = captureCharacters(targets);
        if (newSnapshots.length === 0) {
          restore();
          return;
        }
        concealCharacters(newSnapshots);
        const newLayer = createCharacterLayer(newSnapshots, "is-gathering");
        activeLayer = newLayer.layer;
        gsap.set(newLayer.characters, {
          opacity: 0,
          y: (index) => 9 + (index % 4) * 1.5,
          x: (index) => ((index * 17) % 13) - 6,
          scale: 1.16,
          filter: "url(#character-smoke-filter) blur(7px)",
        });
        activeTween = gsap.to(newLayer.characters, {
          duration: 0.34,
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          filter: "url(#character-smoke-filter) blur(0px)",
          stagger: (index) => (index % 8) * 0.008,
          ease: "power2.out",
          force3D: true,
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
