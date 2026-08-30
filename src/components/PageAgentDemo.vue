<template>
  <div
    class="page-agent-root"
    data-page-agent-ignore="true"
    data-browser-use-ignore="true"
    :class="{
      'is-page-hidden': isPageHidden,
      'is-dragging': isDragging,
    }"
  >
    <button
      ref="orbRef"
      type="button"
      class="agent-orb"
      :class="orbStateClass"
      :aria-expanded="isOpen"
      aria-controls="page-agent-panel"
      :aria-label="t('agent.accessibility.openPanel')"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @click="onOrbClick"
    >
      <AgentOrbVisual
        :state="status"
        :paused="isPageHidden"
        :active="isOpen || isDragging"
      />
      <span class="orb-core">
        <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path
            d="M16 5.5c1.3 4.1 3.5 6.3 7.6 7.6-4.1 1.3-6.3 3.5-7.6 7.6-1.3-4.1-3.5-6.3-7.6-7.6 4.1-1.3 6.3-3.5 7.6-7.6Z"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
          <path
            d="M24.4 20.8c.6 1.9 1.6 2.9 3.5 3.5-1.9.6-2.9 1.6-3.5 3.5-.6-1.9-1.6-2.9-3.5-3.5 1.9-.6 2.9-1.6 3.5-3.5Z"
            fill="currentColor"
          />
        </svg>
      </span>
    </button>

    <!-- 新手引导气泡 (AI 智能填表提示浮窗) -->
    <transition name="guide-fade">
      <aside
        v-if="showGuide && !isOpen"
        id="page-agent-guide"
        ref="guideRef"
        class="agent-onboarding-guide"
        :data-placement="panelPlacement"
        role="complementary"
        :aria-label="t('agent.guide.title')"
      >
        <div class="guide-surface">
          <div class="guide-header">
            <span class="guide-badge">
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M8 1.5l1.6 3.8L13.5 7 9.6 8.6 8 12.5 6.4 8.6 2.5 7l3.9-1.7L8 1.5z"
                  fill="currentColor"
                />
              </svg>
              {{ t("agent.guide.badge") }}
            </span>
            <button
              type="button"
              class="guide-close-btn"
              :aria-label="t('agent.guide.dismiss')"
              @click="dismissGuide"
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="m4 4 8 8M12 4 4 12"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>

          <div class="guide-body">
            <h3 class="guide-title">{{ t("agent.guide.title") }}</h3>
            <p class="guide-desc">{{ t("agent.guide.desc") }}</p>
          </div>

          <div class="guide-footer">
            <button
              type="button"
              class="guide-action-btn"
              @click="experienceWithGuide"
            >
              <span>{{ t("agent.guide.action") }}</span>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M3.5 8h9M9 4.5l3.5 3.5L9 11.5"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
          <div class="guide-arrow" aria-hidden="true"></div>
        </div>
      </aside>
    </transition>

    <section
      v-if="isOpen"
      id="page-agent-panel"
      ref="panelRef"
      class="agent-panel-positioner"
      :data-placement="panelPlacement"
      role="dialog"
      aria-modal="false"
      :aria-label="t('agent.accessibility.panelTitle')"
    >
      <div class="agent-panel-surface">
        <header class="panel-header">
          <div>
            <p class="panel-eyebrow">{{ t("agent.entry") }}</p>
            <h2>{{ t("agent.title") }}</h2>
          </div>
          <button
            type="button"
            class="icon-button"
            :aria-label="t('agent.accessibility.closePanel')"
            @click="closePanel"
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="m5 5 10 10M15 5 5 15"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </header>

        <div v-if="!hasConsented" class="consent-view">
          <p class="consent-intro">{{ t("agent.consent.intro") }}</p>
          <ul>
            <li>{{ t("agent.consent.terms.localPersonal") }}</li>
            <li>{{ t("agent.consent.terms.transmission") }}</li>
            <li>{{ t("agent.consent.terms.rateLimit") }}</li>
          </ul>
          <div class="consent-actions">
            <button
              ref="consentButtonRef"
              type="button"
              class="primary-button"
              @click="agreeConsent"
            >
              {{ t("agent.consent.agree") }}
            </button>
            <button type="button" class="text-button" @click="closePanel">
              {{ t("agent.consent.decline") }}
            </button>
          </div>
        </div>

        <template v-else>
          <div ref="messagesRef" class="messages" aria-live="polite">
            <article
              v-for="message in messages"
              :key="message.id"
              class="message"
              :class="[`is-${message.role}`, `is-${message.kind}`]"
            >
              <span
                v-if="message.role !== 'user'"
                class="message-mark"
                aria-hidden="true"
              ></span>
              <p>{{ message.content }}</p>
            </article>

            <div v-if="showPresets" class="preset-chips">
              <button
                v-for="preset in presetCommands"
                :key="preset"
                type="button"
                :disabled="isRunning"
                @click="usePreset(preset)"
              >
                {{ preset }}
              </button>
            </div>
          </div>

          <div class="runtime-status" :class="`is-${status}`" role="status">
            <span class="runtime-dot" aria-hidden="true"></span>
            <span>{{ runtimeStatusText }}</span>
            <button
              v-if="isRunning"
              type="button"
              :disabled="isStopping"
              @click="handleStop"
            >
              {{ t("agent.custom.stop") }}
            </button>
          </div>

          <form class="composer" @submit.prevent="submitCurrentCommand">
            <label for="agent-command">{{ t("agent.custom.title") }}</label>
            <div class="composer-row">
              <textarea
                id="agent-command"
                ref="inputRef"
                v-model="command"
                :placeholder="composerPlaceholder"
                maxlength="300"
                rows="2"
                @keydown="handleCommandKeydown"
              ></textarea>
              <button
                type="submit"
                class="send-button"
                :disabled="!command.trim() || isRunning"
                :aria-label="t('agent.custom.execute')"
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M3.5 10h12M11 5.5l4.5 4.5-4.5 4.5"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>
            <p class="privacy-note">{{ t("agent.notice.localPrivacy") }}</p>
          </form>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AgentOrbVisual from "@/components/AgentOrbVisual.vue";
