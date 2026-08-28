import type { IPersonal } from "@/types/items";

export type PlanId = "1" | "2" | "3";
export type AddonId = "1" | "2" | "3";
export type BillingCycle = "monthly" | "yearly";

export type ClarificationField =
  | "name"
  | "email"
  | "phone"
  | "plan"
  | "billingCycle"
  | "addonIds";

export interface PersonalInfoIntent {
  name?: string;
  email?: string;
  phone?: string;
}

export interface PartialFormIntent {
  personalInfo: PersonalInfoIntent;
  plan?: PlanId;
  billingCycle?: BillingCycle;
  addonIds?: AddonId[];
}

export interface FormIntent {
  personalInfo: IPersonal;
  plan: PlanId;
  billingCycle: BillingCycle;
  addonIds: AddonId[];
}

export type CommandParseStatus =
  | "complete"
  | "needs_clarification"
  | "invalid";

export interface CommandParseResult {
  status: CommandParseStatus;
  intent: PartialFormIntent;
  missingFields: ClarificationField[];
  conflictCodes: string[];
}

export type AssistantMessageRole = "assistant" | "user" | "system";
export type AssistantMessageKind =
  | "text"
  | "question"
  | "activity"
  | "success"
  | "warning"
  | "error";

export interface AssistantMessage {
  id: number;
  role: AssistantMessageRole;
  kind: AssistantMessageKind;
  content: string;
}

export type AgentActivityState =
  | "idle"
  | "thinking"
  | "executing"
  | "retrying"
  | "repairing"
  | "completed"
  | "error";

export interface CommonsSnapshot {
  nowTab: string;
  personalInfo: IPersonal;
  plan: string;
  addonIds: string[];
  isYearly: boolean;
  completedSteps: string[];
}
