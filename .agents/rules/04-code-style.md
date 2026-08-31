---
trigger: always_on
---

# 代码风格 & Git 规范

## 命名规范
- 变量/函数：`camelCase`
- 类型/Interface：`PascalCase`，Interface 以 `I` 开头
- 工具函数：动词开头，如 `isValidEmail`, `formatPhone`
- Computed 属性：以被计算对象命名，如 `emailValidation`，不加 `computed` 前缀

## 注释规范
- 代码注释统一使用**中文**。
- 注释解释"为什么这样做"而非"做了什么"：
  ```typescript
  // ✅ 好：解释意图
  // 强制同步替身，防止用户手速 < 300ms 时防抖未触发导致读取旧值
  debouncedInfo.email = personalInfo.value.email;
  ```
- `src/utils/` 中的公共函数必须有 JSDoc 注释。

## 文件组织
- `<script setup>` 超过 **150 行**时，考虑拆分逻辑到 `src/composables/useXxx.ts`。
- `<style>` 块必须加 `scoped`。

## Git 提交规范 (Conventional Commits)
格式：`<type>(<scope>): <subject>`

| type | 用途 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `refactor` | 重构（不影响功能） |
| `chore` | 构建/依赖/配置 |
| `docs` | 文档变更 |
| `style` | 仅格式调整 |
