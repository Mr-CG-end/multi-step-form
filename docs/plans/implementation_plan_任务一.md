# 数据持久化功能 — 实现方案

## 背景

用户在填写多步表单时，若误关闭浏览器或刷新页面，已填写数据将全部丢失。需要基于 **Pinia Store + localStorage** 实现自动持久化，让用户重新打开应用后能从上次离开的步骤继续填写。

---

## User Review Required

> [!IMPORTANT]
> **`isYearly` 状态需迁移至 Pinia Store**
>
> 当前 `isYearly`（月度/年度切换）只存在于 `HomeView.vue` 的局部 `ref` 中，**不会被 Pinia 持久化**。为了实现"恢复后与原数据一致"的完整体验，方案将 `isYearly` 移入 `commonsStore`。这会改动 `HomeView.vue` 中所有引用 `isYearly` 的地方（约 10 处，改为 `commonsStore.isYearly`），但逻辑不变。

> [!WARNING]
> **localStorage 存储空间限制**
>
> localStorage 通常有 5-10 MB 容量限制，隐私/无痕模式下可能完全不可用。方案中所有写入操作都将包裹 try-catch，失败时静默降级（不影响正常使用）。

---

## 现有代码分析

| 文件                     | 关键内容                                                           |
| ------------------------ | ------------------------------------------------------------------ |
| `src/stores/commons.ts`  | Pinia Store，state：`nowTab`、`personalInfo`、`plan`、`addons`     |
| `src/views/HomeView.vue` | 多步表单主视图，`isYearly` 是局部 ref，步骤 1-4 + 步骤 5（感谢页） |
| `src/main.ts`            | 创建 Pinia 实例，**未注册任何 plugin**                             |
| `src/types/items.ts`     | `IPersonal`、`IStep2`、`IStep3` 类型定义                           |

---

## Proposed Changes

### 1. Pinia 持久化插件

#### [NEW] piniaPersistedState.ts (`src/plugins/piniaPersistedState.ts`)

创建一个通用的 Pinia Plugin，核心逻辑：

```typescript
import type { PiniaPlugin } from "pinia";
import { debounce } from "lodash";

const STORAGE_KEY = "multi-step-form-state";
const EXPIRY_DAYS = 7;
const DEBOUNCE_MS = 500;

export const piniaPersistedState: PiniaPlugin = ({ store }) => {
  // 仅对 commonsStore 生效
  if (store.$id !== "commonsStore") return;

  // 1. 应用启动时：从 localStorage 恢复数据
  restoreState(store);

  // 2. 使用 $subscribe 监听状态变化，防抖 500ms 后保存
  store.$subscribe(
    debounce((mutation, state) => {
      saveState(state);
    }, DEBOUNCE_MS),
  );
};
```

**关键函数说明：**

| 函数                    | 职责                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `saveState(state)`      | 将 state 序列化为 JSON，附加 `timestamp` 字段，写入 localStorage。try-catch 包裹处理异常             |
| `restoreState(store)`   | 从 localStorage 读取数据，检查 timestamp 是否超过 7 天（超过则删除），通过 `store.$patch()` 恢复状态 |
| `clearPersistedState()` | 导出工具函数，用于订单提交完成后清除 localStorage 中的临时数据                                       |

**持久化数据格式：**

```json
{
  "timestamp": 1741520000000,
  "state": {
    "nowTab": "2",
    "personalInfo": { "name": "张三", "email": "...", "phone": "..." },
    "plan": "2",
    "addons": [],
    "isYearly": false
  }
}
```

---

### 2. 修改 Pinia Store

#### [MODIFY] commons.ts (`src/stores/commons.ts`)

- **添加 `isYearly: false`** 到 state（从 HomeView.vue 迁移过来）
- **添加 `toggleYearly()` action**
- **添加 `clearForm()` action**，重置所有 state 到初始值，并调用 `clearPersistedState()`

```diff
 state: () => ({
     nowTab: '1' as string,
     personalInfo: { name: '', email: '', phone: '' } as IPersonal,
     plan: '1' as string,
-    addons: [] as Array<IStep3>
+    addons: [] as Array<IStep3>,
+    isYearly: false as boolean
 }),
 actions: {
     // ...existing actions...
+    toggleYearly() {
+        this.isYearly = !this.isYearly
+    },
+    clearForm() {
+        this.$reset()
+        clearPersistedState()
+    }
 }
```

