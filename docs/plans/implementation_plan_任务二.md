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
通过 `watch` 结合 `lodash` 防抖实现 300ms 延后取值，并通过 `computed` 集成计算出每个字段的验证状态。

在 `src/views/HomeView.vue` 中的 `<script setup lang="ts">`：

1. 添加依赖引入：
```typescript
import { isValidEmail, isValidPhone } from '@/utils/validators';
// 如果未导入 vue 的 computed，请一并加入: import { computed } from "vue";
```

2. 找到靠近底部的 `// validation check` 部分，**替换**原有的 `checkForm` 和 `validation` 及 `watch` 内容：

```typescript
// --- 替换原有的 validation check 逻辑 ---

// 表示是否尝试提交过（用于处理空态立刻飘红的情况）
const isSubmitted = ref(false);

// 用于防抖校验的响应式中间对象
const debouncedInfo = reactive({
  email: personalInfo.value.email,
  phone: personalInfo.value.phone,
});

// 使用 loadash 实现 300ms 延时防抖监听
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

// 姓名验证计算
const nameValidation = computed(() => {
  if (isSubmitted.value && _.isEmpty(personalInfo.value.name)) {
    return { valid: false, message: '此字段为必填项' };
  }
  return { valid: true, message: '' };
});

// 邮箱验证计算
const emailValidation = computed(() => {
  // 当点击提交时使用实时值判定，平时依赖防抖值以减少频繁报错
  const targetEmail = isSubmitted.value ? personalInfo.value.email : debouncedInfo.email;
  // 必填验证
  if (isSubmitted.value && _.isEmpty(personalInfo.value.email)) {
    return { valid: false, message: '此字段为必填项' };
  }
  if (_.isEmpty(targetEmail)) {
    return { valid: false, message: '' }; // 不提示错，直到按提交
  }
  // 格式验证
  if (!isValidEmail(targetEmail)) {
    return { valid: false, message: '请输入有效的邮箱地址' };
  }
  return { valid: true, message: '' };
});

// 手机号验证计算
const phoneValidation = computed(() => {
  const targetPhone = isSubmitted.value ? personalInfo.value.phone : debouncedInfo.phone;
  // 必填验证
  if (isSubmitted.value && _.isEmpty(personalInfo.value.phone)) {
    return { valid: false, message: '此字段为必填项' };
  }
  if (_.isEmpty(targetPhone)) {
    return { valid: false, message: '' }; 
  }
  // 格式验证
  if (!isValidPhone(targetPhone)) {
    return { valid: false, message: '请输入有效的11位手机号' };
  }
  return { valid: true, message: '' };
});

// 提交按钮触发的拦截验证校验函数
const checkForm = () => {
  isSubmitted.value = true;
  // 更新防抖数据防止因为点击过快造成的计算属性没有更新
  debouncedInfo.email = personalInfo.value.email;
  debouncedInfo.phone = personalInfo.value.phone;

  // 全量校验最新数据
  if (_.isEmpty(personalInfo.value.name)) return false;
  if (_.isEmpty(personalInfo.value.email) || !isValidEmail(personalInfo.value.email)) return false;
  if (_.isEmpty(personalInfo.value.phone) || !isValidPhone(personalInfo.value.phone)) return false;
  
  return true;
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
