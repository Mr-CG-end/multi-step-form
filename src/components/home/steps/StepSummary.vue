<template>
  <div class="finishing">
    <div class="costs">
      <!-- 个人信息摘要 -->
      <div class="summary-block personal-summary">
        <div class="summary-header">
          <div class="impt-txt">个人信息</div>
          <button
            type="button"
            class="change-plan"
            @click="emit('goToStep', '1')"
          >
            编辑
          </button>
        </div>
        <div class="summary-content">
          <div>{{ personalInfo.name }}</div>
          <div>{{ personalInfo.email }}</div>
          <div>{{ personalInfo.phone }}</div>
        </div>
      </div>

      <!-- 套餐摘要 -->
      <div class="summary-block plan-summary">
        <div class="summary-header">
          <div class="impt-txt">
            {{ nowPlan.name }}{{ isYearly ? "（年度）" : "（月度）" }}
          </div>
          <button
            type="button"
            class="change-plan"
            @click="emit('goToStep', '2')"
          >
            编辑
          </button>
        </div>
        <div class="summary-content">
          <div class="plan-cost impt-txt">
            {{ isYearly ? nowPlan.yearly : nowPlan.monthly }}
          </div>
        </div>
      </div>

      <!-- 附加服务摘要 -->
      <div class="summary-block addons-summary">
        <div class="summary-header">
          <div class="impt-txt">附加服务</div>
          <button
            type="button"
            class="change-plan"
            @click="emit('goToStep', '3')"
          >
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
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useCommonsStore } from "@/stores/commons";
import { STEP2_ITEMS } from "@/constants/formData";
import type { IStep2 } from "@/types/items";

const emit = defineEmits<{
  /** 点击「编辑」按钮时通知父组件跳转到指定步骤 */
  (e: "goToStep", tabId: string): void;
}>();

const { personalInfo, plan, addons, isYearly } = storeToRefs(
  useCommonsStore(),
);

/** 当前选择的套餐详情 */
const nowPlan = computed<IStep2>(() => {
  return (
    STEP2_ITEMS.find((item) => item.id === plan.value) || STEP2_ITEMS[0]
  );
});

/** 从价格字符串中提取纯数字 */
const parseCost = (str: string): number => Number(str.replace(/[^0-9]/g, ""));

/** 实时计算总金额（基础套餐 + 附加服务） */
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
  return isYearly.value ? `¥${total}/年` : `¥${total}/月`;
});
</script>

<style scoped>
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

/* finishing 布局：costs 和 total 各占自然空间 */
.finishing {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.finishing .costs {
  flex: 1;
  overflow: hidden auto; /* x 轴锁定，y 轴按需滚动 */
}

.finishing .total {
  flex-shrink: 0;
}
</style>
