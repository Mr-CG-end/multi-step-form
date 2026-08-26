# Page Agent 模块三：表单语义与流程适配计划

## 1. 模块职责

Page Agent 通过文本化 DOM 理解页面，因此控件的名称、状态和类型会直接影响操作稳定性。本模块不改变表单业务规则，只补全套餐、附加服务和计费周期控件的原生语义，让 Agent、键盘用户和辅助技术都能可靠识别当前状态。

该模块可与运行时模块并行开发，不依赖 AI 面板。实现时使用正常的 DOM 点击和输入路径，禁止为了 Agent 直接修改 Pinia 状态或提供隐藏的业务快捷接口。

## 2. 文件范围

本模块主要负责：

- `src/components/home/steps/StepPlan.vue`
- `src/components/home/steps/StepAddons.vue`
- 计费周期控件所在的 Step 组件

如确实需要调整 `HomeView.vue` 的底部按钮语义，只能做 `type`、ARIA 或可访问名称补充，不改流程逻辑。不得修改 AI 面板、运行时、语言包或部署配置。

## 3. 套餐控件

每个套餐继续使用真实 `button`，并补充：

- `type="button"`，避免未来放入 `<form>` 后意外提交。
- `:aria-pressed="item.id === plan"`，暴露选中状态。
- 由套餐名、当前周期价格和折扣信息组成的本地化 `aria-label`。
- 套餐图标使用空 `alt`，避免 Agent 和屏幕阅读器把文件信息当成主要文本。

点击后仍调用现有 `setPlanItem(item.id)`。不改变默认套餐、不增加二次确认，也不引入新的 Store 字段。

## 4. 附加服务控件

每个附加服务继续使用 `button`，补充 `type="button"` 和 `:aria-pressed="addonIds.includes(addon.id)"`。可访问名称包含附加服务标题、说明与当前周期价格。内部勾选图标标记为装饰内容，按钮本身承担交互语义。

点击仍调用 `setAddonItems(addon.id)`。多选行为保持不变，重复点击取消选择。

## 5. 计费周期控件

当前 checkbox 使用 `hidden`，虽然 label 可以点击，但 Agent 和键盘用户难以确认状态。改造时保留原生 checkbox，使用视觉隐藏样式代替 `hidden` 属性，并补充：

- 明确的本地化名称，表达“月度/年度计费”。
- `role="switch"` 与 `:aria-checked="isYearly"`。
- 键盘焦点样式，与项目现有深蓝和淡紫配色一致。

仍由现有 `toggleYearly()` 更新状态，不将 `v-model` 和手动切换逻辑混用，避免单次操作触发两次。

## 6. 步骤和提交按钮

检查“返回”“下一步”“确认”和汇总页“编辑”按钮：

- 所有非表单提交按钮明确声明 `type="button"`。
- 可见文案已经足够时不重复添加冗长 `aria-label`。
- 当前步骤、已完成步骤和不可访问步骤继续使用现有状态规则。
- Agent 必须通过“下一步”触发现有校验，不能跳过 Step 1 或直接进入汇总页。

本模块不修改“确认后清除持久化数据”的现有行为。Agent 是否停在汇总页由运行时任务约束负责。

## 7. Vue 状态同步验证

Page Agent 输入和点击后必须确认 Vue 状态确实更新，而不只是 DOM 看起来改变。验证时观察以下数据：

- `personalInfo.name`、`personalInfo.email`、`personalInfo.phone`
- `plan`
- `isYearly`
- `addonIds`
- `nowTab` 与 `completedSteps`

测试输入完成后点击“下一步”，应通过现有 `checkForm()`；套餐与附加服务选择应同步反映在汇总页。若出现 DOM 值变化但 Pinia 未更新，先记录可复现步骤，再以正常 input/change/click 事件兼容方式修复，不添加 `window` 全局后门。

## 8. 验收场景

- 键盘 Tab 能依次聚焦套餐、计费周期、附加服务和导航按钮。
- 空格或 Enter 可以切换套餐、周期和附加服务。
- `aria-pressed`、`aria-checked` 与 Pinia 状态始终一致。
- 月付与年付切换后，可访问名称和可见价格同步变化。
- 三种语言下 Agent 都能依据可见文字选中指定套餐和附加服务。
- 从 Step 1 到 Step 4 的人工流程与改造前一致，校验、返回和编辑功能不回归。
- lint、TypeScript 检查和生产构建通过。

交付时说明改动过的控件、人工键盘测试结果和 Page Agent 实测结果。不要在本模块中调整视觉布局或新增 AI 面板。
