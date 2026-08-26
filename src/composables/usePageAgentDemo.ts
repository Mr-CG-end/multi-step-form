import { ref, readonly } from 'vue';
import { useCommonsStore } from '@/stores/commons';
import type {
  PageAgentDemoStatus,
  IPageAgentDemoResult,
  IPageAgentDemoControls,
} from '@/types/page-agent';

// Page Agent 官方 Demo 运行时的固定 CDN 地址
const CDN_BASE_URL =
  'https://cdn.jsdelivr.net/npm/page-agent@1.12.2/dist/iife/page-agent.demo.js';
// 固定的 DOM 节点 ID，用于防重复注入与单例清理
const SCRIPT_ID = 'page-agent-demo-script';
// CDN 脚本注入后等待 window.pageAgent 实例就绪的最大超时时间（10秒）
const LOAD_TIMEOUT_MS = 10000;
// 轮询检查 window.pageAgent 挂载状态的间隔时间
const POLL_INTERVAL_MS = 100;

// 模块级单例响应式状态，确保跨组件调用时状态严格一致
const status = ref<PageAgentDemoStatus>('idle');
const errorMessage = ref<string>('');

// 内部单例变量，记录当前已注入脚本的语言及加载中的 Promise
let loadedLocale = '';
let loadPromise: Promise<void> | null = null;

/**
 * 语言代码映射：
 * 将应用内的国际化代码映射为 Page Agent 支持的语言参数
 * en -> en-US, zh-CN -> zh-CN, zh-TW -> zh-CN
 */
function mapLocaleToAgentLang(locale: string): string {
  if (locale === 'en') {
    return 'en-US';
  }
  if (locale === 'zh-CN' || locale === 'zh-TW') {
    return 'zh-CN';
  }
  return locale.startsWith('en') ? 'en-US' : 'zh-CN';
}

/**
 * 用户输入偏好验证结果接口
 */
interface IPreferenceValidationResult {
  valid: boolean;
  errorCode?: string;
}

/**
 * 校验用户输入的套餐偏好文本
 * 约束：
 * 1. 必须在 1~300 字符以内；
 * 2. 严禁包含真实邮箱特征，防止敏感信息上传；
 * 3. 严禁包含连续 7 位以上数字（疑似手机号/身份证等敏感信息）。
 */
function validatePreference(preference: string): IPreferenceValidationResult {
  const trimmed = preference.trim();

  // 长度边界校验
  if (trimmed.length < 1 || trimmed.length > 300) {
    return { valid: false, errorCode: 'AGENT_ERROR_INVALID_PREFERENCE_LENGTH' };
  }

  // 邮箱特征校验：匹配常见邮箱格式
  const emailRegex = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/;
  if (emailRegex.test(trimmed)) {
    return { valid: false, errorCode: 'AGENT_ERROR_SENSITIVE_EMAIL' };
  }

  // 连续 7 位及以上数字校验：防止输入真实手机号等隐私
  const phoneRegex = /\d{7,}/;
  if (phoneRegex.test(trimmed)) {
    return { valid: false, errorCode: 'AGENT_ERROR_SENSITIVE_PHONE' };
  }

  return { valid: true };
}

/**
 * 拼装安全且具备固定约束的 Agent 任务 Prompt
 * 注入固定演示身份与“第4步汇总页停止”的硬性流程约束
 */
function buildTaskPrompt(preference: string): string {
  return [
    '这是一个技术演示，只能使用以下虚构资料：',
    '姓名：演示用户',
    '邮箱：demo@example.com',
    '手机号：13800000000',
    '',
    '按页面正常顺序完成个人资料、套餐和附加服务选择。',
    '到达第 4 步汇总页后停止，不要点击最终确认按钮。',
    `用户的套餐偏好：${preference.trim()}`,
  ].join('\n');
}

/**
 * 轮询等待 window.pageAgent 挂载就绪
 * Page Agent Demo Bundle 在 script.onload 后会在异步定时回调中创建 window.pageAgent
 */
function waitForAgentReady(timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkInterval = setInterval(() => {
      // 检查全局实例及其核心执行方法是否已就绪
      if (window.pageAgent && typeof window.pageAgent.execute === 'function') {
        clearInterval(checkInterval);
        resolve();
        return;
      }

      if (Date.now() - startTime >= timeoutMs) {
        clearInterval(checkInterval);
        reject(new Error('AGENT_LOAD_TIMEOUT'));
      }
    }, POLL_INTERVAL_MS);
  });
}

/**
 * 加载 Page Agent CDN 脚本与初始化实例
 * @param locale 页面语言
 */
