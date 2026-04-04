# 【基础任务 4】国际化（i18n）支持实施计划

## 1. 任务目标

本任务的目标是为多步骤表单补齐国际化接入，并支持以下三种语言：

- 简体中文 `zh-CN`
- 繁体中文 `zh-TW`
- 英文 `en`

当前项目的 i18n 基础设施已经搭建完成，但业务页面还没有完成从硬编码文案到翻译 key 的全面迁移。因此，本计划基于“当前已重构项目”继续推进，而不是从零开始重新设计。

---

## 2. 当前项目状态

### 2.1 已完成部分

以下能力已经落地：

- 已安装并注册 `vue-i18n`
- 已创建 [`src/i18n/index.ts`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/i18n/index.ts)
- 已建立三套语言资源目录
  - `src/i18n/locales/zh-CN`
  - `src/i18n/locales/zh-TW`
  - `src/i18n/locales/en`
- 已在 [`src/main.ts`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/main.ts) 中注册 i18n 插件
- 已创建语言切换组件 [`src/components/LanguageSwitcher.vue`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/components/LanguageSwitcher.vue)
- 已在 [`src/App.vue`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/App.vue) 中接入语言切换组件
- [`src/views/HomeView.vue`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/views/HomeView.vue) 已完成结构拆分
- Step 1 校验逻辑已抽离到 [`src/composables/usePersonalInfoValidation.ts`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/composables/usePersonalInfoValidation.ts)
- 原始 JSON 数据已通过 [`src/constants/formData.ts`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/constants/formData.ts) 做了一层集中导出

### 2.2 当前结构

```text
src/
  components/
    LanguageSwitcher.vue
    home/
      steps/
        StepPersonalInfo.vue
        StepPlan.vue
        StepAddons.vue
        StepSummary.vue
        StepThankYou.vue
  composables/
    usePersonalInfoValidation.ts
  constants/
    formData.ts
  i18n/
    index.ts
    locales/
      zh-CN/
      zh-TW/
      en/
  views/
    HomeView.vue
```

### 2.3 尚未完成部分

虽然 i18n 基础设施已经具备，但页面层仍然主要依赖硬编码中文或中文 JSON 数据：

- [`src/views/HomeView.vue`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/views/HomeView.vue) 中仍有按钮和提示文案
- [`src/components/home/steps/StepPersonalInfo.vue`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/components/home/steps/StepPersonalInfo.vue) 中仍有中文标签和 placeholder
- [`src/components/home/steps/StepPlan.vue`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/components/home/steps/StepPlan.vue) 中仍有套餐和周期文案
- [`src/components/home/steps/StepAddons.vue`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/components/home/steps/StepAddons.vue)、[`src/components/home/steps/StepSummary.vue`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/components/home/steps/StepSummary.vue)、[`src/components/home/steps/StepThankYou.vue`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/components/home/steps/StepThankYou.vue) 中仍有中文展示文案
- [`src/composables/usePersonalInfoValidation.ts`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/composables/usePersonalInfoValidation.ts) 的校验消息仍是硬编码中文
- [`src/constants/formData.ts`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/constants/formData.ts) 仍然导出带中文展示内容的数据
- [`src/stores/commons.ts`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/stores/commons.ts) 中的 `addons` 仍存储完整对象，存在语言耦合风险

结论：当前项目处于“基础设施已完成，业务接入未完成”的状态。

---

## 3. 实施原则

由于 [`src/views/HomeView.vue`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/views/HomeView.vue) 已经拆分，后续 i18n 改造应按“容器页 + step 子组件 + composable + constants”的结构推进。

原则如下：

- `HomeView.vue` 负责流程控制、顶部标题、底部按钮、步骤切换提示
- 各 step 组件各自接入 `useI18n()`，处理本步骤内部文案
- `usePersonalInfoValidation.ts` 负责校验逻辑，但返回的 `message` 必须改为翻译结果
- `constants/formData.ts` 不再承载最终展示文案，只保留结构数据或 key
- Store 不持久化带文案的完整对象，避免切换语言后状态与界面脱节

### 3.1 推荐的展示写法

本项目推荐的方式是：在组件的 `<script setup>` 里先集中组装展示数据，然后模板只负责展示。

也就是说，可以在某个组件里先把当前组件需要的标题、价格、标签、摘要文本统一拼好，再在模板中直接渲染；但不建议把所有步骤的展示数据都集中塞回一个大组件。

推荐形式如下：

```ts
const summaryView = computed(() => ({
  title: t("form.summary.personalInfo"),
  totalLabel: isYearly.value
    ? t("form.summary.totalYearly")
    : t("form.summary.totalMonthly"),
  planName: t(`items.plans.${plan.value}.name`),
  planPrice: isYearly.value
    ? t(`items.plans.${plan.value}.yearly`)
    : t(`items.plans.${plan.value}.monthly`),
}));
```

模板中直接展示：