import { useCommonsStore } from "@/stores/commons";
import { usePageAgentDemo } from "@/composables/usePageAgentDemo";
import { useDraggableAgentOrb } from "@/composables/useDraggableAgentOrb";
import {
  parseFormCommand,
  toCompleteFormIntent,
} from "@/utils/formCommandParser";
import type {
  AssistantMessage,
  ClarificationField,
  PartialFormIntent,
} from "@/types/form-assistant";

const CONSENT_STORAGE_KEY = "multi-step-form-page-agent-consent-v2";
const CONSENT_VERSION = "2";
const GUIDE_STORAGE_KEY = "multi-step-form-page-agent-guide-v1";
const GUIDE_VERSION = "1";

const { t, locale } = useI18n();
const store = useCommonsStore();
const { applyAssistantProgress } = store;
const { status, activityState, activity, load, stop, dispose } =
  usePageAgentDemo();

// The visible UI can change language without interrupting the Agent. The
// runtime is reconciled lazily by execute(..., locale) before the next task, so a
// rapid locale switch never enters a stop/reload race.

const orbRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const guideRef = ref<HTMLElement | null>(null);
const messagesRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);
const consentButtonRef = ref<HTMLButtonElement | null>(null);
const isOpen = ref(false);
const hasConsented = ref(false);
const showGuide = ref(false);
const command = ref("");
const messages = ref<AssistantMessage[]>([]);
const pendingIntent = ref<PartialFormIntent | undefined>();
const clarificationField = ref<ClarificationField | undefined>();
let messageId = 0;

const isRunning = computed(
  () =>
    status.value === "running" ||
    status.value === "loading" ||
    status.value === "stopping",
);
const isStopping = computed(() => status.value === "stopping");
const showPresets = computed(
  () => messages.value.length <= 1 && !pendingIntent.value && !isRunning.value,
);
const presetCommands = computed(() => [
  String(t("agent.presets.preset1")),
  String(t("agent.presets.preset2")),
  String(t("agent.presets.preset3")),
]);
const composerPlaceholder = computed(() =>
  clarificationField.value
    ? String(t(`agent.clarification.${clarificationField.value}`))
    : String(t("agent.custom.placeholder")),
);
const runtimeStatusText = computed(() => {
  if (status.value === "running") {
    return String(t(`agent.activity.${activityState.value}`));
  }
  return String(t(`agent.status.${status.value}`));
});
const orbStateClass = computed(() => ({
  "is-open": isOpen.value,
  "is-loading": status.value === "loading",
  "is-running": status.value === "running",
  "is-completed": status.value === "completed",
  "is-error": status.value === "error",
  "is-stopped": status.value === "stopped",
}));

