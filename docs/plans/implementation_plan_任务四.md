# 【基础任务 4】国际化（i18n）支持实施计划

## 1. 任务分析与核心目标

- **多语言切换**：集成 Vue I18n v9，支持简体中文（zh-CN）、繁体中文（zh-TW）、英文（en）三种语言，用户可实时切换。
- **文案全覆盖**：将所有硬编码文本（表单标签、按钮、验证提示、步骤导航、Toast 提示、感谢页文案等）替换为国际化调用。
- **模块化配置**：多语言配置文件按功能模块拆分（通用文案、步骤导航、表单、验证提示、商品数据），结构清晰易扩展。
- **偏好持久化**：用户选择的语言保存到 localStorage，刷新/重启应用后自动恢复。
- **布局适配**：确保英文/繁体中文等长文本场景下不会出现文字溢出、布局错乱。

---

## 2. 现有代码分析 — 硬编码文本盘点

### 2.1 JSON 数据文件中的中文文案

| 文件 | 硬编码内容 |
|------|-----------|
| `src/assets/data/tabs-info.json` | 步骤名称："步骤 1"~"步骤 4"、"您的信息"、"选择套餐"、"附加服务"、"摘要确认" |
| `src/assets/data/content.json` | 页面标题/副标题："个人信息"、"选择套餐"、"选择附加服务"、"完成设置"及各步骤说明文案 |
| `src/assets/data/items.json` | 套餐名称："基础版"、"高级版"、"专业版"；附加服务名称；价格单位（¥/月、¥/年）等 |

### 2.2 HomeView.vue 模板中的中文文案

| 位置 | 硬编码内容 |
|------|-----------|
| Step 1 表单标签 | "姓名"、"电子邮件地址"、"电话号码"；placeholder："例如：张三"、"例如：zhangsan@example.com"、"例如：138 0000 0000" |
| Step 2 切换区域 | "月度"、"年度" |
| Step 4 摘要区域 | "个人信息"、"（年度）/（月度）"、"附加服务"、"未选择附加服务"、"总计（每月）/（每年）"、"编辑" |
| Step 5 感谢页 | "感谢您的订阅！"、支持信息长文案 |
| 底部按钮 | "返回"、"下一步"、"确认" |
| Toast 提示 | "请按顺序完成步骤" |

### 2.3 验证提示（HomeView.vue `<script>` 中的 computed）

| 字段 | 硬编码消息 |
|------|-----------|
| `nameValidation` | "请填写姓名" |
| `emailValidation` | "请填写邮箱"、"邮箱格式错误" |
| `phoneValidation` | "请填写手机号"、"手机号格式错误" |

---

## 3. 实施步骤与具体代码

### 步骤一：安装 Vue I18n v9

```bash
pnpm add vue-i18n@9
```

---

### 步骤二：创建多语言配置文件（按模块拆分）

**目录结构：**
```
src/
└── i18n/
    ├── index.ts              # i18n 实例创建 + 语言偏好持久化
    └── locales/
        ├── zh-CN/
        │   ├── common.ts     # 通用文案（按钮、Toast 等）
        │   ├── steps.ts      # 步骤导航文案
        │   ├── form.ts       # 表单标签 + placeholder
        │   ├── validation.ts # 验证错误提示
        │   ├── items.ts      # 套餐/附加服务名称和价格
        │   └── index.ts      # 汇总导出
        ├── zh-TW/
        │   ├── ...（同上结构）
        │   └── index.ts
        └── en/
            ├── ...（同上结构）
            └── index.ts
```

**`src/i18n/locales/zh-CN/common.ts`**
```typescript
export default {
  buttons: {
    back: '返回',
    next: '下一步',
    confirm: '确认',
    edit: '编辑',
  },
  period: {
    monthly: '月度',
    yearly: '年度',
  },
  toast: {
    stepOrder: '请按顺序完成步骤',
  },
  thankYou: {
    title: '感谢您的订阅！',
    message: '感谢您确认订阅！我们希望您使用愉快。如果您需要任何支持，请随时发送电子邮件至 support@loremgaming.com 联系我们。',
  },
};
```

