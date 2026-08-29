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
    <div ref="trailLayerRef" class="orb-trail-layer" aria-hidden="true"></div>

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
      <AgentOrbVisual :state="status" :paused="isPageHidden" :active="isOpen || isDragging" />
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
              <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
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
              <span v-if="message.role !== 'user'" class="message-mark" aria-hidden="true"></span>
              <p>{{ message.content }}</p>
            </article>

            <div v-if="showPresets" class="preset-chips">
              <button
                v-for="preset in presetCommands"
                :key="preset"
                type="button"
                :disabled="isRunning"
                @click="submitCommand(preset)"
              >
                {{ preset }}
              </button>
            </div>
          </div>

          <div class="runtime-status" :class="`is-${status}`" role="status">
            <span class="runtime-dot" aria-hidden="true"></span>
            <span>{{ runtimeStatusText }}</span>
            <button v-if="isRunning" type="button" :disabled="isStopping" @click="handleStop">
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
                  <path d="M3.5 10h12M11 5.5l4.5 4.5-4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
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
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";
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

const { t, locale } = useI18n();
const store = useCommonsStore();
const { status, activityState, activity, load, execute, stop, dispose } =
  usePageAgentDemo();

const orbRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const trailLayerRef = ref<HTMLElement | null>(null);
const messagesRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);
const consentButtonRef = ref<HTMLButtonElement | null>(null);
const isOpen = ref(false);
const hasConsented = ref(false);
const command = ref("");
const messages = ref<AssistantMessage[]>([]);
const pendingIntent = ref<PartialFormIntent | undefined>();
const clarificationField = ref<ClarificationField | undefined>();
let messageId = 0;

