# 【基础任务 2】增强表单验证实施计划

## 1. 任务分析与核心目标
- **正则验证**：编写用于校验“邮箱”和“11位手机号”格式的方法，保证数据有效性。
- **计算属性**：充分利用 Vue `computed` 实时返回当前的验证结果，不仅包括是否合法（`valid`），还要附带具体的错误文案（`message`）。
- **防抖验证（Debounce）**：用户在输入过程中不进行打断式报错，而是等用户停止输入 300ms 后再检查并动态呈现提示。
- **状态反馈**：验证失败时输入框底部出现红色提示，且输入框边框变红（继承现有 `.error` 样式）；验证成功时，输入框右侧显示绿色对勾 ✅。
- **提交流程控制**：点击“下一步”时进行最终兜底拦截并在需要时立刻爆红阻止跳转。

---

## 2. 实施步骤与具体代码

### 步骤一：创建验证工具函数文件
为了具有可扩展性，我们将正则表达式的方法抽取到独立工具文件：

请在 `src` 目录下新建 `utils` 文件夹（如果不存在），并创建 `validators.ts` 文件。
**`src/utils/validators.ts`**
```typescript
/**
 * 验证邮箱格式
 * @param email 邮箱地址
 * @returns 是否符合标准邮箱格式
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 验证中国大陆11位手机号
 * @param phone 手机号
 * @returns 是否符合手机号格式
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};
```

---

### 步骤二：改造 `HomeView.vue` 的 `<script setup>` 逻辑

**设计思路：**
- `isSubmitted`：控制「空值」何时飘红，提交前不骚扰用户。
- `debouncedInfo`（防抖替身）：格式验证永远基于此对象，而非 `v-model` 原始数据，避免用户还没打完就报错。`watch` + `_.debounce(300ms)` 负责延迟同步替身。
- `computed` 三合一：每个字段独立负责自己的 `{ valid, message }`，是整个验证的**唯一数据源**。
- `checkForm`（守门员）：只做两件事——激活 `isSubmitted`、强制同步替身（打破防抖延迟）——然后直接读 `computed.valid` 放行，不再重复写任何正则或判空逻辑（DRY）。

在 `src/views/HomeView.vue` 中的 `<script setup lang="ts">`：

**① 添加依赖引入**
```typescript
import { computed } from "vue";
import { isValidEmail, isValidPhone } from '@/utils/validators';
```

**② 找到 `// validation check` 部分，替换原有全部逻辑**

```typescript
// 是否尝试提交过（提交前空值不报错，点击下一步后空值立刻飘红）
const isSubmitted = ref(false);

// 防抖替身：格式验证只基于此对象，而非 v-model 原始数据
const debouncedInfo = reactive({
  email: personalInfo.value.email,
  phone: personalInfo.value.phone,
});

// 用独立 watch + debounce(300ms) 分别监听，不共用深度 watch
watch(
  () => personalInfo.value.email,
  _.debounce((newVal: string) => {
    debouncedInfo.email = newVal;
  }, 300)
);

watch(
  () => personalInfo.value.phone,
  _.debounce((newVal: string) => {
    debouncedInfo.phone = newVal;
  }, 300)
);

// 姓名验证：仅需判空（无格式要求）
const nameValidation = computed(() => {
  if (isSubmitted.value && _.isEmpty(personalInfo.value.name)) {
    return { valid: false, message: '此字段为必填项' };
  }
  return { valid: true, message: '' };
});

// 邮箱验证：始终基于防抖替身（checkForm 会在提交时强制同步替身，所以不需要三元判断）
const emailValidation = computed(() => {
  // 空值：仅在提交后报错
  if (isSubmitted.value && _.isEmpty(personalInfo.value.email)) {
    return { valid: false, message: '此字段为必填项' };
  }
  // 替身为空时静默（等提交后被步骤①拦截）
  if (_.isEmpty(debouncedInfo.email)) {
    return { valid: false, message: '' };
  }
  // 格式验证
  if (!isValidEmail(debouncedInfo.email)) {
    return { valid: false, message: '请输入有效的邮箱地址' };
  }
  return { valid: true, message: '' };
});

// 手机号验证：逻辑与邮箱相同
const phoneValidation = computed(() => {
  if (isSubmitted.value && _.isEmpty(personalInfo.value.phone)) {
    return { valid: false, message: '此字段为必填项' };
  }
  if (_.isEmpty(debouncedInfo.phone)) {
    return { valid: false, message: '' };
  }
  if (!isValidPhone(debouncedInfo.phone)) {
    return { valid: false, message: '请输入有效的11位手机号' };
  }
  return { valid: true, message: '' };
});

// 守门员函数：不重复任何验证规则，只读 computed.valid（DRY 原则）
const checkForm = () => {
  isSubmitted.value = true;
  // 强制同步替身，防止用户手速 < 300ms 时防抖未触发导致 computed 读取旧值
  debouncedInfo.email = personalInfo.value.email;
  debouncedInfo.phone = personalInfo.value.phone;
  // 直接复用 computed 的结果，有任一不合法则拦截跳转
  return nameValidation.value.valid
    && emailValidation.value.valid
    && phoneValidation.value.valid;
};
```