**`src/i18n/locales/zh-CN/steps.ts`**
```typescript
export default {
  step1: { step: '步骤 1', name: '您的信息' },
  step2: { step: '步骤 2', name: '选择套餐' },
  step3: { step: '步骤 3', name: '附加服务' },
  step4: { step: '步骤 4', name: '摘要确认' },
  content: {
    step1: { title: '个人信息', semititle: '请提供您的姓名、电子邮件地址和电话号码。' },
    step2: { title: '选择套餐', semititle: '您可以选择月度或年度订阅。' },
    step3: { title: '选择附加服务', semititle: '附加服务可帮助您增强游戏体验。' },
    step4: { title: '完成设置', semititle: '在确认之前，请仔细检查所有信息。' },
  },
};
```

**`src/i18n/locales/zh-CN/form.ts`**
```typescript
export default {
  labels: {
    name: '姓名',
    email: '电子邮件地址',
    phone: '电话号码',
  },
  placeholders: {
    name: '例如：张三',
    email: '例如：zhangsan@example.com',
    phone: '例如：138 0000 0000',
  },
  summary: {
    personalInfo: '个人信息',
    planSuffix: {
      monthly: '（月度）',
      yearly: '（年度）',
    },
    addons: '附加服务',
    noAddons: '未选择附加服务',
    totalMonthly: '总计（每月）',
    totalYearly: '总计（每年）',
  },
};
```

**`src/i18n/locales/zh-CN/validation.ts`**
```typescript
export default {
  required: {
    name: '请填写姓名',
    email: '请填写邮箱',
    phone: '请填写手机号',
  },
  format: {
    email: '邮箱格式错误',
    phone: '手机号格式错误',
  },
};
```

**`src/i18n/locales/zh-CN/items.ts`**
```typescript
export default {
  plans: {
    '1': { name: '基础版', monthly: '¥9/月', yearly: '¥90/年', discount: '免 2 个月费用' },
    '2': { name: '高级版', monthly: '¥12/月', yearly: '¥120/年', discount: '免 2 个月费用' },
    '3': { name: '专业版', monthly: '¥15/月', yearly: '¥150/年', discount: '免 2 个月费用' },
  },
  addons: {
    '1': { title: '在线服务', semititle: '访问多人游戏', monthly: '+¥1/月', yearly: '+¥10/年' },
    '2': { title: '更大存储空间', semititle: '额外 1TB 云存储', monthly: '+¥2/月', yearly: '+¥20/年' },
    '3': { title: '自定义个人资料', semititle: '自定义个人资料主题', monthly: '+¥2/月', yearly: '+¥20/年' },
  },
  // 价格格式模板，用于 totalCost 的动态拼接
  priceFormat: {
    monthly: '¥{amount}/月',
    yearly: '¥{amount}/年',
  },
};
```

**`src/i18n/locales/zh-CN/index.ts`**（汇总导出）
```typescript
import common from './common';
import steps from './steps';
import form from './form';
import validation from './validation';
import items from './items';

export default {
  common,
  steps,
  form,
  validation,
  items,
};
```

> **英文（en）和繁体中文（zh-TW）** 的文件结构完全相同，仅文案内容不同。
>
> 英文示例（关键差异）：
> - 价格格式：`$9/mo`、`$90/yr`（保持与原始 frontendmentor 一致的美元标记）
> - 验证提示："This field is required"、"Invalid email format"、"Invalid phone number"
> - 按钮文案："Back"、"Next Step"、"Confirm"

---

### 步骤三：创建 i18n 实例（含 localStorage 持久化）

**`src/i18n/index.ts`**
```typescript
import { createI18n } from 'vue-i18n';
import zhCN from './locales/zh-CN';
import zhTW from './locales/zh-TW';
import en from './locales/en';

/** localStorage 中保存的语言偏好 key */
const LOCALE_STORAGE_KEY = 'multi-step-form-locale';

/**
 * 获取用户语言偏好
 * 优先级：localStorage > 浏览器语言 > 默认 zh-CN
 */
const getStoredLocale = (): string => {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && ['zh-CN', 'zh-TW', 'en'].includes(stored)) {
    return stored;
  }
  // 尝试匹配浏览器语言
  const browserLang = navigator.language;
  if (browserLang.startsWith('zh-TW') || browserLang.startsWith('zh-HK')) return 'zh-TW';
  if (browserLang.startsWith('en')) return 'en';
  return 'zh-CN';
};

/**
 * 保存用户语言偏好到 localStorage
 */
export const setStoredLocale = (locale: string): void => {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch (error) {
    console.warn('语言偏好保存失败', error);
  }
};

const i18n = createI18n({
  legacy: false,            // 启用 Composition API 模式
  globalInjection: true,    // 显式启用 $t 全局注入，确保模板中可直接使用 $t
  locale: getStoredLocale(),
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'zh-TW': zhTW,
    en,
  },
});

export default i18n;
```

