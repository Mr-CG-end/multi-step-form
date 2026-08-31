---
trigger: always_on
---

# 表单验证规范

## 三层验证架构（严格遵守）
```
src/utils/validators.ts   →  纯函数层：正则/格式判断，不依赖 Vue
computed (xxxValidation)  →  状态层：返回 { valid, message }，汇总所有规则
checkForm()               →  守门层：读取 computed.valid，设置 isSubmitted
```

## 纯函数层 (src/utils/validators.ts)
- 所有正则校验函数必须抽离到此文件，命名规范：`isValidXxx`（布尔判断）、`formatXxx`（转换）。
- 每个函数必须有 JSDoc 注释。

## 状态层 (computed)
- 每个字段独立一个 `computed`，返回 `{ valid: boolean, message: string }`。
- 区分两类错误，分别处理：
  - **空值报错**：只在 `isSubmitted.value === true` 时触发。
  - **格式报错**：基于防抖替身数据 `debouncedInfo`，而非 `v-model` 原始数据。

## 守门层 (checkForm)
- **禁止**在 `checkForm` 中重复写已在 `computed` 存在的正则/判空逻辑（DRY 原则）。
- 必须做两件事：① 置 `isSubmitted.value = true`；② 强制同步防抖替身（打破 300ms 延迟）。
- 只通过读取 `xxxValidation.value.valid` 来决定是否放行：
  ```typescript
  const checkForm = () => {
    isSubmitted.value = true;
    debouncedInfo.email = personalInfo.value.email;
    debouncedInfo.phone = personalInfo.value.phone;
    return nameValidation.value.valid
      && emailValidation.value.valid
      && phoneValidation.value.valid;
  };
  ```

## 防抖替身模式
- 需要格式验证的字段，必须在 `debouncedInfo`（`reactive`）中创建对应替身属性。
- 用独立 `watch` + `_.debounce(300ms)` 分别监听各字段更新替身，不可共用一个深度 watch。
