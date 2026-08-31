---
trigger: always_on
---

# Vue 3 Composition API 规范

## Ref vs Reactive
- **`ref`**：基础类型（`boolean`, `string`, `number`）及需要整体替换的对象。
- **`reactive`**：具有内聚关系的复合对象，如表单实体 `personalInfo`、防抖替身 `debouncedInfo`。
- 禁止对 `reactive` 对象做整体替换赋值（`obj = newObj`），这会丢失响应式，应逐属性赋值或使用 `Object.assign`。

## Computed 规范
- `computed` 必须是**无副作用的纯函数**：内部禁止修改任何 `ref` / `reactive`，只负责计算并 `return`。
- 复杂验证必须返回语义明确的对象：
  ```typescript
  // ✅ 正确
  const emailValidation = computed(() => ({
    valid: isValidEmail(debouncedInfo.email),
    message: '请输入有效的邮箱地址',
  }));
  // ❌ 禁止在 computed 内修改外部状态（副作用）
  ```

## Watch 规范
- `watch` 只用于处理**副作用**（同步防抖替身、调用接口），不用于计算派生状态。
- 防抖场景：必须用 `watch` + `_.debounce`，禁止在 watch 回调中直接写验证逻辑。
- 监听 `reactive` 深层变化时加 `{ deep: true }`，或改为监听具体属性 `() => obj.prop`。

## Template 整洁
- `v-if` 中禁止出现超过 **1 个**逻辑运算符（`&&` / `||`）的复杂表达式，必须下沉到 `computed`。
- 禁止在 `<template>` 中直接调用有副作用的方法，必须封装为具名函数。