**设计决策说明：**
- 使用 `legacy: false` 启用 Composition API 模式，支持 `useI18n()` 组合式调用。
- **显式设置 `globalInjection: true`**，确保模板中 `$t` 全局可用。虽然 vue-i18n v9.2+ 默认启用，但 `vue-i18n@9` 是宽版本号，不应依赖特定版本的默认行为。
- `fallbackLocale` 设为 `zh-CN`，当翻译 key 缺失时自动回退到简体中文。
- 语言偏好持久化逻辑内聚在 `src/i18n/index.ts` 中，与 Pinia 持久化分离互不干扰。

---

### 步骤四：全局注册 i18n 插件

**[MODIFY] `src/main.ts`**
```diff
 import { createApp } from "vue";
 import App from "./App.vue";
 import router from "./router";
 import { createPinia } from "pinia";
 import { piniaPersistedState } from "./plugins/piniaPersistedState";
+import i18n from "./i18n";

 const pinia = createPinia();
 pinia.use(piniaPersistedState);

-createApp(App).use(router).use(pinia).mount("#app");
+createApp(App).use(router).use(pinia).use(i18n).mount("#app");
```

---

### 步骤五：创建语言切换组件

**[NEW] `src/components/LanguageSwitcher.vue`**

设计方案：使用下拉选择器（`<select>`）形式，放置在页面右上角或导航栏区域。

```vue
<template>
  <div class="language-switcher">
    <select
      :value="locale"
      @change="changeLanguage(($event.target as HTMLSelectElement).value)"
    >
      <option v-for="lang in languages" :key="lang.code" :value="lang.code">
        {{ lang.label }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { setStoredLocale } from '@/i18n';

const { locale } = useI18n();

const languages = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'en', label: 'English' },
];

/** 切换语言并持久化 */
const changeLanguage = (newLocale: string) => {
  locale.value = newLocale;
  setStoredLocale(newLocale);
};
</script>

<style scoped>
.language-switcher {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
}

.language-switcher select {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  outline: none;
  backdrop-filter: blur(4px);
}

.language-switcher select option {
  background: #1a1a2e;
  color: #fff;
}
</style>
```

**[MODIFY] `src/App.vue`** — 在模板中引入切换组件

```vue
<template>
  <LanguageSwitcher />
  <nav></nav>
  <router-view/>
</template>

<script setup lang="ts">
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
</script>
```

---

### 步骤六：改造 HomeView.vue — 替换所有硬编码文本

**核心改造思路：**

1. **移除 JSON 文件依赖**：原来通过 `require()` 加载的 `tabs-info.json`、`content.json`、`items.json` 中的文案全部改为通过 `t()` 函数动态获取。JSON 文件中保留不需要翻译的结构性数据（如 `id`、`icon` 路径），文案部分从 i18n 读取。

2. **`<script setup>` 中引入 `useI18n`**：
```typescript
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
```

3. **模板中的替换对照表：**

