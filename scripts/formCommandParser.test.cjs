const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    request = path.join(projectRoot, "src", request.slice(2));
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const {
  parseFormCommand,
  toCompleteFormIntent,
} = require("../src/utils/formCommandParser.ts");

test("parses a complete Simplified Chinese command", () => {
  const result = parseFormCommand(
    "我叫陈墨，邮箱 chenmo@example.com，手机 138 0000 0000，选择年度专业版，不要附加服务。",
  );
  assert.deepEqual(toCompleteFormIntent(result), {
    personalInfo: {
      name: "陈墨",
      email: "chenmo@example.com",
      phone: "13800000000",
    },
    plan: "3",
    billingCycle: "yearly",
    addonIds: [],
  });
});

test("parses Traditional Chinese aliases and selected add-ons", () => {
  const intent = toCompleteFormIntent(
    parseFormCommand(
      "我叫林夏，電子郵件 linxia@example.com，手機 139 0000 0000，選擇月度基礎版，加入線上服務和自訂個人檔案。",
    ),
  );
  assert.equal(intent.plan, "1");
  assert.equal(intent.billingCycle, "monthly");
  assert.deepEqual(intent.addonIds, ["1", "3"]);
});

test("parses an English command without an LLM", () => {
  const intent = toCompleteFormIntent(
    parseFormCommand(
      "My name is Avery Stone, email avery@example.com, phone 138 0000 0000. Choose yearly Pro with no add-ons.",
    ),
  );
  assert.equal(intent.personalInfo.name, "Avery Stone");
  assert.equal(intent.plan, "3");
  assert.deepEqual(intent.addonIds, []);
});

test("asks for missing values instead of applying defaults", () => {
  const result = parseFormCommand("选择年付专业版，不要附加服务");
  assert.equal(result.status, "needs_clarification");
  assert.deepEqual(result.missingFields, ["name", "email", "phone"]);
  assert.equal(toCompleteFormIntent(result), null);
});

test("detects contradictory plans and billing cycles", () => {
  const result = parseFormCommand(
    "选择月付和年付的基础版或专业版，不要附加服务",
  );
  assert.deepEqual(result.conflictCodes, [
    "MULTIPLE_PLANS",
    "MULTIPLE_BILLING_CYCLES",
  ]);
});

test("removes a single add-on when the command uses an expanded negation", () => {
  const result = parseFormCommand("不要选择在线服务", {
    baseIntent: {
      personalInfo: {},
      addonIds: ["1", "2"],
    },
  });
  assert.deepEqual(result.intent.addonIds, ["2"]);
});

test("applies a grouped negation to every connected add-on", () => {
  const result = parseFormCommand("不要在线服务和云存储", {
    baseIntent: {
      personalInfo: {},
      addonIds: ["1", "2", "3"],
    },
  });
  assert.deepEqual(result.intent.addonIds, ["3"]);

  const english = parseFormCommand("without online service and larger storage", {
    baseIntent: {
      personalInfo: {},
      addonIds: ["1", "2", "3"],
    },
  });
  assert.deepEqual(english.intent.addonIds, ["3"]);
});

test("resets grouped negation after a contrast connector", () => {
  const result = parseFormCommand("不要在线服务和云存储，但是添加在线服务", {
    baseIntent: {
      personalInfo: {},
      addonIds: ["1", "2", "3"],
    },
  });
  assert.deepEqual(result.intent.addonIds, ["1", "3"]);
});

test("uses the last add-on mention for positive and negative conflicts", () => {
  const result = parseFormCommand(
    "Add online service and larger storage, but don't add online service",
  );
  assert.deepEqual(result.intent.addonIds, ["2"]);
});

test("orders whole-list and individual add-on instructions by mention", () => {
  const chinese = parseFormCommand("不要任何附加服务，但添加在线服务", {
    baseIntent: { personalInfo: {}, addonIds: ["2"] },
  });
  const english = parseFormCommand(
    "add larger storage, then no add-ons, but add online service",
  );
  assert.deepEqual(chinese.intent.addonIds, ["1"]);
  assert.deepEqual(english.intent.addonIds, ["1"]);
});

test("reuses valid local personal information", () => {
  const result = parseFormCommand("年付高级版，添加更大存储空间", {
    existingPersonalInfo: {
      name: "顾言",
      email: "guyan@example.com",
      phone: "13600000000",
    },
  });
  assert.equal(result.status, "complete");
  assert.equal(toCompleteFormIntent(result).personalInfo.name, "顾言");
});