---

### 3. 注册插件

#### [MODIFY] main.ts (`src/main.ts`)

```diff
 import { createPinia } from 'pinia'
+import { piniaPersistedState } from '@/plugins/piniaPersistedState'

 const pinia = createPinia()
+pinia.use(piniaPersistedState)
```

---

### 4. 更新视图

#### [MODIFY] HomeView.vue (`src/views/HomeView.vue`)

需要修改的内容：

1. **删除** 局部 `const isYearly: Ref<boolean> = ref(false)` 和 `setOptions` 函数
2. **替换** 所有 `isYearly` 引用为 `commonsStore.isYearly`（模板中约 10 处）
3. **替换** `@change="setOptions"` 为 `@change="commonsStore.toggleYearly()"`
4. **修改** `onSubmit`：当 `nowTab === '4'` 时（确认步骤），在进入步骤 5 后调用 `commonsStore.clearForm()` 中的 `clearPersistedState()` 来清除 localStorage

   ```typescript
   const onSubmit = () : void => {
     if (...) {
       const nextTab = String(Number(commonsStore.nowTab) + 1)
       setTabContent(nextTab)
       // 确认提交后清除持久化数据
       if (nextTab === '5') {
         clearPersistedState()
       }
     }
   }
   ```

5. **修改** 初始化逻辑：将 `setTabContent("1")` 改为 `setTabContent(commonsStore.nowTab)`，这样恢复数据后会自动跳转到上次的步骤

   ```diff
   -setTabContent("1")
   +setTabContent(commonsStore.nowTab)
   ```

---

## 完成标准对照

| 标准                           | 实现方式                                                  |
| ------------------------------ | --------------------------------------------------------- |
| ✅ 修改字段后 500ms 内自动保存 | `$subscribe` + `debounce(500)`                            |
| ✅ 刷新/重开后数据自动恢复     | 插件启动时 `restoreState()` + `store.$patch()`            |
| ✅ 提交后清除临时数据          | 步骤 5 时调用 `clearPersistedState()`                     |
| ✅ 超过 7 天自动清除           | `restoreState()` 中检查 `timestamp`，过期则删除           |
| ✅ 自动跳转到上次步骤          | `setTabContent(commonsStore.nowTab)` 而非硬编码 `"1"`     |
| ✅ 序列化/反序列化正确         | JSON.stringify / JSON.parse，`addons` 数组完整还原        |
| ✅ 异常处理                    | 所有 localStorage 操作 try-catch 包裹，隐私模式下静默降级 |

---

## Verification Plan

### 手动验证步骤（在浏览器中操作）

> 项目已在运行 `pnpm serve`，访问 `http://localhost:8080`（或终端显示的端口）。

**测试 1：自动保存 + 页面刷新恢复**

1. 打开应用，在步骤 1 填写姓名、邮箱、电话
2. 点击"下一步"进入步骤 2，选择一个方案
3. 打开浏览器 DevTools → Application → Local Storage，确认 `multi-step-form-state` 键存在，且数据与填写内容一致
4. **刷新页面**（F5），确认：
   - 应用自动停留在步骤 2（不是回到步骤 1）
   - 步骤 1 的表单数据仍然存在（可以通过返回步骤 1 查看）

**测试 2：关闭浏览器后恢复**

1. 继续上述操作，进入步骤 3 选择附加服务
2. **关闭浏览器标签页**，重新打开应用
3. 确认停留在步骤 3，之前选择的数据仍在

**测试 3：提交后清除数据**

1. 完成所有步骤，在步骤 4 点击"确认"
2. 进入感谢页（步骤 5）后，打开 DevTools → Local Storage
3. 确认 `multi-step-form-state` 键已被删除

**测试 4：7 天过期清除**

1. 在 DevTools → Local Storage 中手动修改 `multi-step-form-state` 的 `timestamp` 为 8 天前的时间戳
2. 刷新页面
3. 确认应用从步骤 1 开始（数据已被清除）
4. 确认 Local Storage 中该键已被删除

**测试 5：防抖验证**

1. 在步骤 1 快速连续输入文字
2. 观察 DevTools → Local Storage，确认数据不是每次按键都更新，而是停止输入约 500ms 后才更新

**测试 6：isYearly 持久化**

1. 在步骤 2 切换为年度计费
2. 刷新页面
3. 确认仍然显示年度计费选项
