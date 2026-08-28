import { readonly, ref } from "vue";
import { useCommonsStore } from "@/stores/commons";
import type {
  AgentActivityState,
  CommonsSnapshot,
  FormIntent,
} from "@/types/form-assistant";
import type {
  IPageAgentActivity,
  IPageAgentDemoControls,
  IPageAgentDemoResult,
  IPageAgentInstance,
  PageAgentDemoStatus,
} from "@/types/page-agent";

const CDN_BASE_URL =
  "https://cdn.jsdelivr.net/npm/page-agent@1.12.2/dist/iife/page-agent.demo.js";
const DEMO_MODEL = "qwen3.5-plus";
const DEMO_BASE_URL =
  "https://page-ag-testing-ohftxirgbn.cn-shanghai.fcapp.run";
const DEMO_API_KEY = "NA";
const SCRIPT_ID = "page-agent-demo-script";
const OFFICIAL_PANEL_ID = "page-agent-runtime_agent-panel";
const LOAD_TIMEOUT_MS = 10000;

const status = ref<PageAgentDemoStatus>("idle");
const errorMessage = ref("");
const activityState = ref<AgentActivityState>("idle");
const activity = ref<IPageAgentActivity | null>(null);

let loadedLocale = "";
let loadPromise: Promise<void> | null = null;
let activeSnapshot: CommonsSnapshot | null = null;
let activeIntent: FormIntent | null = null;
let currentAgent: IPageAgentInstance | null = null;
let executionVersion = 0;
let runtimeVersion = 0;
let cancelScriptLoad: (() => void) | null = null;

const planNames = {
  "zh-CN": { "1": "基础版", "2": "高级版", "3": "专业版" },
  "zh-TW": { "1": "基礎版", "2": "高級版", "3": "專業版" },
  en: { "1": "Arcade", "2": "Advanced", "3": "Pro" },
} as const;

const addonNames = {
  "zh-CN": {
    "1": "在线服务",
    "2": "更大存储空间",
    "3": "自定义个人资料",
  },
  "zh-TW": {
    "1": "線上服務",
    "2": "更大儲存空間",
    "3": "自訂個人檔案",
  },
  en: {
    "1": "Online service",
    "2": "Larger storage",
    "3": "Customizable profile",
  },
} as const;

function mapLocaleToAgentLang(locale: string): "zh-CN" | "en-US" {
  return locale.startsWith("en") ? "en-US" : "zh-CN";
}

function normalizeLocale(locale: string): keyof typeof planNames {
  if (locale === "zh-TW") return "zh-TW";
  return locale.startsWith("en") ? "en" : "zh-CN";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function redactPageContent(content: string): string {
  const store = useCommonsStore();
  let sanitized = content;
  for (const value of [
    store.personalInfo.name,
    store.personalInfo.email,
    store.personalInfo.phone,
  ]) {
    const trimmed = value.trim();
    if (trimmed) {
      sanitized = sanitized.replace(
        new RegExp(escapeRegExp(trimmed), "gi"),
        "[LOCAL_DATA]",
      );
    }
  }
  return sanitized
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[LOCAL_EMAIL]")
    .replace(/1[3-9](?:[\s-]?\d){9}/g, "[LOCAL_PHONE]");
}

function removeOfficialPanel(): void {
  document.getElementById(OFFICIAL_PANEL_ID)?.remove();
}

function waitForConstructor(timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (window.PageAgent) {
        window.clearInterval(timer);
        resolve();
      } else if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer);
        reject(new Error("AGENT_LOAD_TIMEOUT"));
      }
    }, 80);
  });
}

function mapActivityState(detail: IPageAgentActivity): AgentActivityState {
  if (detail.type === "thinking") return "thinking";
  if (detail.type === "retrying") return "retrying";
  if (detail.type === "error") return "error";
  return "executing";
}

const handleAgentStatus: EventListener = () => {
  if (status.value === "stopped") return;
  if (currentAgent?.status === "running") status.value = "running";
  if (currentAgent?.status === "stopped") status.value = "stopped";
  if (currentAgent?.status === "error") status.value = "error";
  removeOfficialPanel();
};

const handleAgentActivity: EventListener = (event) => {
  const detail = (event as CustomEvent<IPageAgentActivity>).detail;
  activity.value = detail;
  activityState.value = mapActivityState(detail);
  removeOfficialPanel();
};

