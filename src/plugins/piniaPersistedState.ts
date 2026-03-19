import type { PiniaPlugin } from "pinia";
import { debounce } from "lodash";

// 存在浏览器的名称
const STORAGE_KEY = "multi-step-form-state";
// 有效期
const EXPIRY_DAYS = 7;
// 防抖时间
const DEBOUNCE_MS = 500;

export const piniaPersistedState: PiniaPlugin = ({ store }) => {
  // 判断是否是common
  if (store.$id !== "commonsStore") return;
  // 应用启动，从本地恢复
  restoreState(store);
  // 使用$subscribe监听状态变化，防抖500ms保存
  store.$subscribe(
    debounce((_mutation, state) => {
      saveState(state);
    }, DEBOUNCE_MS),
  );
};

// 保存
const saveState = (state: any) => {
  // 如果当前是第五步（感谢页），不再进行保存，强制清除缓存以防止防抖带来的重复写入
  if (state.nowTab === "5") {
    localStorage.removeItem(STORAGE_KEY);
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
const restoreState = (store: any) => {
  try {
    // 把存的值拿出来，没有就返回
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    // 解构出时间，判断时间是否超时，是就清除掉数据
    const { timestamp, state } = JSON.parse(saved);
    const now = Date.now();
    if (now - timestamp > EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    // 没有就填进store
    store.$patch(state);
  } catch (error) {
    // 恢复失败，将存储的错误数据清除
    console.error("恢复失败", error);
    localStorage.removeItem(STORAGE_KEY);
  }
};

// 清空数据（提交成功后用）
export function clearPersistedState() {
  localStorage.removeItem(STORAGE_KEY);
}
