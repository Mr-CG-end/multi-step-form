import { ref, nextTick } from "vue";
import { gsap } from "gsap";

/**
 * 确保 DOM 中存在用于烟雾扭曲特效的 SVG 分形噪声与置换滤镜
 */
function ensureSmokeFilter(): {
  turbulence: SVGElement | null;
  displacement: SVGElement | null;
} {
  if (typeof document === "undefined") {
    return { turbulence: null, displacement: null };
  }

  const svgDefs = document.getElementById("smoke-filter-defs");
  if (!svgDefs) {
    const svgWrapper = document.createElement("div");
    svgWrapper.innerHTML = `
      <svg id="smoke-filter-defs" style="position: absolute; width: 0; height: 0; pointer-events: none; overflow: hidden;" aria-hidden="true">
        <defs>
          <filter id="smoke-dissolve-filter" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
            <feTurbulence
              id="smoke-turbulence"
              type="fractalNoise"
              baseFrequency="0.04 0.04"
              numOctaves="3"
              result="smokeNoise"
            />
            <feDisplacementMap
              id="smoke-displacement"
              in="SourceGraphic"
              in2="smokeNoise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
    `.trim();

    if (svgWrapper.firstElementChild) {
      document.body.appendChild(svgWrapper.firstElementChild);
    }
  }

  const turbulence = document.getElementById(
    "smoke-turbulence"
  ) as unknown as SVGElement | null;
  const displacement = document.getElementById(
    "smoke-displacement"
  ) as unknown as SVGElement | null;

  return { turbulence, displacement };
}

/**
 * 语言切换 SVG 湍流烟雾消散与凝聚动效控制器
 */
export function useLanguageTransition() {
  const isTransitioning = ref<boolean>(false);

  /**
   * 执行带有真实烟雾散开与聚拢效果的语言切换
   * @param targetSelector 需要应用动效的目标元素选择器或元素数组
   * @param onLocaleChange 切换语言的回调函数（在烟雾完全散开中点执行）
   */
  const switchWithDissolve = (
    targetSelector: string | HTMLElement | (HTMLElement | Element)[],
    onLocaleChange: () => void
  ): void => {
    // 若系统开启了无障碍“减弱动态效果”偏好，直接执行即时切换
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      onLocaleChange();
      return;
    }

    // 避免在动画执行过程中重复触发
    if (isTransitioning.value) {
      return;
    }

    // 获取需要做动效的目标 DOM 元素
    let elements: Element[] = [];
    if (typeof targetSelector === "string") {
      elements = Array.from(document.querySelectorAll(targetSelector));
    } else if (Array.isArray(targetSelector)) {
      elements = targetSelector.filter((el): el is Element => Boolean(el));
    } else if (targetSelector instanceof Element) {
      elements = [targetSelector];
    }

    // 若没有匹配到可用 DOM，直接降级切换
    if (elements.length === 0) {
      onLocaleChange();
      return;
    }

    const { turbulence, displacement } = ensureSmokeFilter();
    isTransitioning.value = true;

    // 烟雾物理参数（GSAP 补间驱动置换强度与噪声频率）
    const smokeProps = {
      scale: 0,
      frequency: 0.035,
    };

    // 创建 GSAP 补间时间线
    const tl = gsap.timeline({
      onComplete: () => {
        isTransitioning.value = false;
        // 动画完全结束后复位 SVG 滤镜参数并清除行内样式，保持 100% 原始清晰度
        if (displacement) {
          displacement.setAttribute("scale", "0");
        }
        gsap.set(elements, {
          clearProps: "filter,opacity,transform,letterSpacing",
        });
      },
    });

    // 阶段 1：烟雾消散 (Smoke Disperse Out) —— 笔画扭曲发散、字距微张、微幅上浮化为缕缕轻烟
    tl.to(
      smokeProps,
      {
        duration: 0.22,
        scale: 28,
        frequency: 0.075,
        ease: "power2.in",
        onUpdate: () => {
          if (displacement) {
            displacement.setAttribute("scale", smokeProps.scale.toString());
          }
          if (turbulence) {
            turbulence.setAttribute(
              "baseFrequency",
              `${smokeProps.frequency} ${smokeProps.frequency}`
            );
          }
        },
      },
      0
    );

    tl.to(
      elements,
      {
        duration: 0.22,
        opacity: 0,
        y: -8,
        letterSpacing: "1px",
        filter: "url(#smoke-dissolve-filter) blur(5px)",
        stagger: 0.015,
        ease: "power2.in",
        force3D: true,
        onComplete: async () => {
          // 阶段 2：在烟雾完全散开的中点切换语言文案
          onLocaleChange();
          await nextTick();
        },
      },
      0
    );

    // 阶段 3：烟雾凝聚 (Smoke Coalesce & Gather In) —— 新文字从浓雾中聚拢收束，笔画逐渐凝结固化
    tl.fromTo(
      smokeProps,
      { scale: 28, frequency: 0.075 },
      {
        duration: 0.28,
        scale: 0,
        frequency: 0.035,
        ease: "power2.out",
        onUpdate: () => {
          if (displacement) {
            displacement.setAttribute("scale", smokeProps.scale.toString());
          }
          if (turbulence) {
            turbulence.setAttribute(
              "baseFrequency",
              `${smokeProps.frequency} ${smokeProps.frequency}`
            );
          }
        },
      }
    );

    tl.fromTo(
      elements,
      {
        opacity: 0,
        y: 8,
        letterSpacing: "1px",
        filter: "url(#smoke-dissolve-filter) blur(5px)",
      },
      {
        duration: 0.28,
        opacity: 1,
        y: 0,
        letterSpacing: "normal",
        filter: "url(#smoke-dissolve-filter) blur(0px)",
        stagger: 0.015,
        ease: "power2.out",
        force3D: true,
      },
      "<"
    );
  };

  return {
    isTransitioning,
    switchWithDissolve,
  };
}
