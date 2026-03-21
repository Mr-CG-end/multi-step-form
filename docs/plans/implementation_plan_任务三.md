# 任务 3：进度指示器优化执行文档

## 目标
优化步骤导航，允许用户点击已完成的步骤返回编辑，保留已填写的数据，并在确认摘要页面添加快速编辑按钮。

---

## 1. 状态管理更新 (Pinia)
**目标文件**: `src/stores/commons.ts`

需要增加一个状态数组来记录已完成的步骤，以此判断哪些步骤是可点击跳转的。

1. **新增状态变量**:
   在 `defineStore` 中定义：
   ```typescript
   // 记录已完成的步骤 ID
   const completedSteps = ref<string[]>([]);
   ```
2. **新增 Action**:
   增加一个将步骤标记为完成的方法：
   ```typescript
   function addCompletedStep(stepId: string) {
     if (!completedSteps.value.includes(stepId)) {
       completedSteps.value.push(stepId);
     }
   }
   ```
3. **更新重置函数**:
   在 `clearForm` 函数中清空完成状态：
   ```typescript
   function clearForm() {
     // ... 现有的重置代码
     completedSteps.value = [];
     clearPersistedState();
   }
   ```
4. **导出**:
   在 `return` 块中暴露此状态和方法：
   ```typescript
   return {
     // ...
     completedSteps,
     addCompletedStep,
   };
   ```

---

## 2. 步骤导航控制逻辑
**目标文件**: `src/views/HomeView.vue`

1. **引入新的状态和方法**:
   从 `commonsStore` 中解构出它们：
   ```typescript
   const { isYearly, nowTab, plan, addons, personalInfo, completedSteps } = storeToRefs(commonsStore);
   const { setAddonItems, setPlanItem, toggleYearly, setTabActive, addCompletedStep } = commonsStore;
   ```

2. **新增点击跳转中心方法 `goToStep`**:
   浏览器原生 `alert()` 阻塞 JS 线程且体验差，改为使用响应式变量 + `v-if` 来显示页面内提示：

   **第一步：** 新增提示状态变量
   ```typescript
   // 控制步骤顺序提示是否显示
   const showStepTip = ref(false);
   let stepTipTimer: ReturnType<typeof setTimeout> | null = null;

   const showTip = () => {
     showStepTip.value = true;
     // 2秒后自动消失
     if (stepTipTimer) clearTimeout(stepTipTimer);
     stepTipTimer = setTimeout(() => {
       showStepTip.value = false;
     }, 2000);
   };
   ```

   **第二步：** 编写跳转控制函数
   ```typescript
   const goToStep = (targetTabId: string) => {
     // 如果点击的是当前步骤，忽略
     if (targetTabId === nowTab.value) return;

     // 只有在已完成列表中的步骤才允许自由点击返回 / 前进
     if (completedSteps.value.includes(targetTabId)) {
       setTabContent(targetTabId);
     } else {
       // 未完成的步骤予以页面内提示，不使用 alert()
       showTip();
     }
   };
   ```

   **第三步：** 在模板中添加提示 UI（放在 `.navbar` 或 `.content` 区域内均可）：
   ```vue
   <div v-if="showStepTip" class="step-tip">
     请按顺序完成步骤
   </div>
   ```

   **第四步：** 为提示添加样式（`<style scoped>`）：
   ```css
   .step-tip {
     position: fixed;
     bottom: 24px;
     left: 50%;
     transform: translateX(-50%);
     background: rgba(0, 0, 0, 0.7);
     color: #fff;
     padding: 8px 18px;
     border-radius: 6px;
     font-size: 14px;
     pointer-events: none;
     z-index: 100;
   }
   ```

3. **改造现有的提交函数 (`onSubmit`)**:
   当用户点击下方“下一步”并成功通过当前页面的验证时，应该将当前页加入完成列表：
   ```typescript
   const onSubmit = (): void => {
     if (
       (nowTab.value === "1" && checkForm()) ||
       nowTab.value === "2" ||
       nowTab.value === "3" ||
       nowTab.value === "4"
     ) {
       // 【新增】将当前步设为已完成
       addCompletedStep(nowTab.value);
       
       const nextTab = String(Number(nowTab.value) + 1);
       setTabContent(nextTab);
       if (nextTab === "5") {
         clearPersistedState();
         // ⚠️【边界处理】跳到感谢页后清空已完成步骤，
         // 防止用户通过侧边栏 nav 返回已提交的表单进行再次操作
         completedSteps.value = [];
       }
     }
   };
   ```

---

## 3. 左侧进度条模板与样式更新
**目标文件**: `src/views/HomeView.vue`

