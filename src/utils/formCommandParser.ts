import type { IPersonal } from "@/types/items";
import type {
  AddonId,
  BillingCycle,
  ClarificationField,
  CommandParseResult,
  PartialFormIntent,
  PlanId,
} from "@/types/form-assistant";
import { isValidEmail, isValidPhone } from "@/utils/validators";

interface ParseFormCommandOptions {
  baseIntent?: PartialFormIntent;
  existingPersonalInfo?: IPersonal;
  focusField?: ClarificationField;
}

const PLAN_ALIASES: Record<PlanId, RegExp> = {
  "1": /(?:基础版|基礎版|arcade|basic(?:\s+plan)?|入门版|入門版)/i,
  "2": /(?:高级版|高級版|advanced|进阶版|進階版)/i,
  "3": /(?:专业版|專業版|\bpro\b|professional)/i,
};

const ADDON_ALIASES: Record<AddonId, RegExp> = {
  "1": /(?:在线服务|線上服務|在线游戏|線上遊戲|online\s+service|multiplayer)/i,
  "2": /(?:更大(?:存储|儲存)空间|更大(?:存储|儲存)|云存储|雲端空間|larger\s+storage|extra\s+(?:storage|1tb))/i,
  "3": /(?:自定义个人资料|自訂個人檔案|自定义资料|自訂資料|customizable\s+profile|custom\s+profile)/i,
};

const MONTHLY_PATTERN = /(?:月付|月度|按月|每月|monthly|per\s+month|\/mo\b)/i;
const YEARLY_PATTERN = /(?:年付|年度|按年|每年|yearly|annual|annually|per\s+year|\/yr\b)/i;
const NO_ADDONS_PATTERN =
  /(?:不(?:要|需要|选择|選擇|添加|加)(?:任何)?附加(?:服务|服務|项|項)?|无附加(?:服务|服務|项|項)?|沒有附加(?:服務|項目)?|no\s+add[- ]?ons?|without\s+(?:any\s+)?add[- ]?ons?)/i;