```vue
<div>{{ summaryView.title }}</div>
<div>{{ summaryView.planName }}</div>
<div>{{ summaryView.planPrice }}</div>
<div>{{ summaryView.totalLabel }}</div>
```

这样做的好处：

- 模板更干净
- 条件判断和字符串拼接集中在 `<script setup>` 中
- 每个 step 组件只管理自己的展示模型，不会重新膨胀成大组件

因此，后续文档中的“接入 i18n”默认采用“组件内先集中拼 view model，再展示”的方式。

---

## 4. 调整后的实施方案

### 步骤一：保留现有 i18n 基础设施

以下部分已完成，无需重复实现：

- [`src/i18n/index.ts`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/i18n/index.ts)
- `src/i18n/locales/zh-CN/*`
- `src/i18n/locales/zh-TW/*`
- `src/i18n/locales/en/*`
- [`src/main.ts`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/main.ts)
- [`src/components/LanguageSwitcher.vue`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/components/LanguageSwitcher.vue)
- [`src/App.vue`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/App.vue)

这一部分已完成，不再列为新增开发任务。

### 步骤二：改造 `HomeView.vue`

需要处理的内容：

- 步骤提示文案
- 底部按钮文案：返回、下一步、确认
- 顶部标题和副标题

建议在 [`src/views/HomeView.vue`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/views/HomeView.vue) 中引入：

```ts
import { useI18n } from "vue-i18n";

const { t } = useI18n();
```

并在 `<script setup>` 中集中组装页面级展示数据：

```ts
const pageView = computed(() => ({
  stepTip: t("common.toast.stepOrder"),
  backText: t("common.buttons.back"),
  nextText: t("common.buttons.next"),
  confirmText: t("common.buttons.confirm"),
  title: nowTab.value === "5" ? "" : t(`steps.content.step${nowTab.value}.title`),
  semititle:
    nowTab.value === "5" ? "" : t(`steps.content.step${nowTab.value}.semititle`),
}));
```

模板中直接展示：

- `pageView.stepTip`
- `pageView.backText`
- `pageView.nextText`
- `pageView.confirmText`
- `pageView.title`
- `pageView.semititle`

### 步骤三：改造各 step 组件

#### 1. `StepPersonalInfo.vue`

将以下内容改为 i18n：

- 姓名、邮箱、手机号标签
- placeholder

建议在组件中先集中生成：

```ts
const formView = computed(() => ({
  nameLabel: t("form.labels.name"),
  emailLabel: t("form.labels.email"),
  phoneLabel: t("form.labels.phone"),
  namePlaceholder: t("form.placeholders.name"),
  emailPlaceholder: t("form.placeholders.email"),
  phonePlaceholder: t("form.placeholders.phone"),
}));
```

#### 2. `StepPlan.vue`

不建议模板直接读 `STEP2_ITEMS` 里的中文字段。应保留结构数据，通过 `item.id` 组装展示模型：

```ts
const planCards = computed(() =>
  STEP2_ITEMS.map((item) => ({
    ...item,
    name: t(`items.plans.${item.id}.name`),
    monthly: t(`items.plans.${item.id}.monthly`),
    yearly: t(`items.plans.${item.id}.yearly`),
    discount: t(`items.plans.${item.id}.discount`),
  })),
);

const periodView = computed(() => ({
  monthly: t("common.period.monthly"),
  yearly: t("common.period.yearly"),
}));
```

#### 3. `StepAddons.vue`

建议在组件中先把 `STEP3_ITEMS` 转为可直接展示的数据：

```ts
const addonCards = computed(() =>
  STEP3_ITEMS.map((addon) => ({
    ...addon,
    title: t(`items.addons.${addon.id}.title`),
    semititle: t(`items.addons.${addon.id}.semititle`),
    monthly: t(`items.addons.${addon.id}.monthly`),
    yearly: t(`items.addons.${addon.id}.yearly`),
  })),
);
```

#### 4. `StepSummary.vue`

这是最适合“先集中拼好再展示”的组件。建议在组件内集中组织摘要数据：

```ts
const summaryView = computed(() => ({
  personalTitle: t("form.summary.personalInfo"),
  addonsTitle: t("form.summary.addons"),
  noAddonsText: t("form.summary.noAddons"),
  totalLabel: isYearly.value
    ? t("form.summary.totalYearly")
    : t("form.summary.totalMonthly"),
  editText: t("common.buttons.edit"),
}));
```

`nowPlan`、`totalCost` 也建议在该组件中集中生成后再渲染。

#### 5. `StepThankYou.vue`

建议在组件内先集中定义：

```ts
const thankYouView = computed(() => ({
  title: t("common.thankYou.title"),
  message: t("common.thankYou.message"),
}));
```

模板直接显示 `thankYouView.title` 和 `thankYouView.message`。

### 步骤四：改造 `usePersonalInfoValidation.ts`

在 [`src/composables/usePersonalInfoValidation.ts`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/composables/usePersonalInfoValidation.ts) 中引入：

```ts
import { useI18n } from "vue-i18n";

const { t } = useI18n();
```