function detachAgentListeners(agent: IPageAgentInstance): void {
  agent.removeEventListener("statuschange", handleAgentStatus);
  agent.removeEventListener("activity", handleAgentActivity);
}

function disposeInstance(): void {
  if (!currentAgent) return;
  detachAgentListeners(currentAgent);
  try {
    currentAgent.dispose();
  } catch {
    // Runtime cleanup must never break the regular form.
  }
  currentAgent = null;
  window.pageAgent = undefined;
  removeOfficialPanel();
}

function createHeadlessDemoAgent(targetLang: "zh-CN" | "en-US"): void {
  if (!window.PageAgent) throw new Error("AGENT_NOT_INITIALIZED");
  disposeInstance();

  const agent = new window.PageAgent({
    model: DEMO_MODEL,
    baseURL: DEMO_BASE_URL,
    apiKey: DEMO_API_KEY,
    language: targetLang,
    promptForNextTask: false,
    transformPageContent: redactPageContent,
  });

  // The demo class always creates a Panel. Dispose it before the first status
  // event can force the official input back onto the page.
  agent.panel?.dispose();
  agent.onAskUser = undefined;
  removeOfficialPanel();

  currentAgent = agent;
  window.pageAgent = agent;
  agent.addEventListener("statuschange", handleAgentStatus);
  agent.addEventListener("activity", handleAgentActivity);
}

async function load(locale: string): Promise<void> {
  const targetLang = mapLocaleToAgentLang(locale);
  if (status.value === "running") return;
  if (loadedLocale === locale && currentAgent) return;
  if (loadPromise) {
    await loadPromise;
    if (loadedLocale !== locale) return load(locale);
    return;
  }
  const version = runtimeVersion;

  status.value = "loading";
  errorMessage.value = "";

  loadPromise = (async () => {
    try {
      if (!window.PageAgent) {
        document.getElementById(SCRIPT_ID)?.remove();
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          const finish = (error?: Error) => {
            window.clearTimeout(timeout);
            script.onload = null;
            script.onerror = null;
            cancelScriptLoad = null;
            if (error) {
              script.remove();
              reject(error);
            } else resolve();
          };
          const timeout = window.setTimeout(
            () => finish(new Error("AGENT_LOAD_TIMEOUT")),
            LOAD_TIMEOUT_MS,
          );
          cancelScriptLoad = () => finish(new Error("AGENT_LOAD_CANCELLED"));
          script.id = SCRIPT_ID;
          script.src = `${CDN_BASE_URL}?autoInit=false&lang=${targetLang}`;
          script.async = true;
          script.crossOrigin = "anonymous";
          script.onload = () => finish();
          script.onerror = () => finish(new Error("AGENT_SCRIPT_LOAD_FAILED"));
          document.head.appendChild(script);
        });
        await waitForConstructor(LOAD_TIMEOUT_MS);
      }

      if (version !== runtimeVersion) throw new Error("AGENT_LOAD_CANCELLED");
      createHeadlessDemoAgent(targetLang);
      loadedLocale = locale;
      status.value = "idle";
      activityState.value = "idle";
    } catch (error: unknown) {
      if (version !== runtimeVersion) throw error;
      status.value = "error";
      errorMessage.value =
        error instanceof Error ? error.message : "AGENT_LOAD_FAILED";
      throw error;
    } finally {
      if (version === runtimeVersion) loadPromise = null;
      removeOfficialPanel();
    }
  })();

  return loadPromise;
}

function buildTaskPrompt(intent: FormIntent, locale: string): string {
  const activeLocale = normalizeLocale(locale);
  const plan = planNames[activeLocale][intent.plan];
  const cycle =
    intent.billingCycle === "yearly" ? "yearly / 年付" : "monthly / 月付";
  const addons = intent.addonIds.map((id) => addonNames[activeLocale][id]);
  const addonInstruction =
    addons.length > 0
      ? addons.join(", ")
      : "none / 不选择任何附加服务";

  return [
    "Operate only the subscription form that is already on Step 2.",
    "Personal information was validated locally. Never navigate back to Step 1 and never edit personal data.",
    `Select exactly this plan: ${plan}.`,
    `Select exactly this billing cycle: ${cycle}.`,
    "Continue to Step 3.",
    `Make selected add-ons exactly: ${addonInstruction}. Deselect every other add-on.`,
    "Continue to Step 4 Summary, then stop successfully.",
    "Never click the final Confirm button.",
  ].join("\n");
}