---

### 步骤三：修改 `HomeView.vue` 头部的模板渲染（Template）
将原本硬编码的提示换成通过 `computed` 进行智能反馈的内容，并在右侧加入✅号设计：

```vue
<!-- STEP 1 区域的姓名、邮箱、电话代码替换为如下，保留原有外层及标签： -->

<div class="form form-name">
  <div class="labels">
    <label for="name" class="label-name">姓名</label>
    <label for="name" v-if="!nameValidation.valid" class="alert">{{ nameValidation.message }}</label>
  </div>
  <input
    v-model="personalInfo.name"
    type="text"
    id="name"
    placeholder="例如：张三"
    :class="[{ error: !nameValidation.valid }]"
  />
</div>

<div class="form form-email">
  <div class="labels">
    <label for="email" class="label-name">电子邮件地址</label>
    <label for="email" v-if="!emailValidation.valid && emailValidation.message" class="alert">{{ emailValidation.message }}</label>
  </div>
  <div class="input-wrapper">
    <input
      v-model="personalInfo.email"
      type="text"
      id="email"
      placeholder="例如：zhangsan@example.com"
      :class="[{ error: !emailValidation.valid && emailValidation.message }]"
    />
    <span v-if="emailValidation.valid" class="success-icon">✅</span>
  </div>
</div>

<div class="form form-phone">
  <div class="labels">
    <label for="phone" class="label-name">电话号码</label>
    <label for="phone" v-if="!phoneValidation.valid && phoneValidation.message" class="alert">{{ phoneValidation.message }}</label>
  </div>
  <div class="input-wrapper">
    <input
      v-model="personalInfo.phone"
      type="text"
      id="phone"
      placeholder="例如：13812345678"
      :class="[{ error: !phoneValidation.valid && phoneValidation.message }]"
    />
    <span v-if="phoneValidation.valid" class="success-icon">✅</span>
  </div>
</div>
```

*(注意此处移除了原生表单的 `required`，因为它会干扰我们的自定义必填提醒拦截)*

---

### 步骤四：添加对应的 CSS 样式支持 ✅ 图标显示
您可以将这几行 CSS 添加到 `HomeView.vue` 的 `<style>` 或者项目全局的样式表（如 `assets/main.css` / `App.vue` 等）中：

```css
/* 自定义输入框包裹器与对勾图标 */
.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper input {
  width: 100%;
  padding-right: 40px; /* 为绿色的对勾腾出显示空间，避免文字覆盖 */
}

.success-icon {
  position: absolute;
  right: 15px;
  color: #28a745; /* 绿色或根据主题自定 */
  font-size: 16px;
  pointer-events: none; /* 防止遮挡输入点击 */
}
```

## 3. 结果验证对照表
✅ **邮箱和手机的验证工具类**已创建并在计算时验证。
✅ **具体的错误提示语**会根据为空或格式不对进行针对性文字的动态渲染。
✅ **绿色对checkmark图标**会在正则及判空双项验证 `validation.valid` 时浮现。
✅ **防抖：**使用了 `_.debounce` 作为钩子控制中间变量，成功在停笔后进行判定触发界面更新。
✅ **下一步控制：**更新后的 `checkForm` 对空或错都能识别拦截跳转，并利用 `isSubmitted` 控制在拦截后激活全红框校验。
