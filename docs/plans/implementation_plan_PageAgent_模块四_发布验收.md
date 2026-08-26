# Page Agent 模块四：GitHub Pages 发布与整体验收计划

## 1. 模块职责

本模块在运行时、演示界面和表单适配完成后执行，负责修复现有发布配置、补充项目说明，并完成一次接近真实访客环境的整体验收。它不是功能开发模块，不应重写前三个模块已经通过验收的实现。

## 2. 发布配置现状

当前远端仓库为 `Mr-CG-end/multi-step-form`，但 `package.json` 的 `homepage` 仍指向旧地址。`vue.config.js` 又将 `outputDir` 设置为 `docs`，而 `docs/plans` 已经保存项目计划；继续按现配置构建可能清理计划文档。

发布配置统一调整为：

- GitHub Pages 地址：`https://mr-cg-end.github.io/multi-step-form/`
- `publicPath`：`/multi-step-form/`
- 构建目录：`dist`
- 发布方式：使用现有 `gh-pages` 依赖把 `dist` 推送到 `gh-pages` 分支

## 3. 文件范围

本模块独占：

- `package.json`
- `vue.config.js`
- `README.md`
- 新增发布流程配置文件（如果采用 GitHub Actions）

默认采用本地 `gh-pages` 脚本，不额外增加 GitHub Actions。只有仓库已经启用 Actions 且负责人明确要求自动部署时，才改用工作流文件。

## 4. 脚本与构建调整

在 `package.json` 增加：

```json
{
  "scripts": {
    "predeploy": "pnpm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

保留现有 `dev`、`build` 和 `lint`。`vue.config.js` 将 `outputDir` 改为 `dist`，修正 `publicPath` 大小写与尾部斜线。不要移动或删除 `docs/plans`。

若本地 lint 仍因 `node_modules/@vue/cli-shared-utils/node_modules/lru-cache/index.js` 损坏而无法启动，先删除损坏的依赖目录并通过 pnpm 重新安装；不要通过关闭 lint 或修改规则绕过环境问题。

## 5. README 内容

README 至少补充以下信息：

- 项目简介与在线演示链接。
- Page Agent 演示入口和三条推荐尝试方式。
- “AI 会停在汇总页，最终确认由访客完成”的说明。
- 仅使用虚构资料、不得输入真实个人信息的醒目提示。
- 官方测试 API 可能限流、降级或停止，不代表普通表单故障。
- 技术栈、开发命令、构建命令和部署命令。
- Page Agent 项目链接、MIT 许可证和测试 API 条款链接。

README 不写入测试 API 内部地址或密钥，也不把该演示描述为生产可用的 AI 表单产品。

## 6. 自动检查

依赖环境恢复后依次执行：

```text
pnpm run lint
pnpm run build
git diff --check
```

构建后确认：

- `dist` 生成且资源引用包含 `/multi-step-form/` 前缀。
- `docs/plans` 文件数量与构建前一致。
- 构建产物中没有真实 API Key、用户数据或本机绝对路径。
- Page Agent CDN 版本固定为 `1.12.2`，没有使用 `latest`。

## 7. 浏览器验收矩阵

### 普通表单

- 不打开 AI 面板，完整走完五个步骤。
- 校验错误、返回、编辑、确认和刷新后状态行为与原项目一致。
- 三种语言均能正常显示。

### AI 演示

- 清空浏览器同意状态，确认未同意前没有 Page Agent CDN 请求。
- 同意后运行三条预设指令，每条都从空表单到达汇总页。
- 检查套餐、周期、附加服务和固定虚构资料是否与指令一致。
- 确认 Agent 没有点击最终确认。
- 测试运行中停止、失败后重试、切换语言后再次执行。
- 输入包含 `someone@example.com` 或 11 位手机号的自由指令，确认被本地拦截且没有发起 Agent 请求。

### 布局与兼容

- Chrome 与 Edge 最新稳定版。
- 桌面 1440×900、1024×768，移动 390×844、375×667。
- AI 面板打开、软键盘弹出和 Page Agent 元素高亮时，关键按钮仍可见可点。
- GitHub Pages 根地址直接打开和刷新都能加载应用。

## 8. 发布与回滚

验收通过后执行 `pnpm run deploy`。发布完成后在 GitHub Pages 实际地址再运行一条预设指令，确认 CDN、跨域请求和资源路径在生产环境可用。

如果 AI 请求失败但普通表单正常，保留部署并在 README 与 UI 中提示测试服务暂不可用；如果页面主体、资源路径或普通表单出现回归，则停止发布，回滚 `gh-pages` 到上一个可用提交。不要因为测试 API 临时限流而回滚正常的页面代码。

## 9. 最终交付记录

交付说明需要包含生产地址、主分支提交、`gh-pages` 提交、自动检查结果、四组视口截图和三条 AI 指令的实际结果。仍未验证的浏览器或因测试 API 限流未完成的场景要明确列出，不能写成全部通过。