function locallyComplete(intent: FormIntent): void {
  activityState.value = "repairing";
  useCommonsStore().applyAssistantIntent(intent);
}

async function execute(
  intent: FormIntent,
  locale: string,
): Promise<IPageAgentDemoResult> {
  if (activeIntent) {
    return {
      success: false,
      message: "AGENT_ALREADY_RUNNING",
      repaired: false,
    };
  }

  const store = useCommonsStore();
  const version = ++executionVersion;
  const stoppedResult: IPageAgentDemoResult = {
    success: false, message: "AGENT_STOPPED", repaired: false,
  };
  activeSnapshot = store.createSnapshot();
  activeIntent = intent;
  errorMessage.value = "";
  activity.value = null;

  try {
    await load(locale);
  } catch {
    if (version !== executionVersion) return stoppedResult;
    locallyComplete(intent);
    status.value = "completed";
    activityState.value = "completed";
    activeSnapshot = null;
    activeIntent = null;
    return { success: true, message: "AGENT_LOCAL_FALLBACK", repaired: true };
  }

  if (version !== executionVersion) return stoppedResult;
  if (!currentAgent) {
    locallyComplete(intent);
    status.value = "completed";
    activityState.value = "completed";
    activeSnapshot = null;
    activeIntent = null;
    return { success: true, message: "AGENT_LOCAL_FALLBACK", repaired: true };
  }

  store.prepareAssistantRun(intent);
  status.value = "running";
  activityState.value = "thinking";

  try {
    const result = await currentAgent.execute(buildTaskPrompt(intent, locale));
    removeOfficialPanel();

    if (version !== executionVersion || (status.value as PageAgentDemoStatus) === "stopped") {
      return { success: false, message: "AGENT_STOPPED", repaired: false };
    }
    if (result.success && store.matchesAssistantIntent(intent)) {
      status.value = "completed";
      activityState.value = "completed";
      activeSnapshot = null;
      activeIntent = null;
      return {
        success: true,
        message: "AGENT_EXECUTION_SUCCESS",
        repaired: false,
      };
    }

    locallyComplete(intent);
    status.value = "completed";
    activityState.value = "completed";
    activeSnapshot = null;
    activeIntent = null;
    return { success: true, message: "AGENT_RESULT_REPAIRED", repaired: true };
  } catch {
    if (version !== executionVersion || (status.value as PageAgentDemoStatus) === "stopped") {
      return { success: false, message: "AGENT_STOPPED", repaired: false };
    }
    locallyComplete(intent);
    status.value = "completed";
    activityState.value = "completed";
    activeSnapshot = null;
    activeIntent = null;
    return { success: true, message: "AGENT_RESULT_REPAIRED", repaired: true };
  } finally {
    removeOfficialPanel();
  }
}

async function stop(): Promise<void> {
  if (status.value !== "running" && status.value !== "loading") return;
  executionVersion += 1;
  if (status.value === "loading") {
    runtimeVersion += 1;
    cancelScriptLoad?.();
    loadPromise = null;
  }
  status.value = "stopped";
  try {
    await currentAgent?.stop();
  } catch {
    // Local transaction restoration still proceeds.
  }

  if (activeSnapshot) useCommonsStore().restoreSnapshot(activeSnapshot);
  activeSnapshot = null;
  activeIntent = null;
  activityState.value = "idle";
  removeOfficialPanel();
}

function dispose(): void {
  executionVersion += 1;
  runtimeVersion += 1;
  cancelScriptLoad?.();
  if (activeSnapshot && activeIntent) {
    useCommonsStore().restoreSnapshot(activeSnapshot);
  }
  activeSnapshot = null;
  activeIntent = null;
  disposeInstance();
  document.getElementById(SCRIPT_ID)?.remove();
  window.PageAgent = undefined;
  loadedLocale = "";
  loadPromise = null;
  status.value = "idle";
  activityState.value = "idle";
  activity.value = null;
  errorMessage.value = "";
}

export function usePageAgentDemo(): IPageAgentDemoControls {
  return {
    status: readonly(status),
    errorMessage: readonly(errorMessage),
    activityState: readonly(activityState),
    activity: readonly(activity),
    load,
    execute,
    stop,
    dispose,
  };
}
