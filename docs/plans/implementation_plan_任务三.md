# 任务三：进度指示器优化执行方案

## 目标
完善多步表单的步骤导航和确认摘要页，使其满足以下验收要求：

- 左侧进度指示器能区分当前步骤、已完成步骤、未完成步骤
- 用户可以点击已完成步骤返回编辑
- 用户点击未完成步骤时，显示“请按顺序完成步骤”
- 确认摘要页的每个信息块旁边都有“编辑”按钮
- 返回编辑后，之前填写的数据继续保留
- 步骤完成状态由 Pinia Store 管理

---

## 当前实现状态
结合当前代码，任务三已经完成了一部分，但还缺两个关键点：

### 已完成
- `Pinia` 中已有 `completedSteps`
- 提交当前步骤后会写入 `completedSteps`
- 点击未完成步骤时会显示提示文案
- 套餐摘要块已有一个跳回第 2 步的“编辑”按钮
- 返回编辑后，表单数据会保留

### 未完成
- 左侧未完成步骤还没有明确的灰色禁用态
- 确认摘要页没有做到“每个信息块旁边都有编辑按钮”
- 基本信息块和附加项块缺少独立编辑入口

这份文档的目标就是补齐上面 3 个缺口。

---

## 1. Store 层保持现状，仅确认导出完整
**目标文件**: `src/stores/commons.ts`

当前 Store 基本已经满足任务三，不需要大改，只确认以下内容保留：

```ts
const completedSteps = ref<string[]>([]);

function addCompletedStep(stepId: string) {
  if (!completedSteps.value.includes(stepId)) {
    completedSteps.value.push(stepId);
  }
}

function clearForm() {
  nowTab.value = "1";
  personalInfo.value = { name: "", email: "", phone: "" };
  plan.value = "1";
  addons.value = [];
  isYearly.value = false;
  completedSteps.value = [];
  clearPersistedState();
}
```

`return` 中需要继续暴露：

```ts
return {
  nowTab,
  personalInfo,
  plan,
  addons,
  isYearly,
  completedSteps,
  setTabActive,
  setPlanItem,
  setAddonItems,
  toggleYearly,
  clearForm,
  addCompletedStep,
};
```

---

## 2. 左侧步骤导航改为显式状态类
**目标文件**: `src/views/HomeView.vue`

当前导航点击逻辑已经存在，但样式状态主要挂在 `.num` 上，不利于做“禁用态”。

建议改成：直接给每个 `li.step` 绑定状态类。

### 需要达成的视觉规则
- 当前步骤：高亮显示
- 已完成步骤：可点击，显示完成态
- 未完成步骤：灰色显示，不可点击感明显

### 模板建议改法
将左侧导航列表改成这种结构：

```vue
<li
  v-for="tab in tabs"
  :key="tab.id"
  :class="[
    'step',
    {
      current: tab.id === nowTab,
      completed: completedSteps.includes(tab.id) && tab.id !== nowTab,
      disabled: !completedSteps.includes(tab.id) && tab.id !== nowTab,
    },
  ]"
  @click="goToStep(tab.id)"
>
  <div class="num">
    {{ tab.id }}
  </div>
  <div class="item">
    <div class="step-nm">{{ tab.step }}</div>
    <div class="name">{{ tab.name }}</div>
  </div>
</li>
```

这样比依赖 `:has()` 更稳，也更符合任务提示里提到的 `.completed`、`.disabled` 类。

### 样式建议
在 `<style scoped>` 中补充：

```css
.step {
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.step .num {
  border: 1px solid #bde2fd;
  border-radius: 50%;
  color: #fff;
}

.step.current .num {
  background-color: #bde2fd;
  color: #12335e;
}

.step.completed .num {
  background-color: rgba(255, 255, 255, 0.3);
  color: #fff;
  border-color: #fff;
}

.step.disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.step.disabled .num {
  background-color: transparent;
  border-color: rgba(255, 255, 255, 0.5);
  color: rgba(255, 255, 255, 0.7);
}

.step.disabled .item {
  opacity: 0.8;
}
```

这样就能满足“未完成步骤灰色显示”和“已完成步骤可点击”的验收标准。

---

## 3. 保留现有点击拦截逻辑
**目标文件**: `src/views/HomeView.vue`

当前 `goToStep` 的方向是对的，保留即可：

```ts
const goToStep = (targetId: string) => {
  if (targetId === nowTab.value) return;

  if (completedSteps.value.includes(targetId)) {
    setTabContent(targetId);
  } else {
    showTip();
  }
};
```

当前提示 UI 也可以继续使用：

```vue
<div v-if="showStepTip" class="step-tip">
  请按顺序完成步骤
</div>
```

这部分已经满足：

- 已完成步骤可以跳转
- 未完成步骤点击后有提示

---

## 4. 确认摘要页拆成 3 个可编辑信息块
**目标文件**: `src/views/HomeView.vue`

这是当前最需要补的部分。

验收要求是“每个信息块旁边有编辑按钮”，所以确认页至少应该拆成 3 块：

1. 基本信息块，对应跳回第 1 步
2. 套餐信息块，对应跳回第 2 步
3. 附加项信息块，对应跳回第 3 步

