<template>
  <div class="language-switcher" ref="switcherRef">
    <!-- 触发按钮 -->
    <div
      class="selector"
      :class="{ 'is-open': isOpen }"
      @click="toggleDropdown"
    >
      <span>{{ currentLanguageLabel }}</span>
      <svg
        class="arrow"
        :class="{ rotate: isOpen }"
        width="12"
        height="8"
        viewBox="0 0 12 8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1 1.5L6 6.5L11 1.5"
          stroke="#03295A"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>

    <!-- 下拉菜单：带淡入淡出动画 -->
    <Transition name="dropdown">
      <ul v-if="isOpen" class="options-list">
        <li
          v-for="lang in languages"
          :key="lang.code"
          class="option-item"
          :class="{ active: locale === lang.code }"
          @click="selectLanguage(lang.code)"
        >
          <span class="indicator" v-show="locale === lang.code"></span>
          {{ lang.label }}
        </li>
      </ul>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { setStoredLocale } from "@/i18n";
import { useLanguageTransition } from "@/composables/useLanguageTransition";

const { locale } = useI18n();
const { switchWithDissolve, isTransitioning } = useLanguageTransition();

const languages = [
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "en", label: "English" },
];

const isOpen = ref(false);
const switcherRef = ref<HTMLElement | null>(null);

// 计算当前语言显示的名称
const currentLanguageLabel = computed(() => {
  return languages.find((l) => l.code === locale.value)?.label || "Language";
});

const toggleDropdown = () => {
  if (isTransitioning.value) return;
  isOpen.value = !isOpen.value;
};

const selectLanguage = (code: string) => {
  if (code === locale.value || isTransitioning.value) {
    isOpen.value = false;
    return;
  }

  isOpen.value = false; // 选择后先收起下拉菜单

  // 选取需要应用轻烟消散与凝聚动效的页面核心内容区域（以整块协调过渡，避免局部错位）
  const targetSelectors = ".navbar ul, .content, .agent-panel";

  switchWithDissolve(targetSelectors, () => {
    locale.value = code;
    setStoredLocale(code);
  });
};

// 点击外部区域自动关闭下拉框
const handleClickOutside = (event: MouseEvent) => {
  if (switcherRef.value && !switcherRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
.language-switcher {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 100;
  font-family: "ubuntu-bold", sans-serif;
  user-select: none; /* 防止点击时双击选中文本 */
}

/* 主选择框 (完全自定义，替代原 select) */
.selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid rgba(83, 77, 147, 0.15);
  background-color: rgba(255, 255, 255, 0.85);
  color: #03295a;
  font-size: 13.5px;
  cursor: pointer;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 16px rgba(3, 41, 90, 0.06), 0 2px 4px rgba(3, 41, 90, 0.04);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.selector:hover,
.selector.is-open {
  background-color: #ffffff;
  border-color: rgba(83, 77, 147, 0.3);
  box-shadow: 0 8px 24px rgba(3, 41, 90, 0.1), 0 4px 8px rgba(3, 41, 90, 0.04);
  transform: translateY(-2px);
}

/* 箭头在展开时具备翻转动画 */
.arrow {
  transition: transform 0.3s ease;
}
.arrow.rotate {
  transform: rotate(180deg);
}

/* 彻底重写的独立下拉列表面板 */
.options-list {
  position: absolute;
  top: calc(100% + 12px); /* 距离触发按钮底部 12px 留白 */
  right: 0;
  width: max-content;
  min-width: 140px;
  margin: 0;
  padding: 8px;
  list-style: none;
  background-color: #ffffff;
  border-radius: 14px; /* 柔和的大圆角弹框 */
  box-shadow: 0 12px 36px rgba(3, 41, 90, 0.12),
    0 4px 12px rgba(3, 41, 90, 0.04);
  border: 1px solid rgba(83, 77, 147, 0.08); /* 极致微弱的高级线框 */
  transform-origin: top right;
}

/* 独立交互的选项单条 */
.option-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 10px 16px 10px 26px;
  font-size: 13.5px;
  color: #1a365b;
  font-family: "ubuntu-medium", sans-serif;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-item:hover {
  background-color: rgba(65, 62, 255, 0.05); /* 淡淡的一层点睛紫蓝色层 */
  color: #413eff;
}

.option-item.active {
  background-color: rgba(65, 62, 255, 0.08);
  color: #413eff;
  font-family: "ubuntu-bold", sans-serif;
}

/* 选中项的那个专属光点 */
.indicator {
  position: absolute;
  left: 10px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #413eff;
  box-shadow: 0 0 6px rgba(65, 62, 255, 0.5); /* 给点位增加极其微弱的弥散发光 */
}

/* Vue 自带弹出/消失动画引擎 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.25s ease,
    transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-5px);
}
</style>