1. **修改导航列表模板**：
   为步骤项附加 `@click` 事件，并动态绑定对应样式的 class：
   ```vue
   <li v-for="tab in tabs" :key="tab.id" class="step" @click="goToStep(tab.id)">
     <div :class="['num', 
       { clicked: tab.id === nowTab }, 
       { completed: completedSteps.includes(tab.id) && tab.id !== nowTab }
     ]">
       {{ tab.id }}
     </div>
     <div class="item">
       <div class="step-nm">{{ tab.step }}</div>
       <div class="name">{{ tab.name }}</div>
     </div>
   </li>
   ```

2. **增加相应 CSS 辅助类 (`<style scoped>`)**:
   限制未完成项的鼠标行为，优化已完成项的视觉样式：
   ```css
   /* 新增 */
   .step {
     cursor: not-allowed; /* 默认不可点击 */
   }
   /* 将当前步和已完成步设置为手型指针 */
   .step:has(.completed), .step:has(.clicked) {
     cursor: pointer; 
   }
   /* 可选：为已完成步骤加一个视觉提示 */
   .num.completed {
     background-color: rgba(255, 255, 255, 0.3); /* 举例，可根据 UI 规范修改 */
     color: #fff;
     border: 1px solid #fff;
   }
   ```

---

## 4. 确认摘要页面的“编辑”按钮
**目标文件**: `src/views/HomeView.vue`

在第 4 步 (`nowTab === '4'`) 的摘要内容里：

1. **统一重构“更改”按钮为“编辑”**：
   找到现有的计划更改按钮：
   ```vue
   <div @click="() => (nowTab = '2')" class="change-plan">更改</div>
   ```
   建议统一为调用 `setTabContent`：
   ```vue
   <div @click="setTabContent('2')" class="change-plan">编辑</div>
   ```

2. **为附加项（Addons）或基本信息添加快捷跳转（如需补充）**：
   如果您的设计旨在让每个信息块都支持单独编辑，可以如下示例添加：
   - 增加**基本信息区编辑按钮**（跳转回 Step 1）：
     ```vue
     <!-- 示例位置：放于套餐摘要上方或下方 -->
     <div class="personal-summary">
       <div>{{ personalInfo.name }}</div>
       <div @click="setTabContent('1')" class="change-plan">编辑</div>
     </div>
     ```
   - 增加**附加组件编辑按钮**（跳转回 Step 3）：
     在 `.addon-wrap` 内补充跳转：
     ```vue
     <!-- 示例 -->
     <div @click="setTabContent('3')" class="change-plan">编辑</div>
     ```

## 5. 摘要页数据同步重构 (`computed`)
**目标文件**: `src/views/HomeView.vue`

目前的 `nowPlan` 和 `totalCost` 使用的是 `ref` 结合 `watch(() => nowTab, ...)` 的写法，这种非响应式追踪模式不仅冗长，而且存在潜在的 Bug，违反了 Vue 3 派生状态应使用 `computed` 的规范。

1. **移除旧代码（第 339 行附近）**:
   删除以下 `ref` 和 `watch` 块相关的逻辑：
   - `let totalCost: Ref<string> = ref("");`
   - `let nowPlan: Ref<IStep2> = ref(_.cloneDeep(items.STEP2[0]));`
   - `const setSelectedOptions = () => { ... }`
   - `const sumCost = () => { ... }`
   - `watch(() => nowTab, () => { ... });`

2. **新增 `computed` 替代实现**:
   导入并改为使用 `computed` 进行状态派生：
   ```typescript
   // 获取当前选择的套餐详情
   const nowPlan = computed(() => {
     return items.STEP2.find((item: IStep2) => item.id === plan.value) || items.STEP2[0];
   });

   // 实时计算总金额
   const totalCost = computed(() => {
     // 提取纯数字的辅助方法
     const parseCost = (str: string) => Number(str.replace(/[^0-9]/g, ""));
     
     // 基础套餐费
     const planCost = isYearly.value 
       ? parseCost(nowPlan.value.yearly) 
       : parseCost(nowPlan.value.monthly);
     
     // 附加组件费汇总
     const addonsCost = addons.value.reduce((sum, addon) => {
       return sum + (isYearly.value ? parseCost(addon.yearly) : parseCost(addon.monthly));
     }, 0);

     const total = planCost + addonsCost;
     return isYearly.value ? `+$${total}/yr` : `+$${total}/mo`;
   });
   ```

---

## 总结：数据保留能力
无需编写额外的数据保存逻辑。因为项目里 `personalInfo`, `plan`, `addons` 等均为保存在 `Pinia` Store 中的响应式状态。用户在各个页面之间的前后“穿越”，通过修改 `nowTab` 即可实现界面切换。在不调用 `clearForm` 接口的前提下，所有绑定的 `v-model` 会自带保留现场功能。
