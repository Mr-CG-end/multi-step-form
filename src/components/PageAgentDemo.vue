<template>
  <div class="page-agent-wrapper">
    <!-- 浮动入口按钮：固定在屏幕右下角，避免遮挡主表单或右上角语言切换器 -->
    <button
      ref="floatBtnRef"
      type="button"
      class="agent-float-btn"
      :class="{ 'is-active': isOpen, 'is-running': isRunning }"
      :aria-expanded="isOpen"
      aria-controls="page-agent-panel"
      :aria-label="t('agent.accessibility.openPanel')"
      @click="togglePanel"
    >
      <span class="btn-icon" aria-hidden="true">
        <!-- 运行中的脉冲动画指示器 -->
        <span v-if="isRunning" class="pulse-indicator"></span>
        <!-- Sparkles / Robot 矢量图标 -->
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L14.39 8.26L21 9.27L16 13.97L17.45 20.73L12 17.27L6.55 20.73L8 13.97L3 9.27L9.61 8.26L12 2Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
      <span class="btn-label">{{ t("agent.entry") }}</span>
    </button>

    <!-- 移动端全屏半透明遮罩，点击可快速收起抽屉 -->
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="agent-backdrop"
        aria-hidden="true"
        @click="closePanel"
      ></div>
    </Transition>

    <!-- 主演示面板：桌面端为右下悬浮窗，移动端为底部抽屉 -->
    <Transition name="slide-panel">
      <section
        v-if="isOpen"
        id="page-agent-panel"
        ref="panelRef"
        tabindex="-1"
        class="agent-panel"
        role="region"
        :aria-label="t('agent.accessibility.panelTitle')"
      >
        <!-- 抽屉顶部拖动条（移动端视觉标识） -->
        <div class="drawer-handle" aria-hidden="true"></div>

        <!-- 面板头部：标题与关闭按钮 -->
        <header class="panel-header">
          <div class="header-info">
            <h2 class="panel-title">{{ t("agent.title") }}</h2>
            <p class="panel-subtitle">{{ t("agent.subtitle") }}</p>
          </div>
          <button
            type="button"
            class="close-btn"
            :aria-label="t('agent.accessibility.closePanel')"
            @click="closePanel"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 1L13 13M1 13L13 1"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </header>

        <!-- 场景 A：首次使用条款同意视图 -->
        <div v-if="showConsentView" class="panel-body consent-view">
          <div class="consent-card">
            <h3 class="consent-title">{{ t("agent.consent.title") }}</h3>
            <p class="consent-intro">{{ t("agent.consent.intro") }}</p>
            <ul class="consent-list">
              <li>{{ t("agent.consent.terms.demo") }}</li>
              <li>{{ t("agent.consent.terms.transmission") }}</li>
              <li>{{ t("agent.consent.terms.privacy") }}</li>
              <li>{{ t("agent.consent.terms.rateLimit") }}</li>
            </ul>
          </div>
          <div class="consent-actions">
            <button
              type="button"
              class="primary-action-btn"
              @click="handleAgreeConsent"
            >
              {{ t("agent.consent.agree") }}
            </button>
            <button
              type="button"
              class="secondary-action-btn"
              @click="handleDeclineConsent"
            >
              {{ t("agent.consent.decline") }}
            </button>
          </div>
        </div>

        <!-- 场景 B：已同意后的指令交互视图 -->
        <div v-else class="panel-body interactive-view">
          <!-- 预设指令区域 -->
          <div class="section-block">
            <h3 class="section-title">{{ t("agent.presets.title") }}</h3>
            <div class="presets-list">
              <button
                v-for="(preset, index) in presetCommands"
                :key="index"
                type="button"
                class="preset-item-btn"
                :disabled="isControlsDisabled"
                @click="handleSelectPreset(preset)"
              >
                <span class="preset-index">#{{ index + 1 }}</span>
                <span class="preset-text">{{ preset }}</span>
              </button>
            </div>
          </div>

          <!-- 自定义偏好输入区域 -->
          <div class="section-block">
            <div class="section-header-row">
              <h3 class="section-title">{{ t("agent.custom.title") }}</h3>
              <span
                class="char-counter"
                :class="{ 'is-limit': isCharLimitReached }"
              >
                {{ customPrompt.length }}/{{ MAX_PROMPT_LENGTH }}
              </span>
            </div>
            <div class="input-wrapper">
              <textarea
                ref="customTextareaRef"
                v-model="customPrompt"
                class="custom-textarea"
                :class="{ 'has-error': hasValidationError }"
                :maxlength="MAX_PROMPT_LENGTH"
                :placeholder="t('agent.custom.placeholder')"
                :disabled="isControlsDisabled"
                rows="3"
                @keydown.ctrl.enter="handleExecuteCustom"
                @keydown.meta.enter="handleExecuteCustom"
              ></textarea>
            </div>
          </div>

          <!-- 主操作按钮：运行中展示停止，空闲时展示执行 -->
          <div class="actions-block">
            <button
              v-if="isRunning"
              type="button"
              class="stop-action-btn"
              @click="handleStop"
            >
              <svg
                class="btn-svg-icon"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
              <span>{{ t("agent.custom.stop") }}</span>
            </button>
            <button
              v-else
              type="button"
              class="primary-action-btn"
              :disabled="isExecuteDisabled"
              @click="handleExecuteCustom"
            >
              <svg
                v-if="isLoading"
                class="spinner-icon"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-dasharray="32"
                  stroke-linecap="round"
                />
              </svg>
              <span>{{ t("agent.custom.execute") }}</span>
            </button>
          </div>

          <!-- 运行状态与错误反馈区域 -->
          <div
            class="status-container"
            :class="statusContainerClass"
            :role="statusAriaRole"
            aria-live="polite"
          >
            <div class="status-indicator-dot"></div>
            <div class="status-content">
              <p class="status-text">{{ currentStatusText }}</p>
              <p v-if="hasErrorMessage" class="error-detail-text">
                {{ formattedErrorMessage }}
              </p>
            </div>
          </div>

          <!-- 底部固定虚构数据与安全说明提示 -->
          <footer class="panel-footer-notice">
            <p>{{ t("agent.notice.disclaimer") }}</p>
          </footer>
        </div>
      </section>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { usePageAgentDemo } from "@/composables/usePageAgentDemo";