test("rejects malformed email replacements instead of reusing old values", () => {
  const existingResult = parseFormCommand(
    "我叫新用户，邮箱 bad@，手机 138 0000 0000，选择年度专业版，不要附加服务。",
    {
      existingPersonalInfo: {
        name: "旧用户",
        email: "old@example.com",
        phone: "13900000000",
      },
    },
  );
  assert.equal(existingResult.status, "invalid");
  assert.equal(existingResult.conflictCodes.includes("INVALID_EMAIL"), true);
  assert.equal(existingResult.intent.personalInfo.email, undefined);
  assert.equal(toCompleteFormIntent(existingResult), null);

  const punctuatedResult = parseFormCommand("邮箱：bad@，选择年度专业版，不要附加服务。", {
    existingPersonalInfo: {
      name: "旧用户",
      email: "old@example.com",
      phone: "13900000000",
    },
  });
  assert.equal(punctuatedResult.status, "invalid");
  assert.equal(punctuatedResult.conflictCodes.includes("INVALID_EMAIL"), true);
  assert.equal(punctuatedResult.intent.personalInfo.email, undefined);

  const baseResult = parseFormCommand("bad@", {
    baseIntent: {
      personalInfo: {
        name: "已有用户",
        email: "base@example.com",
        phone: "13800000000",
      },
      plan: "3",
      billingCycle: "yearly",
      addonIds: [],
    },
    focusField: "email",
  });
  assert.equal(baseResult.status, "invalid");
  assert.equal(baseResult.conflictCodes.includes("INVALID_EMAIL"), true);
  assert.equal(baseResult.intent.personalInfo.email, undefined);
  assert.equal(toCompleteFormIntent(baseResult), null);
});

test("accumulates one detail at a time even when answers arrive out of order", () => {
  let result = parseFormCommand("专业版", { focusField: "name" });
  assert.equal(result.intent.plan, "3");
  assert.equal(result.intent.personalInfo.name, undefined);

  result = parseFormCommand("邮箱 dan@example.com", {
    baseIntent: result.intent,
    focusField: "name",
  });
  result = parseFormCommand("手机 138 0000 0000", {
    baseIntent: result.intent,
    focusField: "name",
  });
  result = parseFormCommand("我叫小丹", {
    baseIntent: result.intent,
    focusField: "name",
  });
  result = parseFormCommand("年付", {
    baseIntent: result.intent,
    focusField: "billingCycle",
  });
  result = parseFormCommand("不需要附加服务", {
    baseIntent: result.intent,
    focusField: "addonIds",
  });

  assert.deepEqual(toCompleteFormIntent(result), {
    personalInfo: {
      name: "小丹",
      email: "dan@example.com",
      phone: "13800000000",
    },
    plan: "3",
    billingCycle: "yearly",
    addonIds: [],
  });
});

const { createPinia, setActivePinia } = require("pinia");
const { useCommonsStore } = require("../src/stores/commons.ts");
const { usePageAgentDemo } = require("../src/composables/usePageAgentDemo.ts");

test("assistant progress does not advance with non-empty invalid contact data", () => {
  for (const [field, value] of [
    ["email", "not-an-email"],
    ["phone", "12345"],
  ]) {
    setActivePinia(createPinia());
    const store = useCommonsStore();
    store.personalInfo.name = "顾言";
    store.personalInfo.email =
      field === "email" ? value : "guyan@example.com";
    store.personalInfo.phone =
      field === "phone" ? value : "13800000000";

    store.applyAssistantProgress({
      personalInfo: {},
      plan: "3",
      billingCycle: "yearly",
      addonIds: [],
    });

    assert.equal(store.nowTab, "1", `invalid ${field} must stay on Step 1`);
    assert.deepEqual(
      store.completedSteps,
      [],
      `invalid ${field} must not mark any step complete`,
    );
  }
});

test("assistant progress advances with valid contact data", () => {
  setActivePinia(createPinia());
  const store = useCommonsStore();
  store.personalInfo = {
    name: "顾言",
    email: "guyan@example.com",
    phone: "13800000000",
  };

  store.applyAssistantProgress({
    personalInfo: {},
    plan: "3",
    billingCycle: "yearly",
    addonIds: [],
  });

  assert.equal(store.nowTab, "4");
  assert.deepEqual(store.completedSteps, ["1", "2", "3"]);
});

const completeIntent = {
  personalInfo: { name: "苏澄", email: "sucheng@example.com", phone: "13800000000" },
  plan: "2", billingCycle: "yearly", addonIds: ["2"],
};

