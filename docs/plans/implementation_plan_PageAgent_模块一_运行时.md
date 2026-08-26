# Page Agent 模块一：运行时接入计划

## 1. 模块职责

本模块负责把 Page Agent 作为延迟加载的页面能力接入项目，并向演示 UI 提供稳定的 Vue Composable。实现范围只包含脚本加载、类型声明、任务拼装、执行状态、停止和释放，不编写可见面板，也不修改表单组件。

## 2. 文件范围

本模块独占以下文件：

- 新建 `src/composables/usePageAgentDemo.ts`
- 新建 `src/types/page-agent.ts`
- 更新 `src/shims-vue.d.ts`

不得修改 `App.vue`、语言包、Step 组件、`package.json` 或 `vue.config.js`。

## 3. CDN 加载策略

使用固定版本：

```text
https://cdn.jsdelivr.net/npm/page-agent@1.12.2/dist/iife/page-agent.demo.js
```

脚本仅在 UI 调用 `load(locale)` 后注入。查询参数设置为 `showPanel=false`，隐藏 Page Agent 自带面板；`lang` 根据项目语言映射：`en` 对应 `en-US`，`zh-CN` 和 `zh-TW` 都对应 `zh-CN`。

加载器必须满足以下约束：

- 用固定 DOM id 防止重复插入脚本。
- `script.onload` 后继续等待 `window.pageAgent`，因为 Demo Bundle 会在定时回调中创建实例。
- 等待最多 10 秒，超时进入 `error` 状态并返回可识别错误。
- 同一语言重复调用 `load()` 直接复用实例。
- 切换语言且当前没有任务运行时，先 `dispose()` 旧实例，再移除旧脚本并重新加载。
- Agent 运行期间不重新初始化；语言变化在下一次任务开始前处理。
- 不把测试 API 地址、模型名或所谓 API Key 复制进业务源码，由官方 Demo Bundle 管理默认测试配置。

## 4. 类型设计

`src/types/page-agent.ts` 只声明项目实际使用的最小类型，禁止 `any`。至少包含：

- `PageAgentDemoStatus`
- `IPageAgentExecutionResult`
- `IPageAgentInstance`
- `IPageAgentConstructor`
- `IPageAgentDemoResult`

`IPageAgentInstance` 需要覆盖 `status`、`execute(task)`、`stop()` 和 `dispose()`。`src/shims-vue.d.ts` 将 `PageAgent` 与 `pageAgent` 补充到 `Window`，不复制上游完整类型。

## 5. Composable 行为

`usePageAgentDemo()` 使用模块级单例状态，确保多个组件调用时共享同一个 Agent：

- `status` 初始为 `idle`。
- `load()` 期间为 `loading`，完成后回到 `idle`。
- `execute()` 期间为 `running`；成功为 `completed`，失败为 `error`。
- `stop()` 等待上游异步停止完成，然后将状态设为 `stopped`。
- `errorMessage` 每次新任务开始前清空。
- `dispose()` 移除实例、脚本、等待 Promise 和本模块注册的监听器。

运行中再次调用 `execute()` 必须直接拒绝，不创建第二个任务。上游返回 `success: false` 时同样视为失败，并保留一个适合 UI 翻译映射的错误代码；不直接把原始异常、接口地址或响应内容展示给访客。

## 6. 安全任务拼装

运行时只接受一段“套餐偏好”文本，并统一拼装成完整任务。任务必须包含以下不可变约束：

```text
这是一个技术演示，只能使用以下虚构资料：
姓名：演示用户
邮箱：demo@example.com
手机号：13800000000

按页面正常顺序完成个人资料、套餐和附加服务选择。
到达第 4 步汇总页后停止，不要点击最终确认按钮。
用户的套餐偏好：{preference}
```

执行前校验 `preference`：去除首尾空白，长度限制为 1 至 300 个字符；出现邮箱格式或连续 7 位以上数字时拒绝执行。校验函数放在 Composable 内部或同模块文件中，不创建跨模块公共工具。

## 7. 交付接口

模块完成后，模块二应能这样使用：

```ts
const { status, errorMessage, load, execute, stop } = usePageAgentDemo();

await load(locale.value);
await execute(preference, locale.value);
await stop();
```

具体返回类型以总览中的共享接口契约为准。若实现必须调整契约，先更新总览并通知模块二负责人，不能只在代码中临时变更。

## 8. 验证与交付

- 模拟两次并发 `load()`，只产生一个 script 元素和一个 Agent 实例。
- 未调用 `load()` 时页面不请求 CDN。
- `en`、`zh-CN`、`zh-TW` 映射正确。
- 空文本、超过 300 字、邮箱和疑似手机号均被拒绝。
- 任务文本始终包含固定资料和“停在汇总页”的约束。
- 执行失败、脚本超时和手动停止后状态正确，下一次任务仍可重试。
- 运行 TypeScript 检查、lint 和生产构建；若本地依赖损坏，先重新安装依赖再判断代码问题。

交付说明中列出新增接口、验证结果和已知的官方测试 API 不稳定风险，不提交 UI 或部署改动。