// 本地存储同意状态的 Key 与版本标识
const CONSENT_STORAGE_KEY = "multi-step-form-page-agent-consent";
const CONSENT_VERSION = "1";
// 自定义输入最大字符数限制
const MAX_PROMPT_LENGTH = 300;

const { t, locale } = useI18n();
const { status, errorMessage, load, execute, stop, dispose } =
  usePageAgentDemo();

// DOM 节点引用，用于键盘无障碍焦点管理
const floatBtnRef = ref<HTMLButtonElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const customTextareaRef = ref<HTMLTextAreaElement | null>(null);

// 面板展开/收起状态
const isOpen = ref<boolean>(false);
// 首次使用同意状态
const hasConsented = ref<boolean>(false);
// 自定义偏好指令内容
const customPrompt = ref<string>("");
// 本地前置校验错误信息
const localValidationError = ref<string>("");

/**
 * 衍生状态：是否展示首次同意条款视图
 */
const showConsentView = computed(() => !hasConsented.value);

/**
 * 衍生状态：是否正在运行 Agent 任务
 */
const isRunning = computed(() => status.value === "running");

/**
 * 衍生状态：是否正在加载 Agent 脚本
 */
const isLoading = computed(() => status.value === "loading");

/**
 * 衍生状态：控件是否处于禁用锁定状态（运行中或加载中）
 */
const isControlsDisabled = computed(
  () => status.value === "running" || status.value === "loading"
);

/**
 * 衍生状态：执行按钮是否不可点击
 */
const isExecuteDisabled = computed(
  () =>
    !customPrompt.value.trim() ||
    status.value === "loading" ||
    status.value === "running"
);

/**
 * 衍生状态：字符计数是否触达上限
 */
const isCharLimitReached = computed(
  () => customPrompt.value.length >= MAX_PROMPT_LENGTH
);

/**
 * 衍生状态：是否存在前置校验错误
 */
const hasValidationError = computed(() => !!localValidationError.value);

/**
 * 衍生状态：是否存在错误信息
 */
const hasErrorMessage = computed(
  () => !!errorMessage.value || !!localValidationError.value
);

/**
 * 衍生状态：无障碍角色标注，出现错误时使用 alert
 */
const statusAriaRole = computed(() =>
  status.value === "error" || hasValidationError.value ? "alert" : "status"
);

/**
 * 衍生状态：状态容器的样式类名
 */
const statusContainerClass = computed(() => {
  if (status.value === "error" || localValidationError.value) {
    return "is-state-error";
  }
  if (status.value === "running") {
    return "is-state-running";
  }
  if (status.value === "loading") {
    return "is-state-loading";
  }
  if (status.value === "completed") {
    return "is-state-completed";
  }
  if (status.value === "stopped") {
    return "is-state-stopped";
  }
  return "is-state-idle";
});

/**
 * 衍生状态：预设指令列表
 */