async function load(locale: string): Promise<void> {
  const targetLang = mapLocaleToAgentLang(locale);

  // 运行中不允许热重载或变更语言
  if (status.value === 'running') {
    return;
  }

  // 已加载相同语言且实例健康时直接复用，避免无意义的 DOM 操作
  if (
    loadedLocale === targetLang &&
    window.pageAgent &&
    status.value !== 'error'
  ) {
    return;
  }

  // 并发防护：若有正在进行中的加载请求，直接返回现有 Promise
  if (loadPromise) {
    return loadPromise;
  }

  // 若语言变更，先彻底释放旧实例并清除旧脚本
  if (loadedLocale && loadedLocale !== targetLang) {
    dispose();
  }

  status.value = 'loading';
  errorMessage.value = '';

  loadPromise = (async () => {
    try {
      // 清理已存在的脚本标签，保证环境干净
      const existingScript = document.getElementById(SCRIPT_ID);
      if (existingScript) {
        existingScript.remove();
      }

      // 创建 script 标签并注入
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        // showPanel=false 隐藏官方自带浮窗面板，由应用提供原生演示界面
        script.src = `${CDN_BASE_URL}?showPanel=false&lang=${targetLang}`;
        script.async = true;

        script.onload = () => resolve();
        script.onerror = () => reject(new Error('AGENT_SCRIPT_LOAD_FAILED'));

        document.head.appendChild(script);
      });

      // 等待 window.pageAgent 初始化就绪
      await waitForAgentReady(LOAD_TIMEOUT_MS);

      loadedLocale = targetLang;
      status.value = 'idle';
      errorMessage.value = '';
    } catch (err: unknown) {
      status.value = 'error';
      const errCode = err instanceof Error ? err.message : 'AGENT_LOAD_FAILED';
      errorMessage.value = errCode;
      throw err;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * 组装并执行 Page Agent 演示任务
 * @param preference 用户输入的套餐偏好
 * @param locale 当前页面语言
 */
async function execute(
  preference: string,
  locale: string
): Promise<IPageAgentDemoResult> {
  // 运行中禁止重复触发任务
  if (status.value === 'running') {
    return {
      success: false,
      message: 'AGENT_ALREADY_RUNNING',
    };
  }

  errorMessage.value = '';

  // 1. 输入安全与格式校验
  const validation = validatePreference(preference);
  if (!validation.valid) {
    const failMsg = validation.errorCode || 'AGENT_ERROR_INVALID_PREFERENCE';
    errorMessage.value = failMsg;
    return {
      success: false,
      message: failMsg,
    };
  }

  // 2. 确保 Agent 已加载并就绪
  try {
    await load(locale);
  } catch (err: unknown) {
    return {
      success: false,
      message: errorMessage.value || 'AGENT_LOAD_FAILED',
    };
  }

  if (!window.pageAgent) {
    status.value = 'error';
    errorMessage.value = 'AGENT_NOT_INITIALIZED';
    return {
      success: false,
      message: 'AGENT_NOT_INITIALIZED',
    };
  }

  // 3. 执行前重置表单状态，防止残留数据污染 Agent 执行上下文
  const commonsStore = useCommonsStore();
  commonsStore.clearForm();

  // 4. 拼装安全任务 Prompt 并开始执行
  const task = buildTaskPrompt(preference);
  status.value = 'running';

  try {
    const result = await window.pageAgent.execute(task);

    // 检查执行期间是否被用户手动中止
    if ((status.value as PageAgentDemoStatus) === 'stopped') {
      return {
        success: false,
        message: 'AGENT_STOPPED',
      };
    }

    if (result && result.success === false) {
      status.value = 'error';
      errorMessage.value = 'AGENT_EXECUTION_FAILED';
      return {
        success: false,
        message: 'AGENT_EXECUTION_FAILED',
      };
    }

    status.value = 'completed';
    return {
      success: true,
      message: 'AGENT_EXECUTION_SUCCESS',
    };
  } catch (err: unknown) {
    // 若已被 stop() 中止，保持 stopped 状态，不被异常覆盖为 error
    if ((status.value as PageAgentDemoStatus) === 'stopped') {
      return {
        success: false,
        message: 'AGENT_STOPPED',
      };
    }

    status.value = 'error';
    errorMessage.value = 'AGENT_EXECUTION_ERROR';
    return {
      success: false,
      message: 'AGENT_EXECUTION_ERROR',
    };
  }
}

/**
 * 停止当前正在执行的 Agent 任务
 */
async function stop(): Promise<void> {
  if (status.value !== 'running') {
    return;
  }

  // 立即标记为 stopped，防止后续异步返回值覆盖状态
  status.value = 'stopped';

  try {
    if (window.pageAgent && typeof window.pageAgent.stop === 'function') {
      await window.pageAgent.stop();
    }
  } catch {
    // 捕获停止过程中的潜在异常，确保状态稳定
  }
}

/**
 * 释放 Agent 运行时资源与 DOM 节点
 */
function dispose(): void {
  try {
    if (window.pageAgent && typeof window.pageAgent.dispose === 'function') {
      window.pageAgent.dispose();
    }
  } catch {
    // 忽略释放过程中的清理异常
  }

  // 移除注入的 script 标签
  const script = document.getElementById(SCRIPT_ID);
  if (script) {
    script.remove();
  }

  // 重置所有单例状态与引用
  window.pageAgent = undefined;
  loadedLocale = '';
  loadPromise = null;
  status.value = 'idle';
  errorMessage.value = '';
}

/**
 * 导出 Page Agent 演示控制 Composable
 */
export function usePageAgentDemo(): IPageAgentDemoControls {
  return {
    status: readonly(status),
    errorMessage: readonly(errorMessage),
    load,
    execute,
    stop,
    dispose,
  };
}