然后把校验消息统一改为翻译 key：

- `t("validation.required.name")`
- `t("validation.required.email")`
- `t("validation.required.phone")`
- `t("validation.format.email")`
- `t("validation.format.phone")`

### 步骤五：调整 `formData.ts` 的职责

[`src/constants/formData.ts`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/constants/formData.ts) 当前虽然做了“集中管理”，但导出的仍是中文展示数据。

调整原则：

- 保留 `id`
- 保留 `icon`
- 保留排序和结构信息
- 移除标题、文案、价格字符串等最终展示内容

示例：

```ts
export const TABS = [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }];

export const STEP2_ITEMS = [
  { id: "1", icon: "icon-arcade.svg" },
  { id: "2", icon: "icon-advanced.svg" },
  { id: "3", icon: "icon-pro.svg" },
];
```

组件内再通过 `t()` 组装展示模型。

### 步骤六：解除 Store 与文案的耦合

[`src/stores/commons.ts`](/D:/Frontend/practice-vibe-coding/multi-step-form/src/stores/commons.ts) 当前仍保存完整 `addon` 对象，这会导致切换语言后持久化状态与展示文案脱节。

建议改为只保存 `id`：

```ts
const addonIds = ref<string[]>([]);
```

展示时由组件根据 `addonId` 通过 `t()` 生成对应文案。

---

## 5. 文件变更清单

| 操作 | 文件路径 | 调整内容 |
|------|---------|---------|
| 保留 | `src/i18n/index.ts` | 已完成 |
| 保留 | `src/i18n/locales/**` | 已完成 |
| 保留 | `src/main.ts` | 已接入 i18n |
| 保留 | `src/App.vue` | 已接入 `LanguageSwitcher` |
| 保留 | `src/components/LanguageSwitcher.vue` | 已完成语言切换 |
| 修改 | `src/views/HomeView.vue` | 页面级展示模型集中组装 |
| 修改 | `src/components/home/steps/StepPersonalInfo.vue` | 表单展示模型集中组装 |
| 修改 | `src/components/home/steps/StepPlan.vue` | 套餐展示模型集中组装 |
| 修改 | `src/components/home/steps/StepAddons.vue` | 附加项展示模型集中组装 |
| 修改 | `src/components/home/steps/StepSummary.vue` | 摘要展示模型集中组装 |
| 修改 | `src/components/home/steps/StepThankYou.vue` | 感谢页展示模型集中组装 |
| 修改 | `src/composables/usePersonalInfoValidation.ts` | 校验消息改为 i18n |
| 修改 | `src/constants/formData.ts` | 改为只导出结构数据 |
| 建议修改 | `src/stores/commons.ts` | `addons` 改为只存 id |
| 建议修改 | `src/types/items.ts` | 配合 store 调整类型 |

---

## 6. 完成标准

本任务完成时，应满足以下标准：

- 语言切换后页面文案实时变化
- `HomeView.vue` 与所有 step 组件不再保留硬编码中文展示文案
- 校验提示跟随当前语言切换
- 顶部标题、副标题不再依赖中文 JSON 内容
- `formData.ts` 只承担结构数据职责
- 各组件优先在 `<script setup>` 中集中拼装展示模型，再在模板中直接展示
- 英文、繁体中文场景下布局不出现明显溢出
- 刷新页面后语言偏好仍能恢复
- 持久化表单状态与当前语言展示保持一致

---

## 7. 验证计划

### 自动验证

```bash
npm run lint
```

### 手动验证

1. 清空 `localStorage` 中的 `multi-step-form-locale`
2. 刷新页面，确认默认语言按浏览器语言或默认值加载
3. 在 Step 1 输入部分内容后切换到英文，确认标题、按钮、表单标签、placeholder、报错文案全部切换
4. 继续检查 Step 2 到 Step 5 的套餐、附加项、摘要区、感谢页是否全部切换
5. 刷新页面，确认语言偏好和表单状态同时恢复，且没有中文残留

---

## 8. 风险与注意事项

> [!IMPORTANT]
> 当前项目已经拆分为 `HomeView + step 子组件 + composable + constants` 结构。后续改造必须按这个结构推进，不应再退回到单文件大组件模式。

> [!IMPORTANT]
> 本项目允许在“某个组件中先集中修改并组装展示数据，然后再直接展示”。这是推荐方式，但范围应限定在当前组件自身，不应把所有 step 的展示逻辑重新集中到一个大组件。

> [!WARNING]
> `src/constants/formData.ts` 当前虽然位于 `constants/`，但本质仍在输出中文展示数据。如果不调整职责，后续仍会残留静态中文。

> [!WARNING]
> `src/stores/commons.ts` 当前仍保存完整 `addon` 对象。只要对象中带展示文案，语言切换与持久化状态就存在脱节风险。

> [!NOTE]
> 当前后续工作的重点已经从“新增 i18n 基础设施”转为“业务接入”和“状态去文案化”。