const presetCommands = computed(() => [
  t("agent.presets.preset1"),
  t("agent.presets.preset2"),
  t("agent.presets.preset3"),
]);

/**
 * 衍生状态：当前运行状态核心提示文本
 */
const currentStatusText = computed(() => {
  if (localValidationError.value || status.value === "error") {
    return t("agent.status.error");
  }
  switch (status.value) {
    case "loading":
      return t("agent.status.loading");
    case "running":
      return t("agent.status.running");
    case "completed":
      return t("agent.status.completed");
    case "stopped":
      return t("agent.status.stopped");
    case "idle":
    default:
      return t("agent.status.idle");
  }
});

/**
 * 衍生状态：映射国际化错误详情
 */
const formattedErrorMessage = computed(() => {
  if (localValidationError.value) {
    return localValidationError.value;
  }
  if (!errorMessage.value) {
    return "";
  }
  // 尝试在多语言词条中匹配错误代码
  const errKey = `agent.errors.${errorMessage.value}`;
  const translated = t(errKey);
  return translated !== errKey ? translated : errorMessage.value;
});

/**
 * 切换面板显隐状态
 * 若已同意且打开面板，主动预加载 CDN 运行时并移动焦点
 */
const togglePanel = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    if (hasConsented.value) {
      load(locale.value).catch(() => {
        // 捕获预加载异常，已由 composable 维护 error 状态
      });
    }
    nextTick(() => {
      if (!showConsentView.value) {
        customTextareaRef.value?.focus();
      } else {
        panelRef.value?.focus();
      }
    });
  } else {
    nextTick(() => {
      floatBtnRef.value?.focus();
    });
  }
};

/**
 * 关闭演示面板并将焦点归还浮动入口
 */
const closePanel = () => {
  isOpen.value = false;
  nextTick(() => {
    floatBtnRef.value?.focus();
  });
};

/**
 * 同意使用条款：持久化存储并开始预加载运行时，自动将焦点移动至输入区
 */
const handleAgreeConsent = () => {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_VERSION);
  } catch {
    // 兼容可能被禁用的 localStorage 环境
  }
  hasConsented.value = true;
  load(locale.value).catch(() => {
    // 捕获加载异常
  });
  nextTick(() => {
    customTextareaRef.value?.focus();
  });
};

/**
 * 拒绝使用条款：直接关闭面板，不加载 CDN，不产生网络请求
 */
const handleDeclineConsent = () => {
  closePanel();
};

/**
 * 校验输入内容，防止敏感信息上传
 */
const validateInput = (input: string): boolean => {
  const trimmed = input.trim();
  localValidationError.value = "";

  if (trimmed.length < 1) {
    return false;
  }

  // 邮箱格式拦截
  const emailRegex = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/;
  if (emailRegex.test(trimmed)) {
    localValidationError.value = t(
      "agent.errors.AGENT_ERROR_SENSITIVE_EMAIL"
    );
    return false;
  }

  // 连续 7 位数字（疑似手机号/联系方式）拦截
  const phoneRegex = /\d{7,}/;
  if (phoneRegex.test(trimmed)) {
    localValidationError.value = t(
      "agent.errors.AGENT_ERROR_SENSITIVE_PHONE"
    );
    return false;
  }

  return true;
};

/**
 * 点击快速预设指令：填充输入框并直接触发执行
 */
const handleSelectPreset = (preset: string) => {
  customPrompt.value = preset;
  localValidationError.value = "";
  execute(preset, locale.value);
};

/**
 * 执行用户自定义指令
 */
const handleExecuteCustom = () => {
  const trimmed = customPrompt.value.trim();
  if (!trimmed || isControlsDisabled.value) {
    return;
  }
  if (!validateInput(trimmed)) {
    return;
  }
  execute(trimmed, locale.value);
};

/**
 * 中止当前任务
 */
const handleStop = () => {
  stop();
};

/**
 * 监听全局键盘事件：Esc 键可关闭面板（任务运行中 Esc 仅关闭面板不中止任务）
 */
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Escape" && isOpen.value) {
    closePanel();
  }
};

// 用户修改自定义输入时，自动重置前置校验提示
watch(customPrompt, () => {
  if (localValidationError.value) {
    localValidationError.value = "";
  }
});

// 监听语言切换：若已同意且面板已打开，协同切换运行时语言
watch(locale, (newLocale) => {
  if (hasConsented.value && isOpen.value && status.value !== "running") {
    load(newLocale).catch(() => {
      // 忽略切换中的静默异常
    });
  }
});

onMounted(() => {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    hasConsented.value = stored === CONSENT_VERSION;
  } catch {
    hasConsented.value = false;
  }
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
  dispose();
});
</script>