function runtimeFixture(executeBehavior, stopBehavior = () => Promise.resolve()) {
  global.document = {
    getElementById: () => null,
    createElement: () => ({ remove() {} }),
    head: { appendChild() {} },
  };
  global.window = { setTimeout, clearTimeout, setInterval, clearInterval };
  setActivePinia(createPinia());
  const store = useCommonsStore();
  const controls = usePageAgentDemo();
  controls.dispose();
  let agent;
  class FakeAgent extends EventTarget {
    constructor(config) {
      super();
      this.config = config;
      this.panelDisposed = false;
      this.panel = { dispose: () => { this.panelDisposed = true; } };
      agent = this;
    }
    execute(prompt) { return executeBehavior(prompt, this.config, store); }
    stop() { return stopBehavior(); }
    dispose() {}
  }
  window.PageAgent = FakeAgent;
  return { store, controls, getAgent: () => agent };
}

test("store snapshots are independent and restore all transaction fields", () => {
  setActivePinia(createPinia());
  const store = useCommonsStore();
  const before = store.createSnapshot();
  store.applyAssistantIntent(completeIntent);
  assert.equal(store.matchesAssistantIntent(completeIntent), true);
  assert.equal(store.nowTab, "4");
  assert.equal(before.personalInfo.name, "");
  store.restoreSnapshot(before);
  assert.deepEqual(store.createSnapshot(), before);
});

test("headless execution redacts personal data and repairs failed demo results", async () => {
  const { store, controls, getAgent } = runtimeFixture(async (prompt, config) => {
    for (const value of Object.values(completeIntent.personalInfo)) {
      assert.equal(prompt.includes(value), false);
    }
    const redacted = config.transformPageContent(
      "姓名 苏澄 邮箱 sucheng@example.com 手机 138 0000 0000",
    );
    assert.equal(/苏澄|sucheng|138/.test(redacted), false);
    return { success: false };
  });
  const result = await controls.execute(completeIntent, "zh-CN");
  assert.equal(getAgent().panelDisposed, true);
  assert.equal(getAgent().onAskUser, undefined);
  assert.equal(result.repaired, true);
  assert.equal(store.matchesAssistantIntent(completeIntent), true);
  controls.dispose();
});

test("stopping restores the snapshot and ignores a late failed response", async () => {
  let finish;
  const { store, controls } = runtimeFixture(() => new Promise(resolve => { finish = resolve; }));
  const before = store.createSnapshot();
  const execution = controls.execute(completeIntent, "zh-CN");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(controls.status.value, "running");
  await controls.stop();
  finish({ success: false });
  assert.equal((await execution).message, "AGENT_STOPPED");
  assert.deepEqual(store.createSnapshot(), before);
  controls.dispose();
});

test("stopping stays locked until the remote agent has stopped", async () => {
  let finishExecution;
  let finishStop;
  const { store, controls } = runtimeFixture(
    () => new Promise((resolve) => { finishExecution = resolve; }),
    () => new Promise((resolve) => { finishStop = resolve; }),
  );
  const before = store.createSnapshot();
  const execution = controls.execute(completeIntent, "zh-CN");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(controls.status.value, "running");

  const stopping = controls.stop();
  assert.equal(controls.status.value, "stopping");
  assert.equal(store.nowTab, "2");
  assert.equal(store.personalInfo.name, completeIntent.personalInfo.name);

  finishStop();
  await stopping;
  assert.equal(controls.status.value, "stopped");
  assert.deepEqual(store.createSnapshot(), before);

  finishExecution({ success: false });
  assert.equal((await execution).message, "AGENT_STOPPED");
  controls.dispose();
});

test("stopping during script loading cannot later trigger a local fallback", async () => {
  const { store, controls } = runtimeFixture(() => Promise.resolve({ success: false }));
  window.PageAgent = undefined;
  const before = store.createSnapshot();
  const execution = controls.execute(completeIntent, "zh-CN");
  assert.equal(controls.status.value, "loading");
  await controls.stop();
  assert.equal((await execution).message, "AGENT_STOPPED");
  assert.deepEqual(store.createSnapshot(), before);
  controls.dispose();
});

test("ignores persisted state with invalid enums or malformed structure", () => {
  const { piniaPersistedState } = require("../src/plugins/piniaPersistedState.ts");
  let saved = JSON.stringify({
    timestamp: Date.now(),
    state: {
      nowTab: "9",
      personalInfo: { name: "", email: "", phone: "" },
      plan: "1",
      addonIds: [],
      isYearly: false,
      completedSteps: [],
    },
  });
  global.localStorage = {
    getItem() { return saved; },
    removeItem() { saved = null; },
    setItem() {},
  };
  const patched = [];
  const store = {
    $id: "commonsStore",
    $patch(state) { patched.push(state); },
    $subscribe() {},
  };
  piniaPersistedState({ store });
  assert.equal(saved, null);
  assert.equal(patched.length, 0);
});
