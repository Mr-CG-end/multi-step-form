import type { Ref } from 'vue';

/**
 * Page Agent 演示运行状态
 */
export type PageAgentDemoStatus =
  | 'idle'
  | 'loading'
  | 'running'
  | 'completed'
  | 'error'
  | 'stopped';

/**
 * Page Agent 实例执行返回结果
 */
export interface IPageAgentExecutionResult {
  success: boolean;
  message?: string;
}

/**
 * Page Agent 页面实例接口
 */
export interface IPageAgentInstance {
  status?: string;
  execute: (task: string) => Promise<IPageAgentExecutionResult>;
  stop: () => Promise<void> | void;
  dispose: () => void;
}

/**
 * Page Agent 构造函数接口
 */
export interface IPageAgentConstructor {
  new (): IPageAgentInstance;
}

/**
 * Composable 执行返回的统一结果契约
 */
export interface IPageAgentDemoResult {
  success: boolean;
  message: string;
}

/**
 * Composable 暴露给 UI 的控制器契约
 */
export interface IPageAgentDemoControls {
  status: Readonly<Ref<PageAgentDemoStatus>>;
  errorMessage: Readonly<Ref<string>>;
  load: (locale: string) => Promise<void>;
  execute: (preference: string, locale: string) => Promise<IPageAgentDemoResult>;
  stop: () => Promise<void>;
  dispose: () => void;
}