<style scoped lang="scss">
.page-agent-wrapper {
  position: relative;
  font-family: "ubuntu-regular", sans-serif;
  z-index: 90;
}

/* ---------------- 浮动入口按钮 ---------------- */
.agent-float-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  background-color: #02295a;
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 30px;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(2, 41, 90, 0.25), 0 2px 6px rgba(2, 41, 90, 0.12);
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
  user-select: none;
  z-index: 90;

  &:hover {
    background-color: #174a89;
    box-shadow: 0 8px 24px rgba(2, 41, 90, 0.35);
    transform: translateY(-2px);
  }

  &.is-active {
    background-color: #413eff;
    border-color: #6865ff;
  }

  &.is-running {
    background-color: #534d93;
  }
}

.btn-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bde2fd;
}

.btn-label {
  font-family: "ubuntu-bold", sans-serif;
  font-size: 14px;
  letter-spacing: 0.3px;
}

.pulse-indicator {
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: rgba(189, 226, 253, 0.4);
  animation: pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
}

/* ---------------- 移动端半透明背景遮罩 ---------------- */
.agent-backdrop {
  display: none;
}

@media (max-width: 600px) {
  .agent-backdrop {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(2, 41, 90, 0.4);
    backdrop-filter: blur(2px);
    z-index: 94;
  }
}

/* ---------------- 演示主面板 ---------------- */
.agent-panel {
  position: fixed;
  bottom: 80px;
  right: 24px;
  width: 360px;
  max-height: calc(100vh - 100px);
  background-color: #ffffff;
  border: 1px solid rgba(83, 77, 147, 0.16);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(2, 41, 90, 0.18), 0 4px 12px rgba(2, 41, 90, 0.06);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  z-index: 95;
}

.drawer-handle {
  display: none;
}

/* 面板头部 */
.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(83, 77, 147, 0.08);
}

.panel-title {
  margin: 0;
  font-family: "ubuntu-bold", sans-serif;
  font-size: 17px;
  color: #02295a;
}

.panel-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: #95969b;
  line-height: 1.4;
}

.close-btn {
  background: transparent;
  border: none;
  color: #95969b;
  padding: 6px;
  margin-top: -2px;
  margin-right: -4px;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    color: #02295a;
    background-color: rgba(83, 77, 147, 0.08);
  }
}

/* 面板内容容器 */
.panel-body {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---------------- 同意条款卡片 ---------------- */
.consent-card {
  background-color: #f8f9fe;
  border: 1px solid rgba(83, 77, 147, 0.12);
  border-radius: 12px;
  padding: 14px 16px;
}

.consent-title {
  margin: 0 0 6px;
  font-family: "ubuntu-bold", sans-serif;
  font-size: 14px;
  color: #02295a;
}

.consent-intro {
  margin: 0 0 10px;
  font-size: 12px;
  color: #534d93;
  line-height: 1.4;
}

.consent-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: #1a365b;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 6px;

  li {
    list-style: disc;
  }
}

.consent-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ---------------- 指令交互区域 ---------------- */
.section-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  margin: 0;
  font-family: "ubuntu-bold", sans-serif;
  font-size: 13px;
  color: #1a365b;
}

.char-counter {
  font-size: 11px;
  color: #95969b;

  &.is-limit {
    color: #ee5454;
    font-family: "ubuntu-bold", sans-serif;
  }
}

.presets-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preset-item-btn {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 12px;
  background-color: #f8f9fe;
  border: 1px solid rgba(83, 77, 147, 0.12);
  border-radius: 8px;
  color: #1a365b;
  font-size: 12.5px;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: #eef5ff;
    border-color: #413eff;
    color: #413eff;
    transform: translateX(2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.preset-index {
  font-family: "ubuntu-bold", sans-serif;
  font-size: 11px;
  color: #534d93;
  margin-top: 1px;
}

.preset-text {
  flex: 1;
}

/* 输入框 */
.input-wrapper {
  position: relative;
}

.custom-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #d9d9db;
  border-radius: 8px;
  font-family: "ubuntu-regular", sans-serif;
  font-size: 13px;
  color: #1a365b;
  background-color: #ffffff;
  resize: vertical;
  min-height: 64px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    outline: none;
    border-color: #534d93;
    box-shadow: 0 0 0 3px rgba(83, 77, 147, 0.12);
  }

  &::placeholder {
    color: #95969b;
    font-size: 12px;
  }

  &:disabled {
    background-color: #f8f9fe;
    cursor: not-allowed;
    opacity: 0.7;
  }

  &.has-error {
    border-color: #ee5454;
  }
}

