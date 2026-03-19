<template>
  <div class="home">
    <div id="container">
      <div class="box">
        <div class="navbar">
          <ul>
            <li v-for="tab in tabs" :key="tab.id" class="step">
              <div :class="['num', { clicked: tab.id === nowTab }]">
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
                    v-if="validation.nameVal === false"
                    class="alert"
                    >此字段为必填项</label
                  >
                </div>
                <input
                  v-model="personalInfo.name"
                  type="text"
                  id="name"
                  placeholder="例如：张三"
                  :class="[{ error: validation.nameVal === false }]"
                  required
                />
              </div>

              <div class="form form-email">
                <div class="labels">
                  <label for="email" class="label-name">电子邮件地址</label>
                  <label
                    for="email"
                    v-if="validation.emailVal === false"
                    class="alert"
                    >此字段为必填项</label
                  >
                </div>
                <input
                  v-model="personalInfo.email"
                  type="text"
                  id="email"
                  placeholder="例如：zhangsan@example.com"
                  :class="[{ error: validation.emailVal === false }]"
                  required
                />
              </div>

              <div class="form form-phone">
                <div class="labels">
                  <label for="phone" class="label-name">电话号码</label>
                  <label
                    for="phone"
                    v-if="validation.phoneVal === false"
                    class="alert"
                    >此字段为必填项</label
                  >
                </div>
                <input
                  v-model="personalInfo.phone"
                  type="text"
                  id="phone"
                  placeholder="例如：+86 138 0000 0000"
                  :class="[{ error: validation.phoneVal === false }]"
                  required
                />
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
                    <div @click="() => (nowTab = '2')" class="change-plan">
                      更改
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
              <diV class="appreciate">
                <img
                  src="@/assets/images/icon-thank-you.svg"
                  class="thankyou-icon"
                />
                <div class="thank-you">感谢您的订阅！</div>
                <div class="notice">
                  感谢您确认订阅！我们希望您使用愉快。如果您需要任何支持，请随时发送电子邮件至
                  support@loremgaming.com 联系我们。
                </div>
              </diV>
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
import { reactive, ref, watch } from "vue";
import type { Ref } from "vue";
import { useCommonsStore } from "@/stores/commons";
import { IContent } from "@/types/content";
import _ from "lodash";
import { IStep2, IStep3 } from "@/types/items";
import { storeToRefs } from "pinia";
import { clearPersistedState } from "@/plugins/piniaPersistedState";

const tabs = require("@/assets/data/tabs-info.json");
const content = require("@/assets/data/content.json");
const items = require("@/assets/data/items.json");

const commonsStore = useCommonsStore();

const { isYearly, nowTab, plan, addons, personalInfo } =
  storeToRefs(commonsStore);

const { setAddonItems, setPlanItem, toggleYearly, setTabActive } = commonsStore;

//left nav

let nowContent: IContent = reactive({
  id: "",
  title: "",
  semititle: "",
});

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
    const nextTab = String(Number(nowTab.value) + 1);
    setTabContent(nextTab);
    // 确认提交后消除持久化数据
    if (nextTab === "5") {
      clearPersistedState();
    }
  }
};

const goBack = (): void => {
  setTabContent(String(Number(nowTab.value) - 1));
};

// step2

// const isYearly: Ref<boolean> = ref(false);

// const setOptions = () => {
//   isYearly.value = !isYearly.value;
// };

// step4
let totalCost: Ref<string> = ref("");
let nowPlan: Ref<IStep2> = ref(_.cloneDeep(items.STEP2[0]));

const setSelectedOptions = () => {
  items.STEP2.forEach((item: IStep2) => {
    if (item.id === plan.value) {
      nowPlan.value = item;
    }
  });
  sumCost();
};

const sumCost = () => {
  const planCost: string = isYearly.value
    ? _.cloneDeep(nowPlan.value).yearly.replace(/[^0-9]/g, "")
    : _.cloneDeep(nowPlan.value).monthly.replace(/[^0-9]/g, "");
  let addonCosts: Array<number> = [];
  addons.value.forEach((addon: IStep3) => {
    isYearly.value
      ? addonCosts.push(
          Number(_.cloneDeep(addon).yearly.replace(/[^0-9]/g, "")),
        )
      : addonCosts.push(
          Number(_.cloneDeep(addon).monthly.replace(/[^0-9]/g, "")),
        );
  });

  totalCost.value = isYearly.value
    ? "$" + String(Number(planCost) + _.sum(addonCosts)) + "/yr"
    : "$" + String(Number(planCost) + _.sum(addonCosts)) + "/mo";
};

watch(
  () => nowTab,
  () => {
    if (nowTab.value === "4") {
      setSelectedOptions();
    }
  },
);

// validation check

// step1
const validation: any = reactive({
  nameVal: true,
  emailVal: true,
  phoneVal: true,
});

const checkForm = () => {
  if (_.isEmpty(personalInfo.value.name)) {
    validation.nameVal = false;
    return false;
  } else {
    validation.nameVal = true;
  }

  if (_.isEmpty(personalInfo.value.email)) {
    validation.emailVal = false;
    return false;
  } else {
    validation.emailVal = true;
  }

  if (_.isEmpty(personalInfo.value.phone)) {
    validation.phoneVal = false;
    return false;
  } else {
    validation.phoneVal = true;
  }

  return true;
};

watch(
  () => personalInfo,
  () => {
    if (!_.isEmpty(personalInfo.value.name)) {
      validation.nameVal = true;
    }
    if (!_.isEmpty(personalInfo.value.email)) {
      validation.emailVal = true;
    }
    if (!_.isEmpty(personalInfo.value.phone)) {
      validation.phoneVal = true;
    }
  },
  { deep: true },
);

// 함수 실행부（翻译：函数执行部分

setTabContent(nowTab.value);
</script>
