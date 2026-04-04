<template>
  <div class="finishing">
    <div class="costs">
      <div class="summary-block personal-summary">
        <div class="summary-header">
          <div class="impt-txt">{{ summaryView.personalTitle }}</div>
          <button
            type="button"
            class="change-plan"
            @click="emit('goToStep', '1')"
          >
            {{ summaryView.editText }}
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
            {{ nowPlan.name }}{{ summaryView.planSuffix }}
          </div>
          <button
            type="button"
            class="change-plan"
            @click="emit('goToStep', '2')"
          >
            {{ summaryView.editText }}
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
          <div class="impt-txt">{{ summaryView.addonsTitle }}</div>
          <button
            type="button"
            class="change-plan"
            @click="emit('goToStep', '3')"
          >
            {{ summaryView.editText }}
          </button>
        </div>
        <div class="summary-content" v-if="selectedAddons.length">
          <div v-for="addon in selectedAddons" :key="addon.id" class="addons">
            <span>{{ addon.title }}</span>
            <div class="addon-cost mg-lft">
              <span v-if="!isYearly">{{ addon.monthly }}</span>
              <span v-else>{{ addon.yearly }}</span>
            </div>
          </div>
        </div>
        <div class="summary-content" v-else>
          <div class="card-des">{{ summaryView.noAddonsText }}</div>
        </div>
      </div>
    </div>

    <div class="total">
      <span>{{ summaryView.totalLabel }}</span>
      <span class="total-cost mg-lft">{{ totalCost }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useCommonsStore } from "@/stores/commons";

const emit = defineEmits<{
  (e: "goToStep", tabId: string): void;
}>();

const { t } = useI18n();
const { personalInfo, plan, addonIds, isYearly } = storeToRefs(
  useCommonsStore(),
);

const summaryView = computed(() => ({
  personalTitle: t("form.summary.personalInfo"),
  addonsTitle: t("form.summary.addons"),
  noAddonsText: t("form.summary.noAddons"),
  totalLabel: isYearly.value
    ? t("form.summary.totalYearly")
    : t("form.summary.totalMonthly"),
  planSuffix: isYearly.value
    ? t("form.summary.planSuffix.yearly")
    : t("form.summary.planSuffix.monthly"),
  editText: t("common.buttons.edit"),
}));

const nowPlan = computed(() => ({
  id: plan.value,
  name: t(`items.plans.${plan.value}.name`),
  monthly: t(`items.plans.${plan.value}.monthly`),
  yearly: t(`items.plans.${plan.value}.yearly`),
}));

const selectedAddons = computed(() =>
  addonIds.value.map((id) => ({
    id: id,
    title: t(`items.addons.${id}.title`),
    monthly: t(`items.addons.${id}.monthly`),
    yearly: t(`items.addons.${id}.yearly`),
  })),
);

const parseCost = (str: string): number => Number(str.replace(/[^0-9]/g, ""));

const totalCost = computed(() => {
  const planCost = isYearly.value
    ? parseCost(nowPlan.value.yearly)
    : parseCost(nowPlan.value.monthly);
  const addonsCost = selectedAddons.value.reduce(
    (sum, addon) =>
      sum +
      (isYearly.value ? parseCost(addon.yearly) : parseCost(addon.monthly)),
    0,
  );
  const total = planCost + addonsCost;

  return isYearly.value
    ? t("items.priceFormat.yearly", { amount: total })
    : t("items.priceFormat.monthly", { amount: total });
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

.finishing {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.finishing .costs {
  flex: 1;
  overflow: hidden auto;
}

.finishing .total {
  flex-shrink: 0;
}
</style>