/* 操作按钮 */
.actions-block {
  display: flex;
  flex-direction: column;
}

.primary-action-btn,
.secondary-action-btn,
.stop-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  border-radius: 8px;
  font-family: "ubuntu-bold", sans-serif;
  font-size: 13.5px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.primary-action-btn {
  background-color: #02295a;
  color: #ffffff;
  border: 1px solid #02295a;

  &:hover:not(:disabled) {
    background-color: #174a89;
    border-color: #174a89;
  }

  &:disabled {
    background-color: #d9d9db;
    border-color: #d9d9db;
    color: #95969b;
    cursor: not-allowed;
  }
}

.secondary-action-btn {
  background-color: #ffffff;
  color: #95969b;
  border: 1px solid #d9d9db;

  &:hover {
    color: #02295a;
    border-color: #02295a;
    background-color: #f8f9fe;
  }
}

.stop-action-btn {
  background-color: #ee5454;
  color: #ffffff;
  border: 1px solid #ee5454;

  &:hover {
    background-color: #d93d3d;
    border-color: #d93d3d;
  }
}

.btn-svg-icon {
  display: inline-block;
}

.spinner-icon {
  width: 14px;
  height: 14px;
  animation: spin 1s linear infinite;
}

/* ---------------- 状态提示区域 ---------------- */
.status-container {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.4;
  background-color: #f8f9fe;
  border: 1px solid rgba(83, 77, 147, 0.12);
  transition: all 0.2s ease;

  &.is-state-idle {
    color: #534d93;
    .status-indicator-dot {
      background-color: #534d93;
    }
  }

  &.is-state-loading {
    color: #174a89;
    background-color: #eef5ff;
    border-color: rgba(23, 74, 137, 0.2);
    .status-indicator-dot {
      background-color: #174a89;
      animation: pulse-dot 1s infinite alternate;
    }
  }

  &.is-state-running {
    color: #413eff;
    background-color: #f0f0ff;
    border-color: rgba(65, 62, 255, 0.25);
    .status-indicator-dot {
      background-color: #413eff;
      animation: pulse-dot 0.8s infinite alternate;
    }
  }

  &.is-state-completed {
    color: #0d9488;
    background-color: #f0fdfa;
    border-color: rgba(13, 148, 136, 0.25);
    .status-indicator-dot {
      background-color: #0d9488;
    }
  }

  &.is-state-stopped {
    color: #95969b;
    background-color: #f8f9fe;
    .status-indicator-dot {
      background-color: #95969b;
    }
  }

  &.is-state-error {
    color: #ee5454;
    background-color: #fef2f2;
    border-color: rgba(238, 84, 84, 0.25);
    .status-indicator-dot {
      background-color: #ee5454;
    }
  }
}

.status-indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.status-content {
  flex: 1;
}

.status-text {
  margin: 0;
  font-family: "ubuntu-medium", sans-serif;
}

.error-detail-text {
  margin: 4px 0 0;
  font-size: 11.5px;
  color: #ee5454;
}

/* 底部声明 */
.panel-footer-notice {
  font-size: 11px;
  color: #95969b;
  line-height: 1.4;
  border-top: 1px dashed rgba(83, 77, 147, 0.15);
  padding-top: 10px;

  p {
    margin: 0;
  }
}

/* ---------------- 动画过渡 ---------------- */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.8);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

@keyframes pulse-dot {
  0% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: opacity 0.25s ease,
    transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

/* ---------------- 移动端响应式适配 ---------------- */
@media (max-width: 971px) {
  .agent-float-btn {
    bottom: 86px;
    right: 16px;
    padding: 8px 14px;
  }

  .agent-panel {
    bottom: 140px;
    right: 16px;
  }
}

@media (max-width: 600px) {
  .agent-panel {
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    max-height: 70vh;
    border-radius: 16px 16px 0 0;
    border-bottom: none;
    box-shadow: 0 -8px 24px rgba(2, 41, 90, 0.15);
  }

  .drawer-handle {
    display: block;
    width: 36px;
    height: 4px;
    background-color: #d9d9db;
    border-radius: 2px;
    margin: 8px auto 0;
  }

  .slide-panel-enter-from,
  .slide-panel-leave-to {
    transform: translateY(100%);
  }
}

/* 减弱动画模式适配 */
@media (prefers-reduced-motion: reduce) {
  .agent-float-btn,
  .agent-panel,
  .slide-panel-enter-active,
  .slide-panel-leave-active,
  .fade-enter-active,
  .fade-leave-active {
    transition: none !important;
    animation: none !important;
  }
}
</style>
