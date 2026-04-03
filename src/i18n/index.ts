import { createI18n } from "vue-i18n";
import en from "./locales/en";
import zhTW from "./locales/zh-TW";
import zhCN from "./locales/zh-CN";

// localstorage 儲存语言偏好 key
const LOCAL_STORAGE_KEY = "multi-step-form-locale";

/**
 * 获取用户语言偏好
 * @returns {string} 用户语言偏好
 * localstorage(本地储存) -> navigator.language(浏览器语言) -> default(默认)
 */
const getStoredLocale = (): string => {
  const storedLocale = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (storedLocale && ["en", "zh-CN", "zh-TW"].includes(storedLocale))
    return storedLocale;
  const browserLocale = navigator.language;
  if (browserLocale.startsWith("zh-TW") || browserLocale.startsWith("zh-HK"))
    return "zh-TW";
  if (browserLocale.startsWith("en")) return "en";
  return "zh-CN";
};

/**
 * 保存用户语言偏好到本地储存
 * @param {string} locale 用户语言偏好
 */
export const setStoredLocale = (locale: string): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, locale);
  } catch (error) {
    console.error("保存失败", error);
  }
};

// 创建i18n实例
const i18n = createI18n({
  // 组合式api
  legacy: false,
  // 显示语言
  locale: getStoredLocale(),
  // 语言包
  messages: {
    en,
    "zh-TW": zhTW,
    "zh-CN": zhCN,
  },
  // 自动错误降级
  fallbackLocale: "zh-CN",
  // 全局注入
  globalInjection: true,
});

export default i18n;