### 建议结构
在 `nowTab === '4'` 的区域内，按下面思路调整：

```vue
<div v-else-if="nowTab === '4'" class="finishing">
  <div class="costs">
    <div class="summary-block personal-summary">
      <div class="summary-header">
        <div class="impt-txt">个人信息</div>
        <button type="button" class="change-plan" @click="setTabContent('1')">
          编辑
        </button>
      </div>
      <div class="summary-content">
        <div>{{ personalInfo.name }}</div>
        <div>{{ personalInfo.email }}</div>
        <div>{{ personalInfo.phone }}</div>
      </div>
    </div>

    <div class="summary-block plan-summary">
      <div class="summary-header">
        <div class="impt-txt">
          {{ nowPlan.name }}{{ isYearly ? "（年度）" : "（月度）" }}
        </div>
        <button type="button" class="change-plan" @click="setTabContent('2')">
          编辑
        </button>
      </div>
      <div class="summary-content">
        <div class="plan-cost impt-txt">
          {{ isYearly ? nowPlan.yearly : nowPlan.monthly }}
        </div>
      </div>
    </div>

    <div class="summary-block addons-summary">
      <div class="summary-header">
        <div class="impt-txt">附加服务</div>
        <button type="button" class="change-plan" @click="setTabContent('3')">
          编辑
        </button>
      </div>
      <div class="summary-content" v-if="addons.length">
        <div v-for="addon in addons" :key="addon.id" class="addons">
          <span>{{ addon.title }}</span>
          <div class="addon-cost mg-lft">
            <span v-if="!isYearly">{{ addon.monthly }}</span>
            <span v-else>{{ addon.yearly }}</span>
          </div>
        </div>
      </div>
      <div class="summary-content" v-else>
        <div class="card-des">未选择附加服务</div>
      </div>
    </div>
  </div>

  <div class="total">
    <span v-if="!isYearly">总计（每月）</span>
    <span v-else>总计（每年）</span>
    <span class="total-cost mg-lft">{{ totalCost }}</span>
  </div>
</div>
```

### 为什么要这样改
- 当前只有套餐块能编辑，不满足“每个信息块旁边有编辑按钮”
- 把信息分块后，用户编辑路径更直观
- `personalInfo`、`plan`、`addons` 都来自 Pinia，跳回去不会丢数据

---

## 5. 为确认摘要块补样式
**目标文件**: `src/views/HomeView.vue`

为避免新增块后布局散掉，建议给摘要页增加一组通用样式：

```css
.summary-block {
  padding: 16px 0;
  border-bottom: 1px solid #d3d3d3;
}

.summary-block:last-child {
  border-bottom: none;
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.summary-content {
  display: grid;
  gap: 8px;
  color: #9797a1;
}

.change-plan {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #9797a1;
  text-decoration: underline;
  text-underline-position: under;
  font: inherit;
}
```

注意：

- 原来 `.change-plan` 如果是 `div`，建议改成 `button type="button"`
- 这样语义更正确，也更方便键盘操作

---

## 6. `computed` 部分保持现状即可
**目标文件**: `src/views/HomeView.vue`

你现在把 `nowPlan` 和 `totalCost` 改成 `computed` 的方向是对的，可以保留。

建议最终保持这种结构：

```ts
const nowPlan = computed(() => {
  return (
    items.STEP2.find((item: IStep2) => item.id === plan.value) || items.STEP2[0]
  );
});

const parseCost = (str: string) => Number(str.replace(/[^0-9]/g, ""));

const totalCost = computed(() => {
  const planCost = isYearly.value
    ? parseCost(nowPlan.value.yearly)
    : parseCost(nowPlan.value.monthly);

  const addonsCost = addons.value.reduce(
    (sum, addon) =>
      sum +
      (isYearly.value ? parseCost(addon.yearly) : parseCost(addon.monthly)),
    0,
  );

  const total = planCost + addonsCost;
  return isYearly.value ? `$${total}/yr` : `$${total}/mo`;
});
```

这里不需要再嵌套额外的 `computed`。

---

## 7. 验收检查清单
改完后，按下面顺序手动验证：

1. 打开第 1 步，左侧第 2、3、4 步应显示为灰色禁用态
2. 不填写任何内容直接点击左侧第 2、3、4 步，应提示“请按顺序完成步骤”
3. 完成第 1 步并进入第 2 步后，左侧第 1 步应变为可点击完成态
4. 继续完成到第 4 步后，左侧第 1、2、3 步都应可点击返回
5. 第 4 步确认页应看到 3 个独立信息块
6. 3 个信息块旁边都应有“编辑”按钮
7. 点击“个人信息”的编辑，跳回第 1 步且输入内容仍保留
8. 点击“套餐信息”的编辑，跳回第 2 步且所选套餐仍保留
9. 点击“附加服务”的编辑，跳回第 3 步且勾选项仍保留
10. 从返回页继续点“下一步”回到确认页，之前数据仍正确显示

---

## 最终结论
当前任务三不是重做，而是补尾差。

真正要改的重点只有两个：

- 左侧导航补“disabled 灰色禁用态”
- 确认摘要页补成 3 个可单独编辑的信息块

只要把这两部分补齐，这个任务基本就能过验收。
