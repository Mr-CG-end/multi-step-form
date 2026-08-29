import type { PiniaPlugin, PiniaPluginContext } from "pinia";
import { debounce } from "@/utils/debounce";

// 存在浏览器的名称
const STORAGE_KEY = "multi-step-form-state";
// 有效期
const EXPIRY_DAYS = 7;
// 防抖时间
const DEBOUNCE_MS = 500;
const TAB_IDS = new Set(["1", "2", "3", "4", "5"]);
const PLAN_IDS = new Set(["1", "2", "3"]);
const ADDON_IDS = new Set(["1", "2", "3"]);

interface PersistedState {
  nowTab: string;
  personalInfo: { name: string; email: string; phone: string };
  plan: string;
  addonIds: string[];
  isYearly: boolean;
  completedSteps: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown, allowed?: Set<string>): value is string[] {
  return Array.isArray(value) && value.every(
    (item) => typeof item === "string" && (!allowed || allowed.has(item)),
  );
}

function isValidPersistedState(value: unknown): value is PersistedState {
  if (!isRecord(value) || !isRecord(value.personalInfo)) return false;
  const personalInfo = value.personalInfo;
  return (
    typeof personalInfo.name === "string" &&
    typeof personalInfo.email === "string" &&
    typeof personalInfo.phone === "string" &&
    typeof value.nowTab === "string" && TAB_IDS.has(value.nowTab) &&
    typeof value.plan === "string" && PLAN_IDS.has(value.plan) &&
    isStringArray(value.addonIds, ADDON_IDS) &&
    new Set(value.addonIds).size === value.addonIds.length &&
    typeof value.isYearly === "boolean" &&
    isStringArray(value.completedSteps, TAB_IDS) &&
    new Set(value.completedSteps).size === value.completedSteps.length
  );
}

function clearStoredState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable in privacy-restricted environments.
  }
}

export const piniaPersistedState: PiniaPlugin = ({ store }) => {
  // 判断是否是common
  if (store.$id !== "commonsStore") return;
  // 应用启动，从本地恢复
  restoreState(store);
  // 使用$subscribe监听状态变化，防抖500ms保存
  store.$subscribe(
    debounce((_mutation: unknown, state: unknown) => {
      saveState(state);
    }, DEBOUNCE_MS),
  );
};

// 保存
const saveState = (state: unknown) => {
  if (!isRecord(state)) return;
  // 如果当前是第五步（感谢页），不再进行保存，强制清除缓存以防止防抖带来的重复写入
  if (state.nowTab === "5") {
    clearStoredState();
    return;
  }

  try {
    // 定义数据
    const data = {
      timestamp: Date.now(),
      state: state,
    };
    // 存储
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    // 错误处理，
    console.error("保存失败", error);
  }
};

// 恢复
const restoreState = (store: PiniaPluginContext["store"]) => {
  try {
    // 把存的值拿出来，没有就返回
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    // 解构出时间，判断时间是否超时，是就清除掉数据
    const parsed: unknown = JSON.parse(saved);
    if (
      !isRecord(parsed) ||
      typeof parsed.timestamp !== "number" ||
      !Number.isFinite(parsed.timestamp) ||
      !isValidPersistedState(parsed.state)
    ) {
      clearStoredState();
      return;
    }
    const { timestamp, state } = parsed;
    const now = Date.now();
    if (now - timestamp > EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
      clearStoredState();
      return;
    }
    // 没有就填进store
    store.$patch((current) => {
      Object.assign(current, state);
    });
  } catch (error) {
    // 恢复失败，将存储的错误数据清除
    console.error("恢复失败", error);
    clearStoredState();
  }
};

// 清空数据（提交成功后用）
export function clearPersistedState() {
  clearStoredState();
}
