# AI-Assisted Multi-Step Form

一个使用 Vue 3 与 TypeScript 构建的多步骤订阅表单，并通过 [Alibaba Page Agent](https://github.com/alibaba/page-agent) 加入自然语言页面操作能力。访客可以描述套餐偏好，让 AI 自动填写演示资料、选择计费周期与附加服务，并在汇总页交还最终确认权。

An AI-assisted multi-step subscription form built with Vue 3 and TypeScript. With [Alibaba Page Agent](https://github.com/alibaba/page-agent), visitors can describe their preferences in natural language while the agent fills demo data, selects billing options and add-ons, then hands control back at the summary step.

[在线演示 / Live Demo](https://mr-cg-end.github.io/multi-step-form/) · [Page Agent](https://github.com/alibaba/page-agent)

---

## 中文介绍

### 项目亮点

- **五步订阅流程**：个人资料、套餐选择、附加服务、订单汇总与完成页面
- **Page Agent 智能体**：基于自然语言完成跨步骤表单操作与控件交互
- **三条推荐体验指令**：内置高频典型场景，同时支持自定义偏好输入
- **多语言支持**：简体中文 (zh-CN)、繁体中文 (zh-TW) 与英文 (en) 实时切换
- **状态持久化**：Pinia 状态管理结合 LocalStorage 本地持久化，页面刷新数据不丢失
- **严格表单校验**：实时防抖校验邮箱格式与中国大陆手机号
- **响应式界面**：完美适配桌面端与移动端屏幕
- **无障碍访问**：完整的键盘操作支持、ARIA 状态提示与清晰的表单语义

### AI 演示说明与推荐指令

点击页面右下角的“AI 演示 / AI 表单演示”按钮展开操作面板。在首次使用时请阅读使用须知并点击“同意并开始演示”，随后可直接选择推荐指令体验自动化操作：

1. **指令一**：`选择年度专业版，不添加附加服务。`
2. **指令二**：`选择月度基础版，添加在线服务和自定义个人资料。`
3. **指令三**：`选择年度高级版，添加更大存储空间。`

#### 核心行为与安全规范
- **虚构数据**：AI 演示采用固定虚构身份信息（姓名：`演示用户`，邮箱：`demo@example.com`，手机号：`13800000000`）。
- **汇总步交还确认权**：AI 会依次完成前三步填写，并精准**停留在第 4 步汇总页**，不会自动点击最终确认提交，由访客亲自核对信息后决定是否提交。
- **隐私保护与输入拦截**：自定义输入仅用于描述套餐、计费周期与附加服务。系统会在前端自动拦截包含邮箱格式或疑似连续手机号码的输入，防止真实隐私信息外泄。
- **状态自动重置**：每次启动 AI 任务前，系统会自动清空已有表单状态，防止脏数据干扰。

> [!IMPORTANT]
> - **技术评估性质**：本功能为基于 Page Agent 官方免费测试 API 的前端技术评估与演示，非生产级 AI 业务系统。
> - **测试接口说明**：官方测试 API 可能存在请求限流、响应延迟或临时维护等情况；测试接口异常不影响普通表单的正常手动填写与提交流程。
> - **请勿输入真实信息**：请勿在演示界面输入真实姓名、邮箱、手机号或其他敏感隐私数据。

---

## English Overview

### Highlights

- **Five-Step Subscription Flow**: Personal info, plan selection, add-ons, order summary, and completion.
- **Page Agent Integration**: Natural-language-driven GUI automation across steps.
- **Three Recommended Preset Prompts**: Ready-to-run scenarios plus custom preference input.
- **Internationalization (i18n)**: Seamless switching between Simplified Chinese, Traditional Chinese, and English.
- **Persistent State**: Pinia state management with LocalStorage persistence across page refreshes.
- **Form Validation**: Real-time debounced email and mobile phone validation.
- **Responsive Layout**: Optimized for desktop and mobile viewports.
- **Accessibility (a11y)**: Full keyboard navigation, ARIA live region updates, and semantic HTML form controls.

### AI Demo Guide & Recommended Prompts

Click the "AI Demo" button in the bottom-right corner. On first use, review the terms and click "Agree & Start Demo", then choose from the preset prompts:

1. **Preset 1**: `Select Yearly Pro plan without addons.`
2. **Preset 2**: `Select Monthly Arcade plan with Online service and Customizable profile.`
3. **Preset 3**: `Select Yearly Advanced plan with Larger storage.`

#### Execution Behavior & Privacy Safeguards
- **Fictitious Identity**: The AI uses fixed mock data (`Demo User` / `demo@example.com` / `13800000000`).
- **Summary Step Handover**: The agent completes steps 1–3 and **stops on Step 4 (Summary)** without clicking final confirmation, leaving the final submission decision to the user.
- **Privacy Protection**: Custom prompt inputs are strictly for plan preferences. Inputs matching email patterns or continuous digits resembling phone numbers are blocked client-side.
- **State Reset**: Existing form states are cleared before each AI execution to ensure a clean context.

> [!IMPORTANT]
> - **Evaluation Only**: This is a frontend technology demonstration powered by the Page Agent public test API, not a production AI service.
> - **Test API Notice**: The testing API may experience rate limiting, latency, or temporary downtime. The regular form remains fully functional regardless of the AI test service status.
> - **Do Not Enter Real Data**: Please do not provide real personal names, emails, phone numbers, or sensitive data.

---

## 技术栈 / Tech Stack

- **Framework**: Vue 3 (Composition API, `<script setup>`)
- **Language**: TypeScript 5.x
- **State Management**: Pinia 2.x
- **Routing**: Vue Router 4.x
- **i18n**: Vue I18n 9.x
- **Styling**: SCSS
- **AI Agent**: [Alibaba Page Agent 1.12.2](https://github.com/alibaba/page-agent)
- **Package Manager**: pnpm

---

## 本地开发与发布 / Development & Deployment

### 本地运行 / Local Development

```bash
# 安装依赖
pnpm install

# 启动本地开发服务器
pnpm run dev
```

### 代码检查与构建 / Lint & Build

```bash
# 代码风格与语法检查
pnpm run lint

# 生产环境编译构建（产物输出至 dist 目录）
pnpm run build
```

### 发布到 GitHub Pages / Deploy

```bash
# 自动执行 predeploy (构建) 并推送 dist 到 gh-pages 分支
pnpm run deploy
```

---

## 页面预览 / Screenshots

### 桌面端 / Desktop

| 个人资料 / Personal Info | 套餐选择 / Select Plan |
| --- | --- |
| ![个人资料步骤](./src/assets/images/multi-1.png) | ![套餐选择步骤](./src/assets/images/multi-3.png) |

| 订单汇总 / Summary | 完成页面 / Thank You |
| --- | --- |
| ![订单汇总步骤](./src/assets/images/multi-6.png) | ![订阅完成页面](./src/assets/images/multi-7.png) |

### 移动端 / Mobile

| 移动端表单 / Mobile Form | 移动端套餐 / Mobile Plan |
| --- | --- |
| ![移动端表单页面](./src/assets/images/multi-mobile-1.png) | ![移动端套餐页面](./src/assets/images/multi-mobile-2.png) |

---

## 隐私与第三方服务 / Privacy and Third-Party Services

Page Agent 在浏览器内分析简化后的页面 DOM 结构，仅在访客主动发起指令时将任务指令及必要视图信息发送至配置的模型服务进行规划与解析。本演示使用官方测试服务，全程使用固定虚构数据。

- [Page Agent Terms of Use & Privacy](https://github.com/alibaba/page-agent/blob/main/docs/terms-and-privacy.md)
- [Page Agent GitHub Repository](https://github.com/alibaba/page-agent)

---

## 开源许可与致谢 / License & Credits

- 本项目基于 [MIT License](https://opensource.org/licenses/MIT) 开源。
- [Alibaba Page Agent](https://github.com/alibaba/page-agent) - 页面内智能体自动化能力
- [Frontend Mentor](https://www.frontendmentor.io/) - 多步骤表单 UI 设计与交互规范