const appendMessage = (
  role: AssistantMessage["role"],
  kind: AssistantMessage["kind"],
  content: string,
) => {
  messages.value.push({ id: ++messageId, role, kind, content });
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
    }
    refreshPanelPosition();
  });
};

const initializeConversation = () => {
  if (messages.value.length === 0) {
    appendMessage("assistant", "text", String(t("agent.chat.welcome")));
  }
};

const dismissGuide = () => {
  showGuide.value = false;
  try {
    localStorage.setItem(GUIDE_STORAGE_KEY, GUIDE_VERSION);
  } catch {
    // Storage is optional.
  }
};

const experienceWithGuide = () => {
  dismissGuide();
  if (!isOpen.value) togglePanel();
};

const togglePanel = () => {
  if (showGuide.value) dismissGuide();
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    if (hasConsented.value) initializeConversation();
    refreshPanelPosition();
    nextTick(() => {
      if (hasConsented.value) inputRef.value?.focus();
      else consentButtonRef.value?.focus();
    });
  }
};

// Pointer activation is handled by the drag threshold; native keyboard and
// assistive-technology clicks have no pointer click count.
const onOrbClick = (event: MouseEvent) => {
  if (event.detail === 0) togglePanel();
};

const {
  isDragging,
  isPageHidden,
  panelPlacement,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  refreshPanelPosition,
} = useDraggableAgentOrb(orbRef, panelRef, isOpen, togglePanel, guideRef);

const closePanel = () => {
  isOpen.value = false;
  nextTick(() => orbRef.value?.focus());
};

const agreeConsent = () => {
  hasConsented.value = true;
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, CONSENT_VERSION);
  } catch {
    // Consent still applies for the current session.
  }
  initializeConversation();
  load(locale.value).catch(() => {
    // Execution has a local fallback if the demo service is unavailable.
  });
  nextTick(() => inputRef.value?.focus());
};

const getConflictMessage = (codes: string[]): string => {
  const code = codes[0] || "UNKNOWN_COMMAND";
  return String(t(`agent.conflicts.${code}`));
};

const getClarificationQuestion = (field: ClarificationField): string =>
  String(t(`agent.clarification.${field}`));

const runIntent = (
  intent: NonNullable<ReturnType<typeof toCompleteFormIntent>>,
) => {
  // 所有字段已经通过本地校验后直接停在摘要页，避免完整一句话
  // 又触发 prepareAssistantRun() 把表单重置到第 2 步。
  store.applyAssistantIntent(intent);
  pendingIntent.value = undefined;
  clarificationField.value = undefined;
  appendMessage("assistant", "success", String(t("agent.chat.completed")));
};

const submitCommand = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed || isRunning.value) return;
  appendMessage("user", "text", trimmed);
  command.value = "";

  const result = parseFormCommand(trimmed, {
    baseIntent: pendingIntent.value,
    existingPersonalInfo: store.personalInfo,
    focusField: clarificationField.value,
  });

  pendingIntent.value = result.intent;
  if (result.conflictCodes.length === 0) {
    applyAssistantProgress(result.intent);
  }
  if (result.status === "invalid") {
    appendMessage(
      "assistant",
      "error",
      getConflictMessage(result.conflictCodes),
    );
  }

  const completeIntent = toCompleteFormIntent(result);
  if (completeIntent) {
    runIntent(completeIntent);
    return;
  }

  const conflictField = result.conflictCodes.includes("MULTIPLE_PLANS")
    ? "plan"
    : result.conflictCodes.includes("MULTIPLE_BILLING_CYCLES")
    ? "billingCycle"
    : result.conflictCodes.includes("INVALID_EMAIL")
    ? "email"
    : result.conflictCodes.includes("INVALID_PHONE")
    ? "phone"
    : undefined;
  const nextField = conflictField || result.missingFields[0];
  if (nextField) {
    clarificationField.value = nextField;
    appendMessage("assistant", "question", getClarificationQuestion(nextField));
  }
};

const submitCurrentCommand = () => submitCommand(command.value);

const usePreset = (value: string) => {
  if (isRunning.value) return;
  command.value = value;
  nextTick(() => inputRef.value?.focus());
};

