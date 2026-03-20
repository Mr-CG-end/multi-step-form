---
trigger: always_on
---

# TypeScript 规范

## 类型定义
- **禁止使用 `any`**，临时不确定时用 `unknown` 并做类型收窄。
- 业务数据结构 Interface / Type 放在 `src/types/` 下按模块分文件：
  - `src/types/items.ts` → 商品、套餐
  - `src/types/content.ts` → 页面文案
  - `src/types/form.ts` → 表单数据（新增字段时维护此文件）
- Interface 命名以 `I` 开头，如 `IPersonalInfo`。

## Pinia Store 类型
- `state` 字段必须显式声明类型，不可依赖推断：
  ```typescript
  // ✅ 正确
  const personalInfo = ref<IPersonalInfo>({ name: '', email: '', phone: '' });
  ```

## 导入顺序
1. Vue 核心库（`vue`, `pinia`）
2. 第三方库（`lodash` 等）
3. 内部 Stores（`@/stores/xxx`）
4. 内部类型（`@/types/xxx`）
5. 内部工具函数（`@/utils/xxx`）
6. 静态资源（`@/assets/xxx`）
