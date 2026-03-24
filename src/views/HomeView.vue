<template>
  <div class="home">
    <div id="container">
      <div class="box">
        <div class="navbar">
          <ul>
            <li
              v-for="tab in tabs"
              :key="tab.id"
              class="step"
              @click="goToStep(tab.id)"
            >
              <div
                :class="[
                  'num',
                  { clicked: tab.id === nowTab },
                  {
                    completed:
                      completedSteps.includes(tab.id) && tab.id !== nowTab,
                  },
                ]"
              >
                {{ tab.id }}
              </div>
              <div class="item">
                <div class="step-nm">{{ tab.step }}</div>
                <div class="name">{{ tab.name }}</div>
              </div>
            </li>
          </ul>
        </div>

        <div class="content">
          <div v-if="showStepTip" class="step-tip">请按顺序完成步骤</div>
          <div class="title top-area" v-if="nowContent.title">
            {{ nowContent.title }}
          </div>
          <div class="semi-title" v-if="nowContent.semititle">
            {{ nowContent.semititle }}
          </div>
          <div class="forms">
            <!--          STEP 1          -->
            <div v-if="nowTab === '1'">
              <div class="form form-name">
                <div class="labels">
                  <label for="name" class="label-name">姓名</label>
                  <label
                    for="name"
                    v-if="nameValidation.valid === false"
                    class="alert"
                    >{{ nameValidation.message }}</label
                  >
                </div>
                <input
                  v-model="personalInfo.name"
                  type="text"
                  id="name"
                  placeholder="例如：张三"
                  :class="[{ error: nameValidation.valid === false }]"
                />
              </div>

              <div class="form form-email">
                <div class="labels">
                  <label for="email" class="label-name">电子邮件地址</label>
                  <label
                    for="email"
                    v-if="emailValidation.valid === false"
                    class="alert"
                    >{{ emailValidation.message }}</label
                  >
                </div>
                <div class="input-wrapper">
                  <input
                    v-model="personalInfo.email"
                    type="text"
                    id="email"
                    placeholder="例如：zhangsan@example.com"
                    :class="[{ error: emailValidation.valid === false }]"
                  />
                  <span
                    v-if="emailValidation.valid && debouncedInfo.email"
                    class="success-icon"
                  >
                    <IconCheck />
                  </span>
                </div>
              </div>

              <div class="form form-phone">
                <div class="labels">
                  <label for="phone" class="label-name">电话号码</label>
                  <label
                    for="phone"
                    v-if="phoneValidation.valid === false"
                    class="alert"
                    >{{ phoneValidation.message }}</label
                  >
                </div>
                <div class="input-wrapper">
                  <input
                    v-model="personalInfo.phone"
                    type="text"
                    id="phone"
                    placeholder="例如：138 0000 0000"
                    :class="[{ error: phoneValidation.valid === false }]"
                  />
                  <span
                    v-if="phoneValidation.valid && debouncedInfo.phone"
                    class="success-icon"
                  >
                    <IconCheck />
                  </span>
                </div>
              </div>
            </div>

            <!--          STEP 2          -->
            <div v-else-if="nowTab === '2'">
              <!-- 3 buttons -->
              <div class="options">
                <button
                  v-for="item in items.STEP2"
                  :key="item.name"
                  :class="[
                    'option non-selected',
                    { selected: item.id === plan },
                  ]"
                  @click="setPlanItem(item.id)"
                >
                  <img
                    :src="require(`@/assets/images/${item.icon}`)"
                    class="icon"
                  />
                  <div class="info">
                    <div class="option-nm card-nm">{{ item.name }}</div>
                    <div class="dollar card-des" v-if="!isYearly">
                      {{ item.monthly }}
                    </div>
                    <div class="dollar card-des" v-if="isYearly">
                      {{ item.yearly }}
                    </div>
                    <div v-if="isYearly" class="discount">
                      {{ item.discount }}
                    </div>
                  </div>
                </button>
              </div>

              <!-- toggle -->
              <div class="select-area">
                <div class="btn-area">
                  <span :class="['period', { 'm-or-y': !isYearly }]">月度</span>
                  <span class="toggle">
                    <input
                      type="checkbox"
                      id="toggle"
                      :checked="isYearly"
                      @change="toggleYearly"
                      hidden
                    />
                    <label for="toggle" class="switch">
                      <span class="toggle-btn"></span>
                    </label>
                  </span>
                  <span :class="['period', { 'm-or-y': isYearly }]">年度</span>
                </div>
              </div>
            </div>

            <!--          STEP 3          -->
            <div v-else-if="nowTab === '3'" class="third-step">
              <div class="addons">
                <button
                  v-for="addon in items.STEP3"
                  :key="addon.id"
                  :class="[
                    'addon non-selected',
                    { selected: addons.some((a) => a.id === addon.id) },
                  ]"
                  @click="setAddonItems(addon)"
                >
                  <span
                    :class="[
                      'checkbox',
                      { check: addons.some((a) => a.id === addon.id) },
                    ]"
                  >
                    <img src="@/assets/images/icon-checkmark.svg" />
                  </span>
                  <div class="txts">
                    <div class="card-nm">{{ addon.title }}</div>
                    <div class="card-des">{{ addon.semititle }}</div>
                  </div>
                  <div class="price" v-if="!isYearly">
                    {{ addon.monthly }}
                  </div>
                  <div class="price" v-if="isYearly">
                    {{ addon.yearly }}
                  </div>
                </button>
              </div>
            </div>

            <!--          STEP 4          -->
            <div v-else-if="nowTab === '4'" class="finishing">
              <div class="costs">
                <div :class="['plan-wrap', { plus: addons.length !== 0 }]">
                  <div class="plan">
                    <div class="name impt-txt">
                      <div>{{ nowPlan.name }}</div>
                      <div v-if="!isYearly">&nbsp;（月度）</div>
                      <div v-if="isYearly">&nbsp;（年度）</div>
                    </div>
                    <div @click="setTabContent('2')" class="change-plan">
                      编辑
                    </div>
                  </div>
                  <div class="plan-cost mg-lft impt-txt">
                    <span class="">{{
                      isYearly ? nowPlan.yearly : nowPlan.monthly
                    }}</span>
                  </div>
                </div>

                <div class="addon-wrap" v-if="addons.length !== 0">
                  <div v-for="addon in addons" :key="addon.id" class="addons">
                    <span>{{ addon.title }}</span>
                    <div class="addon-cost mg-lft">
                      <span v-if="!isYearly">{{ addon.monthly }}</span>
                      <span v-if="isYearly">{{ addon.yearly }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="total">
                <span v-if="!isYearly">总计（每月）</span>
                <span v-if="isYearly">总计（每年）</span>
                <span class="total-cost mg-lft">{{ totalCost }}</span>
              </div>
            </div>

            <!--          Thank you page          -->
            <div v-if="nowTab === '5'">
              <div class="appreciate">
                <img
                  src="@/assets/images/icon-thank-you.svg"
                  class="thankyou-icon"
                />
                <div class="thank-you">感谢您的订阅！</div>
                <div class="notice">
                  感谢您确认订阅！我们希望您使用愉快。如果您需要任何支持，请随时发送电子邮件至
                  support@loremgaming.com 联系我们。
                </div>
              </div>
            </div>
          </div>
          <div
            :class="['btns', { none: nowTab === '5' }]"
            v-if="nowTab !== '5'"
          >
            <button class="lft-btn" @click="goBack" v-if="nowTab !== '1'">
              返回
            </button>
            <button class="rgt-btn" v-if="nowTab !== '4'" @click="onSubmit">
              下一步
            </button>
            <button
              class="rgt-btn confirm"
              v-else-if="nowTab === '4'"
              @click="onSubmit"
            >
              确认
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable */
import { reactive, ref, watch, computed } from "vue";
import type { Ref } from "vue";
import { useCommonsStore } from "@/stores/commons";
import { IContent } from "@/types/content";
import _ from "lodash";
import { IStep2, IStep3 } from "@/types/items";
import { storeToRefs } from "pinia";
import { clearPersistedState } from "@/plugins/piniaPersistedState";
import { isValidEmail, isValidPhone } from "@/utils/validators";
import IconCheck from "@/components/IconCheck.vue";

const tabs = require("@/assets/data/tabs-info.json");
const content = require("@/assets/data/content.json");
const items = require("@/assets/data/items.json");

const commonsStore = useCommonsStore();

const { isYearly, nowTab, plan, addons, personalInfo, completedSteps } =
  storeToRefs(commonsStore);

const {
  setAddonItems,
  setPlanItem,
  toggleYearly,
  setTabActive,
  addCompletedStep,
} = commonsStore;

//left nav

let nowContent: IContent = reactive({
  id: "",
  title: "",
  semititle: "",
});

// 点击跳转
const setTabContent = (tabId: string) => {
  setTabActive(tabId);

  content.forEach((item: IContent) => {
    if (item.id === nowTab.value) {
      nowContent = item;
    }
  });
};

const onSubmit = (): void => {
  if (
    (nowTab.value === "1" && checkForm()) ||
    nowTab.value === "2" ||
    nowTab.value === "3" ||
    nowTab.value === "4"
  ) {
    // 当前设为已完成
    addCompletedStep(nowTab.value);
    const nextTab = String(Number(nowTab.value) + 1);
    setTabContent(nextTab);
    // 确认提交后消除持久化数据
    if (nextTab === "5") {
      clearPersistedState();
      // 清空步骤储存
      completedSteps.value = [];
    }
  }
};

const goBack = (): void => {
  setTabContent(String(Number(nowTab.value) - 1));
};



// 改为computed
/**
 * 获取当前选择的套餐详情  nowPlan
 * 实时计算总金额 totalCost
 *  - 提取纯数字的辅助方法 parseCost
 *  - 基础套餐费 planCost
 *  - 附加组件费汇总 addonsCost
 *  - total 然后按格式返回
 */

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

// validation check

// 是否提交过的状态判断（处理空态立刻飘红 isSubmitted
const isSubmitted = ref(false);
// 防抖校验的响应式中间对象 debouncedInfo
const debouncedInfo = reactive({
  email: personalInfo.value.email,
  phone: personalInfo.value.phone,
});
// loadash实现300ms 延时防抖监听 用watch分别监听email和phone
watch(
  () => personalInfo.value.email,
  _.debounce((newValue) => {
    debouncedInfo.email = newValue;
  }, 300),
);
watch(
  () => personalInfo.value.phone,
  _.debounce((newValue) => {
    debouncedInfo.phone = newValue;
  }, 300),
);
// 姓名验证 nameValidation
const nameValidation = computed(() => {
  if (isSubmitted.value && _.isEmpty(personalInfo.value.name))
    return { valid: false, message: "请填写姓名" };
  return { valid: true, message: "" };
});
// 邮箱验证 emailValidation
/**
 * 当点击提交，用实时值判定，依赖防抖值减少频繁报错
 * 必填验证
 * 格式验证
 **/
const emailValidation = computed(() => {
  if (isSubmitted.value && _.isEmpty(personalInfo.value.email))
    return { valid: false, message: "请填写邮箱" };
  if (_.isEmpty(debouncedInfo.email)) return { valid: true, message: "" };
  if (!isValidEmail(debouncedInfo.email))
    return { valid: false, message: "邮箱格式错误" };
  return { valid: true, message: "" };
});

/**
 * 手机号验证 phoneValidation
 * 必填验证
 * 格式验证
 **/
const phoneValidation = computed(() => {
  if (isSubmitted.value && _.isEmpty(personalInfo.value.phone))
    return { valid: false, message: "请填写手机号" };
  if (_.isEmpty(debouncedInfo.phone)) return { valid: true, message: "" };
  if (!isValidPhone(debouncedInfo.phone))
    return { valid: false, message: "手机号格式错误" };
  return { valid: true, message: "" };
});

/**
 * 提交按钮触发拦截验证校验函数 checkForm
 * 更新防抖数据防止因为点击过快造成计算属性未更新
 * 判断验证结果是否通过
 * */
const checkForm = () => {
  isSubmitted.value = true;
  debouncedInfo.email = personalInfo.value.email;
  debouncedInfo.phone = personalInfo.value.phone;
  return (
    nameValidation.value.valid &&
    emailValidation.value.valid &&
    phoneValidation.value.valid
  );
};

// 控制步骤顺序提示是否显示  showStepTip 定时清理stepTipTimer
const showStepTip = ref(false);
let stepTipTimer: ReturnType<typeof setTimeout> | null = null;
// 2秒后自动消失 showTip
const showTip = () => {
  showStepTip.value = true;
  if (stepTipTimer) clearTimeout(stepTipTimer);
  stepTipTimer = setTimeout(() => {
    showStepTip.value = false;
  }, 2000);
};
// 跳转控制 goToStep
const goToStep = (targetId: string) => {
  // 点击当前忽略
  if (targetId === nowTab.value) return;
  // 已完成返回
  if (completedSteps.value.includes(targetId)) {
    setTabContent(targetId);
  } else {
    // 未完成提示
    showTip();
  }
};

// 함수 실행부（翻译：函数执行部分

setTabContent(nowTab.value);
</script>

<style scoped>
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

/* 新增 */
.step {
  cursor: not-allowed; /* 默认不可点击 */
}
/* 将当前步和已完成步设置为手型指针 */
.step:has(.completed),
.step:has(.clicked) {
  cursor: pointer;
}
/* 可选：为已完成步骤加一个视觉提示 */
.num.completed {
  background-color: rgba(255, 255, 255, 0.3); /* 举例，可根据 UI 规范修改 */
  color: #fff;
  border: 1px solid #fff;
}
</style>