const handleCommandKeydown = (event: KeyboardEvent) => {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  submitCurrentCommand();
};

const handleStop = async () => {
  await stop();
  appendMessage("system", "warning", String(t("agent.chat.stopped")));
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Escape" && isOpen.value) closePanel();
};

watch(isOpen, (open) => {
  if (open) refreshPanelPosition();
});

watch(activity, (next, previous) => {
  if (!next || next === previous || !isOpen.value) return;
  if (next.type === "retrying") {
    appendMessage("system", "activity", String(t("agent.activity.retrying")));
  }
});

onMounted(() => {
  try {
    hasConsented.value =
      localStorage.getItem(CONSENT_STORAGE_KEY) === CONSENT_VERSION;
    showGuide.value =
      localStorage.getItem(GUIDE_STORAGE_KEY) !== GUIDE_VERSION;
  } catch {
    hasConsented.value = false;
    showGuide.value = true;
  }
  if (showGuide.value) {
    nextTick(() => refreshPanelPosition());
  }
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
  dispose();
});
</script>

<style scoped lang="scss">
.page-agent-root {
  --agent-navy: #02295a;
  --agent-blue: #174a89;
  --agent-mist: #bde2fd;
  --agent-paper: #fbfcff;
  --agent-ink: #163454;
  position: relative;
  z-index: 2147483000;
  isolation: isolate;
  font-family: "ubuntu-regular", sans-serif;
}

:global(#page-agent-runtime_simulator-mask) {
  z-index: 2147482500 !important;
}

.agent-orb {
  position: fixed;
  top: 0;
  left: 0;
  width: 56px;
  height: 56px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: #ffffff;
  background: transparent;
  cursor: grab;
  touch-action: none;
  user-select: none;
  z-index: 2147483003;
  will-change: transform;
  contain: layout;
  overflow: visible;
  transition: none;
}

.agent-orb:focus-visible {
  outline: 3px solid rgba(127, 0, 255, 0.45);
  outline-offset: 4px;
}

.agent-orb:active,
.is-dragging .agent-orb {
  cursor: grabbing;
}