| 原始硬编码 | 替换为 |
|-----------|--------|
| `{{ tab.step }}` | `{{ t('steps.step' + tab.id + '.step') }}` |
| `{{ tab.name }}` | `{{ t('steps.step' + tab.id + '.name') }}` |
| `{{ nowContent.title }}` | 使用 `stepTitle` computed（见下方 Step 5 处理） |
| `{{ nowContent.semititle }}` | 使用 `stepSemititle` computed（见下方 Step 5 处理） |
| `姓名` | `{{ t('form.labels.name') }}` |
| `电子邮件地址` | `{{ t('form.labels.email') }}` |
| `电话号码` | `{{ t('form.labels.phone') }}` |
| `placeholder="例如：张三"` | `:placeholder="t('form.placeholders.name')"` |
| `placeholder="例如：zhangsan@..."` | `:placeholder="t('form.placeholders.email')"` |
| `placeholder="例如：138..."` | `:placeholder="t('form.placeholders.phone')"` |
| `月度` / `年度` | `{{ t('common.period.monthly') }}` / `{{ t('common.period.yearly') }}` |
| `个人信息`（Step4 摘要） | `{{ t('form.summary.personalInfo') }}` |
| `附加服务`（Step4 摘要） | `{{ t('form.summary.addons') }}` |
| `未选择附加服务` | `{{ t('form.summary.noAddons') }}` |
| `总计（每月）` / `总计（每年）` | `{{ t('form.summary.totalMonthly') }}` / `{{ t('form.summary.totalYearly') }}` |
| `编辑` | `{{ t('common.buttons.edit') }}` |
| `返回` | `{{ t('common.buttons.back') }}` |
| `下一步` | `{{ t('common.buttons.next') }}` |
| `确认` | `{{ t('common.buttons.confirm') }}` |
| `感谢您的订阅！` | `{{ t('common.thankYou.title') }}` |
| 感谢页详细文案 | `{{ t('common.thankYou.message') }}` |
| `请按顺序完成步骤` | `{{ t('common.toast.stepOrder') }}` |
| `编辑`（简单静态文案，用 v-t 示例） | `<button v-t="'common.buttons.edit'" ...></button>` |

4. **套餐和附加服务的文案** — 通过 i18n key 动态读取：
```typescript
// 套餐名称，通过 plan id 动态获取
t(`items.plans.${item.id}.name`)
// 套餐月价
t(`items.plans.${item.id}.monthly`)
// 附加服务标题
t(`items.addons.${addon.id}.title`)
```

5. **验证消息国际化** — 修改 computed 中的 message：
```typescript
const nameValidation = computed(() => {
  if (isSubmitted.value && _.isEmpty(personalInfo.value.name))
    return { valid: false, message: t('validation.required.name') };
  return { valid: true, message: '' };
});

const emailValidation = computed(() => {
  if (isSubmitted.value && _.isEmpty(personalInfo.value.email))
    return { valid: false, message: t('validation.required.email') };
  if (_.isEmpty(debouncedInfo.email)) return { valid: true, message: '' };
  if (!isValidEmail(debouncedInfo.email))
    return { valid: false, message: t('validation.format.email') };
  return { valid: true, message: '' };
});

const phoneValidation = computed(() => {
  if (isSubmitted.value && _.isEmpty(personalInfo.value.phone))
    return { valid: false, message: t('validation.required.phone') };
  if (_.isEmpty(debouncedInfo.phone)) return { valid: true, message: '' };
  if (!isValidPhone(debouncedInfo.phone))
    return { valid: false, message: t('validation.format.phone') };
  return { valid: true, message: '' };
});
```

6. **totalCost 的国际化**：根据当前语言动态格式化价格。注意 `addons` 改为只存 `id`（见步骤七），所以遍历时用 `addonId` 而非 `addon.id`：
```typescript
const totalCost = computed(() => {
  const planCost = isYearly.value
    ? parseCost(t(`items.plans.${plan.value}.yearly`))
    : parseCost(t(`items.plans.${plan.value}.monthly`));
  const addonsCost = addonIds.value.reduce(
    (sum, addonId) =>
      sum + (isYearly.value
        ? parseCost(t(`items.addons.${addonId}.yearly`))
        : parseCost(t(`items.addons.${addonId}.monthly`))),
    0,
  );
  const total = planCost + addonsCost;
  // 使用 i18n 的插值功能格式化价格
  return isYearly.value
    ? t('items.priceFormat.yearly', { amount: total })
    : t('items.priceFormat.monthly', { amount: total });
});
```

7. **移除不再使用的 JSON `require()` 调用** — `content.json` 和 `tabs-info.json` 的数据改为从 i18n 动态获取，`items.json` 中仅保留 `id` 和 `icon` 等非文案字段（或直接写在组件中/创建一个结构数据文件）。

---

### 步骤七：适配 nowContent 的 i18n 化 + Step 5 空态处理

原有 `nowContent` 是通过 `require()` 加载 JSON 并 `forEach` 匹配 `id` 获取标题/副标题的。国际化后不再需要这套机制。

