import type { Ref } from "vue";
import type { AgentActivityState, FormIntent } from "@/types/form-assistant";

export type PageAgentDemoStatus =
  | "idle"
  | "loading"
  | "running"
  | "completed"
  | "error"
  | "stopped";

export interface IPageAgentActivity {
  type: "thinking" | "executing" | "executed" | "retrying" | "error";
  tool?: string;
  input?: unknown;
  output?: string;
  message?: string;
  attempt?: number;
  maxAttempts?: number;
}

export interface IPageAgentExecutionResult {
  success: boolean;
  data?: string;
  message?: string;
  history?: unknown[];
}

export interface IPageAgentPanel {
  dispose: () => void;
}

export interface IPageAgentConfig {
  model: string;
  baseURL: string;
  apiKey: string;
  language: "zh-CN" | "en-US";
  promptForNextTask?: boolean;
  transformPageContent?: (content: string) => string | Promise<string>;
}

export interface IPageAgentInstance {
  status?: string;
  task?: string;
  lastResult?: IPageAgentExecutionResult | null;
  panel?: IPageAgentPanel;
  onAskUser?: (
    question: string,
    options?: { signal: AbortSignal },
  ) => Promise<string>;
  execute: (task: string) => Promise<IPageAgentExecutionResult>;
  stop: () => Promise<void> | void;
  dispose: () => void;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
}

export interface IPageAgentConstructor {
  new (config: IPageAgentConfig): IPageAgentInstance;
}

export interface IPageAgentDemoResult {
  success: boolean;
  message: string;
  repaired: boolean;
}

export interface IPageAgentDemoControls {
  status: Readonly<Ref<PageAgentDemoStatus>>;
  errorMessage: Readonly<Ref<string>>;
  activityState: Readonly<Ref<AgentActivityState>>;
  activity: Readonly<Ref<IPageAgentActivity | null>>;
  load: (locale: string) => Promise<void>;
  execute: (
    intent: FormIntent,
    locale: string,
  ) => Promise<IPageAgentDemoResult>;
  stop: () => Promise<void>;
  dispose: () => void;
}