const NEGATION_PREFIX =
  /(?:(?:不要|不需要|不想要|不选择|不選擇|不添加|不加入|别|別|请勿|請勿|取消|移除|去掉)(?:选择|選擇|添加|加入|勾选|勾選|要)?|(?:do\s+not|don't|dont|never)\s+(?:(?:add|select|include|choose|want)\s+)?|without|remove|exclude|no)\s*$/i;
const NEGATION_TOKEN =
  /(?:不要|不需要|不想要|不选择|不選擇|不添加|不加入|别|別|请勿|請勿|取消|移除|去掉|(?:do\s+not|don't|dont|never|without|remove|exclude|no)\b)\s*/gi;
const CONTRAST_CONNECTOR = /(?:但是|但|可是|然而|不过|不過|\bbut\b|\bhowever\b|\bexcept\b)/gi;
const EMAIL_LABEL_PATTERN = /(?:邮箱|郵箱|电子邮件|電子郵件|\be[-\s]?mail\b)/iu;
const EMAIL_LIKE_TOKEN_PATTERN = /(?:^|[\s,:：=])\S*@\S*/u;
const EMAIL_PROMPT_PATTERN =
  /^(?:(?:请|請|please)\s*)?(?:(?:提供|輸入|输入|填写|填寫|选择|選擇|provide|enter|type|choose|select)\s*)?(?:(?:你的|您的|我的|your|my)\s*)?(?:邮箱|郵箱|电子邮件|電子郵件|\be[-\s]?mail\b)(?:地址|address)?[。.!！？?？:：\s]*$/iu;

const cloneIntent = (source?: PartialFormIntent): PartialFormIntent => ({
  personalInfo: { ...(source?.personalInfo || {}) },
  plan: source?.plan,
  billingCycle: source?.billingCycle,
  addonIds: source?.addonIds ? [...source.addonIds] : undefined,
});

const cleanName = (value: string): string =>
  value
    .replace(/^(?:是|为|為|叫|叫做)\s*/u, "")
    .replace(/\s*(?:我的|my)?\s*(?:邮箱|郵箱|电子邮件|電子郵件|email|手机|手機|电话|電話|phone).*$/iu, "")
    .trim();

function containsNonNameIntent(input: string): boolean {
  return (
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(input) ||
    /1[3-9](?:[\s-]?\d){9}/.test(input) ||
    MONTHLY_PATTERN.test(input) ||
    YEARLY_PATTERN.test(input) ||
    NO_ADDONS_PATTERN.test(input) ||
    Object.values(PLAN_ALIASES).some((pattern) => pattern.test(input)) ||
    Object.values(ADDON_ALIASES).some((pattern) => pattern.test(input))
  );
}

function extractName(input: string, focusField?: ClarificationField): string | undefined {
  const patterns = [
    /(?:我叫|我的名字是|姓名(?:是|为|為|[:：])?|名字(?:是|为|為|[:：])?|name\s*(?:is|[:：]))\s*([A-Za-z\u3400-\u9fff·•\s'-]{2,40}?)(?=[,，。;；\n]|$)/iu,
    /(?:称呼我为|稱呼我為|call\s+me)\s*([A-Za-z\u3400-\u9fff·•\s'-]{2,40}?)(?=[,，。;；\n]|$)/iu,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match?.[1]) {
      const name = cleanName(match[1]);
      if (name.length >= 2) return name;
    }
  }

  if (focusField === "name" && !containsNonNameIntent(input)) {
    const candidate = cleanName(input);
    if (/^[A-Za-z\u3400-\u9fff·•\s'-]{2,40}$/u.test(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function extractEmail(input: string): string | undefined {
  return input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
}

function hasMalformedEmailAttempt(
  input: string,
  focusField: ClarificationField | undefined,
  extractedEmail: string | undefined,
): boolean {
  // A successfully extracted address is always preferred over the malformed
  // attempt check. This also avoids flagging a command that mentions a valid
  // address elsewhere in the sentence.
  if (extractedEmail) return false;

  if (focusField === "email") {
    // While asking for an email, any non-empty answer is an explicit attempt.
    // Keep assistant prompt-like text out of the invalid path so it can still
    // be treated as a missing value.
    return Boolean(input.trim()) && !EMAIL_PROMPT_PATTERN.test(input.trim());
  }

  // An @-containing token is a strong signal that the user attempted to
  // replace an address, even when they omitted the email label entirely.
  if (EMAIL_LIKE_TOKEN_PATTERN.test(input)) return true;

  const label = input.match(EMAIL_LABEL_PATTERN);
  if (!label || label.index === undefined) return false;

  // Outside the focused field, require an @ token after an email label. This
  // distinguishes a malformed replacement ("email bad@") from instructions
  // such as "please provide an email" or "选择邮箱".
  const clause = input
    .slice(label.index + label[0].length)
    .replace(/^[\s:=：]+/u, "")
    .split(/[,.!?;:，。！？；：\n]/u)[0];
  return clause.includes("@");
}

function extractPhone(input: string): string | undefined {
  const match = input.match(/1[3-9](?:[\s-]?\d){9}/);
  return match?.[0].replace(/[\s-]/g, "");
}

function findMatchingIds<T extends string>(
  input: string,
  aliases: Record<T, RegExp>,
): T[] {
  return (Object.keys(aliases) as T[]).filter((id) => aliases[id].test(input));
}

function findPatternMatches(input: string, pattern: RegExp): RegExpMatchArray[] {
  const flags = pattern.flags.includes("g")
    ? pattern.flags
    : `${pattern.flags}g`;
  return Array.from(input.matchAll(new RegExp(pattern.source, flags)));
}

function isNegatedMention(input: string, index: number): boolean {
  const prefix = input.slice(0, index);
  const contrastMatches = Array.from(prefix.matchAll(CONTRAST_CONNECTOR));
  const lastContrast = contrastMatches[contrastMatches.length - 1];
  const clause = prefix.slice(
    lastContrast?.index === undefined
      ? 0
      : lastContrast.index + lastContrast[0].length,
  );

  // A negation remains active across a same-clause conjunction ("不要 A 和 B"
  // / "without A and B"), but punctuation or a contrast connector starts a
  // new instruction. The fast prefix check preserves the existing behavior for
  // direct mentions while the broader check handles grouped add-ons.
  if (NEGATION_PREFIX.test(clause.slice(Math.max(0, clause.length - 32)))) {
    return true;
  }
  const negationMatches = Array.from(clause.matchAll(NEGATION_TOKEN));
  const negation = negationMatches[negationMatches.length - 1];
  if (!negation || negation.index === undefined) return false;
  const afterNegation = clause.slice(negation.index + negation[0].length);
  return !/[,.!?;:，。！？；：]/.test(afterNegation);
}

function parseFocusedValue(
  input: string,
  focusField: ClarificationField | undefined,
  intent: PartialFormIntent,
): void {
  if (!focusField) return;

  if (focusField === "plan") {
    const ids = findMatchingIds(input, PLAN_ALIASES);
    if (ids.length === 1) intent.plan = ids[0];
  }
  if (focusField === "billingCycle") {
    if (MONTHLY_PATTERN.test(input) && !YEARLY_PATTERN.test(input)) {
      intent.billingCycle = "monthly";
    }
    if (YEARLY_PATTERN.test(input) && !MONTHLY_PATTERN.test(input)) {
      intent.billingCycle = "yearly";
    }
  }
  if (focusField === "addonIds" && /^(?:不要|不需要|没有|沒有|无|無|none|no)$/i.test(input.trim())) {
    intent.addonIds = [];
  }
}

export function parseFormCommand(
  rawInput: string,
  options: ParseFormCommandOptions = {},
): CommandParseResult {
  const input = rawInput.trim();
  const intent = cloneIntent(options.baseIntent);
  const conflictCodes: string[] = [];
  const focusField = options.focusField;

  const name = extractName(input, focusField);
  const email = extractEmail(input);
  const phone = extractPhone(input);
  const malformedEmailAttempt = hasMalformedEmailAttempt(
    input,
    focusField,
    email,
  );
  if (name) intent.personalInfo.name = name;
  if (email) intent.personalInfo.email = email;
  if (phone) intent.personalInfo.phone = phone;

  const planMatches = findMatchingIds(input, PLAN_ALIASES);
  if (planMatches.length > 1) {
    conflictCodes.push("MULTIPLE_PLANS");
  } else if (planMatches.length === 1) {
    intent.plan = planMatches[0];
  }

  const hasMonthly = MONTHLY_PATTERN.test(input);
  const hasYearly = YEARLY_PATTERN.test(input);
  if (hasMonthly && hasYearly) {
    conflictCodes.push("MULTIPLE_BILLING_CYCLES");
  } else if (hasMonthly) {
    intent.billingCycle = "monthly";
  } else if (hasYearly) {
    intent.billingCycle = "yearly";
  }

  const addonOperations: Array<{
    index: number;
    addonId?: AddonId;
    selected?: boolean;
  }> = findPatternMatches(input, NO_ADDONS_PATTERN).map((match) => ({
    index: match.index || 0,
  }));
  for (const addonId of Object.keys(ADDON_ALIASES) as AddonId[]) {
    for (const match of findPatternMatches(input, ADDON_ALIASES[addonId])) {
      const index = match.index || 0;
      addonOperations.push({
        index,
        addonId,
        selected: !isNegatedMention(input, index),
      });
    }
  }
  if (addonOperations.length > 0) {
    const current = new Set(intent.addonIds || []);
    for (const operation of addonOperations.sort((a, b) => a.index - b.index)) {
      if (!operation.addonId) current.clear();
      else if (operation.selected) current.add(operation.addonId);
      else current.delete(operation.addonId);
    }
    intent.addonIds = Array.from(current).sort() as AddonId[];
  }

  parseFocusedValue(input, focusField, intent);

  const existing = options.existingPersonalInfo;
  if (!intent.personalInfo.name && existing?.name.trim()) {
    intent.personalInfo.name = existing.name.trim();
  }
  if (malformedEmailAttempt) {
    // An explicit replacement must never inherit an older value from either
    // the pending intent or the current form state.
    delete intent.personalInfo.email;
    if (!conflictCodes.includes("INVALID_EMAIL")) {
      conflictCodes.push("INVALID_EMAIL");
    }
  }
  if (
    !intent.personalInfo.email &&
    !malformedEmailAttempt &&
    existing?.email &&
    isValidEmail(existing.email)
  ) {
    intent.personalInfo.email = existing.email.trim();
  }
  if (
    !intent.personalInfo.phone &&
    existing?.phone &&
    isValidPhone(existing.phone)
  ) {
    intent.personalInfo.phone = existing.phone.replace(/\s/g, "");
  }

  if (intent.personalInfo.email && !isValidEmail(intent.personalInfo.email)) {
    if (!conflictCodes.includes("INVALID_EMAIL")) {
      conflictCodes.push("INVALID_EMAIL");
    }
    delete intent.personalInfo.email;
  }
  if (intent.personalInfo.phone && !isValidPhone(intent.personalInfo.phone)) {
    conflictCodes.push("INVALID_PHONE");
    delete intent.personalInfo.phone;
  }

  const missingFields: ClarificationField[] = [];
  if (!intent.personalInfo.name) missingFields.push("name");
  if (!intent.personalInfo.email) missingFields.push("email");
  if (!intent.personalInfo.phone) missingFields.push("phone");
  if (!intent.plan) missingFields.push("plan");
  if (!intent.billingCycle) missingFields.push("billingCycle");
  if (!intent.addonIds) missingFields.push("addonIds");

  return {
    status:
      conflictCodes.length > 0
        ? "invalid"
        : missingFields.length > 0
          ? "needs_clarification"
          : "complete",
    intent,
    missingFields,
    conflictCodes,
  };
}

export function toCompleteFormIntent(
  result: CommandParseResult,
): import("@/types/form-assistant").FormIntent | null {
  const { intent } = result;
  if (
    result.status !== "complete" ||
    !intent.personalInfo.name ||
    !intent.personalInfo.email ||
    !intent.personalInfo.phone ||
    !intent.plan ||
    !intent.billingCycle ||
    !intent.addonIds
  ) {
    return null;
  }

  return {
    personalInfo: {
      name: intent.personalInfo.name,
      email: intent.personalInfo.email,
      phone: intent.personalInfo.phone,
    },
    plan: intent.plan,
    billingCycle: intent.billingCycle as BillingCycle,
    addonIds: [...intent.addonIds],
  };
}