.orb-core {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  color: #ffffff;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.4))
    drop-shadow(0 0 8px rgba(255, 255, 255, 0.75));
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.agent-orb:hover .orb-core {
  transform: scale(1.08) rotate(6deg);
}

.agent-orb.is-open .orb-core {
  transform: scale(0.92);
}

.orb-core svg {
  position: relative;
  z-index: 1;
  width: 24px;
  height: 24px;
}

.agent-panel-positioner {
  position: fixed;
  top: 0;
  left: 0;
  width: min(370px, calc(100vw - 28px));
  max-height: min(620px, calc(100dvh - 28px));
  box-sizing: border-box;
  z-index: 2147483002;
  pointer-events: auto !important;
  will-change: transform;
}

.agent-panel-surface {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: inherit;
  box-sizing: border-box;
  overflow: hidden;
  background: rgba(251, 252, 255, 0.96);
  border: 1px solid rgba(23, 74, 137, 0.14);
  border-radius: 20px;
  box-shadow: 0 20px 46px rgba(2, 41, 90, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  transform-origin: right center;
  will-change: transform, opacity;
  animation: panel-gather 240ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.agent-panel-positioner[data-placement="right"] .agent-panel-surface {
  transform-origin: left center;
}
.agent-panel-positioner[data-placement="top"] .agent-panel-surface {
  transform-origin: center bottom;
}
.agent-panel-positioner[data-placement="bottom"] .agent-panel-surface {
  transform-origin: center top;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 18px 18px 14px;
  border-bottom: 1px solid rgba(23, 74, 137, 0.09);
}

.panel-eyebrow {
  margin: 0 0 3px;
  color: #63798e;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.panel-header h2 {
  margin: 0;
  color: var(--agent-navy);
  font-family: "ubuntu-bold", sans-serif;
  font-size: 17px;
}

.icon-button {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: #63798e;
  background: transparent;
  cursor: pointer;
}

.icon-button:hover {
  background: rgba(23, 74, 137, 0.08);
  color: var(--agent-navy);
}
.icon-button svg {
  width: 18px;
  height: 18px;
}

.consent-view {
  padding: 20px;
  overflow-y: auto;
  color: var(--agent-ink);
}

.consent-intro {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.55;
}
.consent-view ul {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 7px;
  margin: 0;
  padding-left: 20px;
  color: #587087;
  font-size: 12px;
  line-height: 1.55;
  list-style: disc;
}
.consent-view li {
  display: list-item;
  width: auto;
}
.consent-view li + li {
  margin-top: 0;
}
.consent-actions {
  display: grid;
  gap: 8px;
  margin-top: 20px;
}

.primary-button,
.send-button {
  border: 0;
  color: #fff;
  background: var(--agent-navy);
  cursor: pointer;
}

.primary-button {
  min-height: 42px;
  border-radius: 12px;
  font-family: "ubuntu-bold", sans-serif;
}

.text-button {
  min-height: 36px;
  border: 0;
  color: #63798e;
  background: transparent;
  cursor: pointer;
}

.messages {
  flex: 1 1 210px;
  min-height: 0;
  max-height: 345px;
  padding: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 10px;
}

.message p {
  max-width: 88%;
  margin: 0;
  padding: 9px 11px;
  border-radius: 13px 13px 13px 4px;
  color: var(--agent-ink);
  background: #edf3f8;
  font-size: 12.5px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.message-mark {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  margin-top: 12px;
  border-radius: 50%;
  background: var(--agent-blue);
}

.message.is-user {
  justify-content: flex-end;
}
.message.is-user p {
  color: #fff;
  background: var(--agent-navy);
  border-radius: 13px 13px 4px 13px;
}
.message.is-warning p {
  background: #f4eee1;
  color: #69542b;
}
.message.is-error p {
  background: #f7e9ea;
  color: #813f45;
}
.message.is-success p {
  background: #e9f2ed;
  color: #356a51;
}
.message.is-activity p {
  border: 1px solid rgba(23, 74, 137, 0.12);
  background: transparent;
}

.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  padding-left: 15px;
}

.preset-chips button {
  padding: 7px 9px;
  border: 1px solid rgba(23, 74, 137, 0.18);
  border-radius: 999px;
  color: var(--agent-blue);
  background: #fff;
  font-size: 11px;
  cursor: pointer;
}
.preset-chips button:hover {
  background: #edf3f8;
}

.runtime-status {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 7px 16px;
  color: #63798e;
  background: rgba(237, 243, 248, 0.72);
  border-top: 1px solid rgba(23, 74, 137, 0.07);
  border-bottom: 1px solid rgba(23, 74, 137, 0.07);
  font-size: 11.5px;
}

.runtime-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #7c91a3;
}
.runtime-status.is-running .runtime-dot,
.runtime-status.is-loading .runtime-dot {
  background: var(--agent-blue);
  animation: status-breathe 1.2s ease-in-out infinite;
}
.runtime-status.is-completed .runtime-dot {
  background: #639378;
}
.runtime-status.is-error .runtime-dot {
  background: #a9565d;
}
.runtime-status button {
  margin-left: auto;
  border: 0;
  color: #813f45;
  background: transparent;
  cursor: pointer;
  font-size: 11.5px;
}

.composer {
  padding: 12px 14px 14px;
}
.composer > label {
  display: block;
  margin-bottom: 6px;
  color: var(--agent-ink);
  font-family: "ubuntu-medium", sans-serif;
  font-size: 11.5px;
}
.composer-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 38px;
  align-items: end;
  gap: 8px;
}
.composer textarea {
  min-height: 50px;
  max-height: 100px;
  padding: 10px 11px;
  resize: vertical;
  border: 1px solid rgba(23, 74, 137, 0.18);
  border-radius: 12px;
  outline: none;
  color: var(--agent-ink);
  background: #fff;
  font-family: inherit;
  font-size: 12.5px;
  line-height: 1.45;
  box-sizing: border-box;
}
.composer textarea:focus {
  border-color: var(--agent-blue);
  box-shadow: 0 0 0 3px rgba(23, 74, 137, 0.09);
}
.send-button {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
}
.send-button:active {
  transform: scale(0.96);
}
.send-button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
.send-button svg {
  width: 19px;
  height: 19px;
}
.privacy-note {
  margin: 7px 2px 0;
  color: #7c91a3;
  font-size: 10.5px;
  line-height: 1.4;
}

.is-page-hidden *,
.is-page-hidden *::before,
.is-page-hidden *::after {
  animation-play-state: paused !important;
}

@keyframes panel-gather {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes status-breathe {
  50% {
    transform: scale(1.35);
    opacity: 0.45;
  }
}

/* ================= 新手引导浮窗 (AI Onboarding Guide) ================= */
.agent-onboarding-guide {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 2147483002;
  width: min(280px, calc(100vw - 84px));
  pointer-events: auto;
  contain: layout;
  will-change: transform;
}

.guide-surface {
  position: relative;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.92);
  box-shadow:
    0 16px 36px -6px rgba(2, 41, 90, 0.18),
    0 4px 16px rgba(65, 62, 255, 0.08),
    inset 0 1px 1.5px rgba(255, 255, 255, 1);
  padding: 13px 14px 12px;
  animation: guide-float 4.5s ease-in-out infinite;
}

.guide-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 7px;
}