**⚠️ Step 5 空态问题：** 原始 `content.json` 中 Step 5 没有 `title` 和 `semititle` 字段（感谢页不需要）。如果直接用 `t('steps.content.step5.title')` 会返回 key 字符串而非空白。原始代码靠 `v-if="nowContent.title"` 守卫来隐藏空标题，改用 `t()` 后这层守卫会失效。

**解决方案：** 用 computed 属性包装，在 `nowTab === '5'` 时返回空字符串：

```typescript
// 移除原有 nowContent reactive 对象和 content.forEach 逻辑
// 用 computed 替代，安全处理 Step 5 无标题的情况
const stepTitle = computed(() => {
  if (nowTab.value === '5') return '';
  return t(`steps.content.step${nowTab.value}.title`);
});

const stepSemititle = computed(() => {
  if (nowTab.value === '5') return '';
  return t(`steps.content.step${nowTab.value}.semititle`);
});
```

模板中替换：
```vue
<div class="title top-area" v-if="stepTitle">{{ stepTitle }}</div>
<div class="semi-title" v-if="stepSemititle">{{ stepSemititle }}</div>
```

同时需修改 `setTabContent` 函数，移除 `content.forEach` 循环和 `nowContent` 相关逻辑。

---

### 步骤八：Store/Type 去语言耦合

**⚠️ 核心问题：** 当前 `addons` 在 Pinia Store 中存储完整的 `IStep3` 对象（含 `title`、`semititle`、`monthly`、`yearly` 等文案字段），这些文案会被持久化到 localStorage。国际化后如果用户切换语言，持久化的旧文案和当前语言的界面文案会脱节。

**解决方案：** `addons` 改为只存 addon 的 `id` 数组，展示时通过 `t()` 动态获取文案。

#### [MODIFY] `src/types/items.ts`

```diff
-export declare interface IStep3 {
-  id: string;
-  title: string;
-  monthly: string;
-  yearly: string;
-  semititle: string;
-}
+// 附加服务：Store 中只存 id，文案通过 i18n 动态获取
+export declare interface IStep3 {
+  id: string;
+}
```

#### [MODIFY] `src/stores/commons.ts`

```diff
-const addons = ref<Array<IStep3>>([]);
+// 只存 addon id，文案从 i18n 动态读取，避免语言切换后持久化数据脱节
+const addonIds = ref<string[]>([]);

-function setAddonItems(addon: IStep3) {
-  const index = addons.value.findIndex((a) => a.id === addon.id);
+function toggleAddon(addonId: string) {
+  const index = addonIds.value.indexOf(addonId);
   if (index === -1) {
-    addons.value.push(addon);
+    addonIds.value.push(addonId);
   } else {
-    addons.value.splice(index, 1);
+    addonIds.value.splice(index, 1);
   }
 }
```

#### [MODIFY] `src/views/HomeView.vue` — 配合 store 变更

```typescript
// Step 3 附加服务按钮点击
@click="toggleAddon(addon.id)"

// Step 3 选中状态判断
:class="['addon non-selected', { selected: addonIds.includes(addon.id) }]"

// Step 4 摘要页展示（通过 id 从 i18n 读取文案）
<div v-for="addonId in addonIds" :key="addonId" class="addons">
  <span>{{ t(`items.addons.${addonId}.title`) }}</span>
  <div class="addon-cost mg-lft">
    <span v-if="!isYearly">{{ t(`items.addons.${addonId}.monthly`) }}</span>
    <span v-else>{{ t(`items.addons.${addonId}.yearly`) }}</span>
  </div>
</div>
```

---

### 步骤九：处理布局适配（英文长文本）

在 `src/assets/scss/commons.scss` 或 HomeView.vue 的 `<style>` 中做适配：

```css
/* 防止长文本溢出：确保标签和文案区可自动换行 */
.label-name,
.card-nm,
.card-des,
.option-nm,
.impt-txt {
  word-break: break-word;
  overflow-wrap: break-word;
}

/* 按钮：优先用 min-width + padding 控制，避免 nowrap 在窄屏下撑出容器 */
.lft-btn,
.rgt-btn {
  min-width: 80px;
  padding: 10px 16px;
  text-align: center;
}

/* 步骤导航文字：小屏下可能需要缩小字号 */
.navbar .name {
  word-break: break-word;
  line-height: 1.3;
}

/* Step 2 套餐卡片：英文名称可能较长，允许弹性换行 */
.option .info {
  min-width: 0;
  overflow-wrap: break-word;
}

/* Step 4 summary 区域：flex-wrap 防止溢出 */
.summary-header {
  flex-wrap: wrap;
  gap: 8px;
}
```