const isRunning = computed(
  () => status.value === "running" || status.value === "loading" || status.value === "stopping",
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

const togglePanel = () => {
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
} = useDraggableAgentOrb(
  orbRef,
  panelRef,
  trailLayerRef,
  isOpen,
  togglePanel,
);

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

const formatIntentSummary = (intent: NonNullable<ReturnType<typeof toCompleteFormIntent>>): string => {
  const plan = String(t(`items.plans.${intent.plan}.name`));
  const cycle = String(t(`common.period.${intent.billingCycle}`));
  const addons = intent.addonIds.length
    ? intent.addonIds
        .map((id) => String(t(`items.addons.${id}.title`)))
        .join(String(t("agent.chat.listSeparator")))
    : String(t("form.summary.noAddons"));
  return String(
    t("agent.chat.confirmed", {
      name: intent.personalInfo.name,
      plan,
      cycle,
      addons,
    }),
  );
};

const runIntent = async (
  intent: NonNullable<ReturnType<typeof toCompleteFormIntent>>,
) => {
  appendMessage("assistant", "activity", formatIntentSummary(intent));
  pendingIntent.value = undefined;
  clarificationField.value = undefined;
  const result = await execute(intent, locale.value);
  if (result.success && result.repaired) {
    appendMessage("system", "warning", String(t("agent.chat.repaired")));
  } else if (result.success) {
    appendMessage("assistant", "success", String(t("agent.chat.completed")));
  } else if (result.message !== "AGENT_STOPPED") {
    appendMessage("assistant", "error", String(t("agent.chat.failed")));
  }
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
  if (result.status === "invalid") {
    appendMessage("assistant", "error", getConflictMessage(result.conflictCodes));
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

watch(locale, async (nextLocale) => {
  if (!hasConsented.value) return;
  if (isRunning.value) await handleStop();
  await load(nextLocale).catch(() => undefined);
  refreshPanelPosition();
});

onMounted(() => {
  try {
    hasConsented.value =
      localStorage.getItem(CONSENT_STORAGE_KEY) === CONSENT_VERSION;
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

.orb-trail-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 2147482998;
  contain: strict;
}

:deep(.orb-smoke-particle) {
  --particle-x: 0px;
  --particle-y: 0px;
  --particle-dx: 0px;
  --particle-dy: 0px;
  --particle-color: rgba(0, 242, 254, 0.9);
  --particle-size: 10px;
  --particle-duration: 420ms;
  position: fixed;
  top: 0;
  left: 0;
  width: var(--particle-size);
  height: var(--particle-size);
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  background: radial-gradient(
    circle,
    #ffffff 0%,
    var(--particle-color) 45%,
    transparent 85%
  );
  box-shadow: 0 0 10px var(--particle-color);
  filter: blur(0.5px);
  transform: translate3d(var(--particle-x), var(--particle-y), 0) scale(0.6);
}

:deep(.orb-smoke-particle.is-active) {
  animation: stardust-trail var(--particle-duration) cubic-bezier(0.12, 0.8, 0.32, 1) forwards;
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
  z-index: 2147483002;
  pointer-events: auto !important;
  will-change: transform;
}

.agent-panel-surface {
  display: flex;
  flex-direction: column;
  max-height: inherit;
  overflow: hidden;
  background: rgba(251, 252, 255, 0.96);
  border: 1px solid rgba(23, 74, 137, 0.14);
  border-radius: 20px;
  box-shadow: 0 20px 46px rgba(2, 41, 90, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(18px);
  transform-origin: right center;
  animation: panel-gather 240ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.agent-panel-positioner[data-placement="right"] .agent-panel-surface { transform-origin: left center; }
.agent-panel-positioner[data-placement="top"] .agent-panel-surface { transform-origin: center bottom; }
.agent-panel-positioner[data-placement="bottom"] .agent-panel-surface { transform-origin: center top; }

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

.icon-button:hover { background: rgba(23, 74, 137, 0.08); color: var(--agent-navy); }
.icon-button svg { width: 18px; height: 18px; }

.consent-view {
  padding: 20px;
  overflow-y: auto;
  color: var(--agent-ink);
}

.consent-intro { margin: 0 0 12px; font-size: 14px; line-height: 1.55; }
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
.consent-view li { display: list-item; width: auto; }
.consent-view li + li { margin-top: 0; }
.consent-actions { display: grid; gap: 8px; margin-top: 20px; }

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

.message.is-user { justify-content: flex-end; }
.message.is-user p {
  color: #fff;
  background: var(--agent-navy);
  border-radius: 13px 13px 4px 13px;
}
.message.is-warning p { background: #f4eee1; color: #69542b; }
.message.is-error p { background: #f7e9ea; color: #813f45; }
.message.is-success p { background: #e9f2ed; color: #356a51; }
.message.is-activity p { border: 1px solid rgba(23, 74, 137, 0.12); background: transparent; }

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
.preset-chips button:hover { background: #edf3f8; }

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

.runtime-dot { width: 7px; height: 7px; border-radius: 50%; background: #7c91a3; }
.runtime-status.is-running .runtime-dot,
.runtime-status.is-loading .runtime-dot { background: var(--agent-blue); animation: status-breathe 1.2s ease-in-out infinite; }
.runtime-status.is-completed .runtime-dot { background: #639378; }
.runtime-status.is-error .runtime-dot { background: #a9565d; }
.runtime-status button { margin-left: auto; border: 0; color: #813f45; background: transparent; cursor: pointer; font-size: 11.5px; }

.composer { padding: 12px 14px 14px; }
.composer > label { display: block; margin-bottom: 6px; color: var(--agent-ink); font-family: "ubuntu-medium", sans-serif; font-size: 11.5px; }
.composer-row { display: grid; grid-template-columns: minmax(0, 1fr) 38px; align-items: end; gap: 8px; }
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
.composer textarea:focus { border-color: var(--agent-blue); box-shadow: 0 0 0 3px rgba(23, 74, 137, 0.09); }
.send-button { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; }
.send-button:active { transform: scale(0.96); }
.send-button:disabled { cursor: not-allowed; opacity: 0.4; }
.send-button svg { width: 19px; height: 19px; }
.privacy-note { margin: 7px 2px 0; color: #7c91a3; font-size: 10.5px; line-height: 1.4; }

.is-page-hidden *,
.is-page-hidden *::before,
.is-page-hidden *::after { animation-play-state: paused !important; }

@keyframes stardust-trail {
  0% {
    opacity: 0.95;
    transform: translate3d(var(--particle-x), var(--particle-y), 0) scale(1);
    filter: blur(0.5px) brightness(1.3);
  }
  50% {
    opacity: 0.7;
    filter: blur(1px) brightness(1.1);
  }
  100% {
    opacity: 0;
    transform: translate3d(
      calc(var(--particle-x) + var(--particle-dx)),
      calc(var(--particle-y) + var(--particle-dy)),
      0
    ) scale(0.1);
    filter: blur(2.5px);
  }
}
@keyframes panel-gather {
  from { opacity: 0; transform: scale(0.88); filter: blur(6px); }
  to { opacity: 1; transform: scale(1); filter: blur(0); }
}
@keyframes status-breathe { 50% { transform: scale(1.35); opacity: 0.45; } }

@media (max-width: 600px) {
  .agent-panel-positioner { width: calc(100vw - 28px); max-height: calc(100dvh - 28px); }
  .messages { max-height: min(330px, 42dvh); }
}

@media (prefers-reduced-motion: reduce) {
  .runtime-dot,
  :deep(.orb-smoke-particle) { animation: none !important; }
  .agent-panel-surface { animation: none; }
}
</style>
