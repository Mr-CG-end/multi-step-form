# Page Agent 演示项目：多 Agent 协作总览

## 1. 改造目标

这轮改造要把现有多步骤表单变成一个适合公开展示的 AI 页面操作演示。访客可以从预设指令中选择一个，也可以用自然语言描述套餐偏好。Page Agent 使用固定的虚构资料完成个人信息、套餐和附加服务选择，并停在汇总页，把最终确认留给访客。

项目继续使用 Vue 3、TypeScript、Pinia、Vue I18n 和 GitHub Pages。Page Agent 采用固定版本的官方 Demo CDN，不新增模型密钥、后端服务或浏览器扩展。官方测试 API 只用于技术评估，因此 AI 模式不得处理真实姓名、邮箱、手机号或其他敏感信息。

## 2. 模块划分与领取顺序

本任务拆为四个模块。模块一、模块三可以并行开始；模块二依赖模块一提供的运行时接口；模块四需要在前三个模块合并后完成最终验证与发布配置。

| 模块 | 建议负责人 | 计划文件 | 主要产物 | 前置依赖 |
| --- | --- | --- | --- | --- |
| 模块一：Page Agent 运行时 | Agent A | `implementation_plan_PageAgent_模块一_运行时.md` | CDN 加载、类型、执行与停止接口 | 无 |
| 模块二：演示面板与交互 | Agent B | `implementation_plan_PageAgent_模块二_演示界面.md` | AI 入口、同意提示、指令面板、三语言文案 | 模块一接口完成 |
| 模块三：表单语义与流程稳定 | Agent C | `implementation_plan_PageAgent_模块三_表单适配.md` | 控件语义、Agent 可识别性、流程验收 | 无，可并行 |
| 模块四：发布与整体验收 | Agent D | `implementation_plan_PageAgent_模块四_发布验收.md` | GitHub Pages 配置、README、完整验收 | 模块一至三完成 |

## 3. 文件所有权

多 Agent 协作时必须遵守文件所有权，避免同时修改同一文件。

| 模块 | 独占文件或目录 |
| --- | --- |
| 模块一 | `src/composables/usePageAgentDemo.ts`、`src/types/page-agent.ts`、`src/shims-vue.d.ts` |
| 模块二 | `src/components/PageAgentDemo.vue`、`src/App.vue`、三套语言包中的 `agent.ts` 与语言入口文件 |
| 模块三 | `src/components/home/steps/StepPlan.vue`、`StepAddons.vue`，以及计费周期和流程控件所在组件 |
| 模块四 | `package.json`、`vue.config.js`、`README.md`、发布配置文件 |

如果实现过程中发现必须修改其他模块拥有的文件，不直接修改。负责人应在交付说明中写出所需变更，由该文件的负责人或最后的集成 Agent 处理。

## 4. 共享接口契约

模块一必须向模块二提供以下稳定接口，模块二不得直接操作 `window.pageAgent`：

```ts
type PageAgentDemoStatus =
  | "idle"
  | "loading"
  | "running"
  | "completed"
  | "error"
  | "stopped";

interface IPageAgentDemoResult {
  success: boolean;
  message: string;
}

interface IPageAgentDemoControls {
  status: Readonly<Ref<PageAgentDemoStatus>>;
  errorMessage: Readonly<Ref<string>>;
  load: (locale: string) => Promise<void>;
  execute: (preference: string, locale: string) => Promise<IPageAgentDemoResult>;
  stop: () => Promise<void>;
  dispose: () => void;
}
```

`execute()` 接收的只是套餐偏好，不接收个人资料。运行时统一拼接固定资料和流程约束：姓名为“演示用户”，邮箱为 `demo@example.com`，手机号为 `13800000000`；Agent 必须按步骤操作并停在第 4 步汇总页，不得点击最终确认。

## 5. 统一交互与隐私规则

AI 能力默认不加载。访客第一次打开 AI 演示面板时先看到说明，明确测试 API 会处理任务指令和简化后的页面结构、不得使用真实个人信息、服务可能限流或暂停。只有点击“同意并开始演示”后才加载 CDN。

自由输入只描述套餐、月付或年付、附加服务，不允许出现邮箱格式或疑似手机号的连续数字。执行前调用现有 Store 的 `clearForm()`，防止页面已有内容进入 Agent 上下文。预设指令和自由输入都必须经过同一套校验与安全任务拼装逻辑。

## 6. 集成顺序

模块一完成后先提交运行时接口，模块二再基于该接口开发 UI。模块三可以独立提交表单语义改造。三者合并后由模块四修复部署路径、补充说明并执行整体检查。

建议提交顺序如下：

```text
feat(agent): 接入 Page Agent 演示运行时
feat(agent-ui): 添加 AI 表单演示面板
feat(form): 增强表单控件语义与 Agent 可操作性
chore(deploy): 恢复 GitHub Pages 发布流程
docs: 补充 Page Agent 演示说明
```

## 7. 总体验收标准

- 未同意隐私说明时，不产生 Page Agent CDN 请求。
- 三种界面语言都能打开 AI 演示面板，繁体中文的 Agent 工作语言映射为简体中文。
- 三条预设指令均能从空表单运行到第 4 步，选择结果与指令一致。
- Agent 不会点击最终确认，访客可以检查汇总内容后自行提交。
- 疑似邮箱或手机号输入被阻止，执行前已有表单状态被清空。
- CDN、网络、限流或 Agent 执行失败时，普通表单仍可继续使用。
- 桌面和移动布局中，AI 面板不遮挡语言切换器、步骤按钮和确认按钮。
- 生产构建不会删除 `docs/plans`，GitHub Pages 可以从仓库对应地址正常访问。

## 8. 明确不在本轮处理的内容

本轮不接入自有 LLM、不建设服务端代理、不保存对话记录、不加入埋点分析，也不引入 Page Agent 浏览器扩展、MCP 或跨页面操作。官方测试 API 若停止服务，页面只显示可恢复错误，不实现备用模型线路。