> **布局验证重点（英文模式下）**：
> - Step 2 套餐卡片名称和描述是否换行正常
> - Step 4 summary 区域 header 行是否对齐
> - 底部按钮在移动端 320px 宽度下是否溢出
> - 步骤导航在窄屏下文字是否被截断

---

## 4. 文件变更汇总

| 操作 | 文件路径 | 说明 |
|------|---------|------|
| [NEW] | `src/i18n/index.ts` | i18n 实例 + localStorage 持久化 + `globalInjection: true` |
| [NEW] | `src/i18n/locales/zh-CN/*.ts` (5 文件 + index) | 简体中文翻译模块 |
| [NEW] | `src/i18n/locales/zh-TW/*.ts` (5 文件 + index) | 繁体中文翻译模块 |
| [NEW] | `src/i18n/locales/en/*.ts` (5 文件 + index) | 英文翻译模块 |
| [NEW] | `src/components/LanguageSwitcher.vue` | 语言切换下拉组件 |
| [MODIFY] | `src/main.ts` | 注册 i18n 插件 |
| [MODIFY] | `src/App.vue` | 引入 LanguageSwitcher 组件 |
| [MODIFY] | `src/views/HomeView.vue` | 替换所有硬编码文案为 `t()` 调用；Step 5 空态处理；addons 适配 |
| [MODIFY] | `src/stores/commons.ts` | `addons` 改为 `addonIds: string[]`，去语言耦合 |
| [MODIFY] | `src/types/items.ts` | `IStep3` 简化为仅含 `id` |
| [MODIFY] | `src/assets/scss/commons.scss` | 添加长文本适配样式（无 nowrap） |

---

## 5. 完成标准对照表

| 完成标准 | 实现方式 |
|---------|---------|
| ✅ 集成 Vue I18n 并全局注册，支持 `$t` 或 `t` 函数调用 | `main.ts` 中 `app.use(i18n)`，`globalInjection: true` 启用 `$t` 全局注入，组件中 `useI18n()` 获取 `t` |
| ✅ 3 套语言配置：zh-CN、zh-TW、en | `src/i18n/locales/` 下三个目录，各含 5 个模块文件 |
| ✅ 语言切换组件，切换后全页文本实时更新 | `LanguageSwitcher.vue`，修改 `locale.value` 后自动触发所有 `t()` 和 `computed` 重算 |
| ✅ 所有硬编码文本替换为国际化调用 | 模板中约 30+ 处替换，`<script>` 验证 computed 中 6 处替换，Step 5 空态用 computed 安全处理 |
| ✅ 语言偏好保存到 localStorage，刷新后自动恢复 | `getStoredLocale()` + `setStoredLocale()` 在 `src/i18n/index.ts` 中实现 |
| ✅ 英文/繁体下排版正常，无文字溢出 | `word-break` + `overflow-wrap` 防溢出 + `min-width` / `padding` / `flex-wrap` 适配（不使用 `nowrap`） |
| ✅ 配置文件按模块拆分 | `common.ts`、`steps.ts`、`form.ts`、`validation.ts`、`items.ts` |
| ✅ 支持 v-t 指令和组合式 API（useI18n）两种方式 | `globalInjection: true` + `legacy: false` 双重确保；至少 1 处使用 `v-t` 指令（如 `编辑` 按钮），其余使用 `t()` 函数 |
| ✅ Store 数据与语言解耦 | `addons` 改为 `addonIds: string[]`，持久化不存文案，切换语言后界面文案实时更新 |

---

## 6. 验证计划

### 自动化验证

```bash
# 确保编译无报错
pnpm serve
# 确保 lint 通过
pnpm lint
```

### 手动验证步骤（在浏览器中操作）

**测试 1：默认语言加载**
1. 清除 localStorage 中的 `multi-step-form-locale`
2. 刷新应用，确认默认按浏览器语言或 zh-CN 加载
3. 确认所有步骤导航、表单标签、按钮文案均为中文