.guide-badge {
  display: inline-flex;
  align-items: center;
  gap: 4.5px;
  padding: 2.5px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  font-family: "ubuntu-bold", sans-serif;
  background: linear-gradient(
    135deg,
    rgba(65, 62, 255, 0.12) 0%,
    rgba(0, 242, 254, 0.15) 100%
  );
  color: #413eff;
  border: 1px solid rgba(65, 62, 255, 0.22);
}

.guide-badge svg {
  width: 12px;
  height: 12px;
  color: #413eff;
}

.guide-close-btn {
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  display: grid;
  place-items: center;
  color: #94a3b8;
  transition: all 0.15s ease;
}

.guide-close-btn:hover {
  color: #334155;
  background: rgba(0, 0, 0, 0.06);
}

.guide-close-btn svg {
  width: 12px;
  height: 12px;
}

.guide-body {
  margin-bottom: 9px;
}

.guide-title {
  margin: 0 0 3px;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--agent-navy);
  font-family: "ubuntu-bold", sans-serif;
  line-height: 1.35;
}

.guide-desc {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: #64748b;
  font-family: "ubuntu-regular", sans-serif;
}

.guide-footer {
  display: flex;
}

.guide-action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, #02295a 0%, #174a89 100%);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  font-family: "ubuntu-medium", sans-serif;
  box-shadow: 0 3px 10px rgba(2, 41, 90, 0.22);
  transition:
    transform 0.18s cubic-bezier(0.16, 1, 0.3, 1),
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.guide-action-btn:hover {
  background: linear-gradient(135deg, #174a89 0%, #413eff 100%);
  box-shadow: 0 5px 14px rgba(65, 62, 255, 0.32);
  transform: translateY(-1px);
}

.guide-action-btn:active {
  transform: translateY(0);
}

.guide-action-btn svg {
  width: 13px;
  height: 13px;
}

.guide-arrow {
  position: absolute;
  width: 10px;
  height: 10px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.92);
  pointer-events: none;
}

.agent-onboarding-guide[data-placement="left"] .guide-arrow {
  right: -5px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  border-left: none;
  border-bottom: none;
}

.agent-onboarding-guide[data-placement="right"] .guide-arrow {
  left: -5px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  border-right: none;
  border-top: none;
}

.agent-onboarding-guide[data-placement="top"] .guide-arrow {
  left: 50%;
  bottom: -5px;
  transform: translateX(-50%) rotate(45deg);
  border-left: none;
  border-top: none;
}

.agent-onboarding-guide[data-placement="bottom"] .guide-arrow {
  left: 50%;
  top: -5px;
  transform: translateX(-50%) rotate(45deg);
  border-right: none;
  border-bottom: none;
}

.guide-fade-enter-active,
.guide-fade-leave-active {
  transition:
    opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.guide-fade-enter-from,
.guide-fade-leave-to {
  opacity: 0;
  transform: scale(0.92);
}

@keyframes guide-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

@media (max-width: 600px) {
  .agent-panel-positioner {
    width: calc(100vw - 28px);
    max-height: calc(100dvh - 28px);
  }
  .agent-panel-surface {
    border-radius: 16px;
  }
  .messages {
    max-height: min(330px, 42dvh);
  }
  .agent-onboarding-guide {
    width: calc(100vw - 84px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .runtime-dot {
    animation: none !important;
  }
  .agent-panel-surface {
    animation: none;
  }
  .guide-surface {
    animation: none !important;
  }
}
</style>
