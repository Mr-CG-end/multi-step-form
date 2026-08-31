---
trigger: always_on
---

# 项目 AI 规范 (multi-step-form)

## 项目基础信息
- **框架**: Vue 3 + TypeScript + Pinia
- **包管理**: pnpm
- **语言**: 代码注释使用中文，代码本身使用英文

---

## 核心原则速查
1. **DRY**：`computed` 是唯一的验证数据源，`checkForm` 只读 `.valid`，不重复写规则。
2. **单一数据源**：派生状态只用 `computed`，不用 `watch` 手动赋值同步。
3. **防抖替身**：格式验证基于 `debouncedInfo`（替身），不基于 `v-model` 原始数据。
4. **`isSubmitted` 控制空值报错**：提交前不骚扰用户，点击提交后才对空值飘红。
5. **纯函数外置**：正则 / 格式化函数必须放 `src/utils/`，`.vue` 里只引用。

---

## 详细规范分类
详细规范请参阅以下各文件（均已设置 `trigger: always_on` 自动加载）：

| 文件 | 覆盖范围 |
|------|----------|
| `01-vue3-composition-api.md` | ref/reactive/computed/watch/template 整洁度 |
| `02-form-validation.md` | 三层验证架构、防抖替身模式、checkForm 守门规范 |
| `03-typescript.md` | 禁 any、类型分文件管理、导入顺序 |
| `04-code-style.md` | 命名、注释风格、Git Conventional Commits |