**测试 2：实时语言切换**
1. 在步骤 1 填写部分表单数据
2. 通过语言切换器切换到英文（English）
3. 确认：
   - 步骤导航变为 "STEP 1" ... "STEP 4"
   - 表单标签变为 "Name"、"Email Address"、"Phone Number"
   - placeholder 变为英文
   - 底部按钮变为 "Next Step"
4. 进入步骤 2 → 步骤 3 → 步骤 4，确认所有区域文案均已切换
5. 切换到繁体中文，再次检查所有文案

**测试 3：语言偏好持久化**
1. 切换到英文
2. 刷新页面（F5）
3. 确认仍然显示英文界面
4. 关闭标签页重新打开，确认仍为英文

**测试 4：验证提示国际化**
1. 切换到英文
2. 在步骤 1 不填写任何内容，点击 "Next Step"
3. 确认验证错误提示为英文（如 "Please enter your name"）
4. 填写错误格式的邮箱/手机号
5. 确认格式错误提示为英文（如 "Invalid email format"）

**测试 5：动态数据国际化**
1. 在英文模式下，确认步骤 2 套餐名称为英文（"Arcade"、"Advanced"、"Pro"）
2. 确认价格格式为 `$9/mo`、`$90/yr` 等
3. 在步骤 4 摘要页确认总计金额格式正确

**测试 6：布局适配检查**
1. 切换到英文，逐步骤检查：
   - 表单标签是否溢出输入框
   - 按钮文案是否完整显示
   - 步骤导航文字是否换行正常
   - 步骤 4 摘要页内容是否对齐正常
2. 在窄屏/移动端模拟下检查布局

**测试 7：与现有功能兼容**
1. 在任意语言下完整跑通步骤 1→2→3→4→5 的完整流程
2. 确认数据持久化与语言持久化互不干扰
3. 确认步骤锁定/跳转控制正常工作

---

## 7. 风险与注意事项

> [!IMPORTANT]
> **价格数据的处理方式**
>
> 原有 `parseCost` 函数使用 `/[^0-9]/g` 提取数字。国际化后不同语言的价格格式不同（¥9/月 vs $9/mo），但 `parseCost` 只提取数字部分，所以仍然通用。需注意保持各语言翻译中价格的数字部分一致。

> [!WARNING]
> **JSON 数据文件的处理**
>
> 原有 `tabs-info.json`、`content.json`、`items.json` 中的文案将全面迁移到 i18n，但 `items.json` 中的 `icon` 路径等非文案字段仍需保留。建议保留 `items.json` 仅存 `id` 和 `icon`，或直接在组件中定义结构性数据。

> [!WARNING]
> **Store 中 addons 的语言耦合（已修正）**
>
> 原有 `addons` 在 Pinia Store 中存储完整 `IStep3` 对象（含文案字段），持久化后切换语言会导致数据脱节。本计划已在步骤八中修正：`addons` 改为 `addonIds: string[]`，文案通过 `t()` 动态读取。需同步修改 `IStep3` 类型定义和所有引用方。

> [!IMPORTANT]
> **Step 5 空态处理（已修正）**
>
> 原始 `content.json` 中 Step 5 无 `title`/`semititle`（感谢页不需要）。直接用 `t('steps.content.step5.title')` 会返回 key 字符串。本计划已在步骤七中修正：用 `stepTitle` / `stepSemititle` computed 包装，`nowTab === '5'` 时返回空字符串，配合模板 `v-if` 守卫正确隐藏。

> [!NOTE]
> **v-t 指令的使用场景**
>
> `v-t` 指令适合纯文本渲染（不含插值），如 `<button v-t="'common.buttons.edit'" ...></button>`。对于需要动态数据的文案（如含 `{amount}` 插值的价格），必须使用 `t()` 函数。本项目中至少在 1 处（如「编辑」按钮）使用 `v-t` 指令以满足验收标准，其余统一使用 `t()` 函数。

> [!NOTE]
> **`globalInjection: true` 的显式声明（已修正）**
>
> Vue I18n v9 Composition API 模式下，`$t` 的全局注入依赖 `globalInjection: true`。虽然 v9.2-beta.34+ 默认启用，但本项目使用 `vue-i18n@9` 宽版本号，已在 `createI18n` 配置中显式声明，避免版本差异导致的行为不一致。参考文档：https://vue-i18n.intlify.dev/guide/advanced/composition
