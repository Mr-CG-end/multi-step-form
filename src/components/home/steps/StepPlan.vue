<template>
  <div>
    <!-- 套餐选项卡片 -->
    <div class="options">
      <button
        v-for="item in planCards"
        :key="item.id"
        :class="['option non-selected', { selected: item.id === plan }]"
        @click="setPlanItem(item.id)"
      >
        <img :src="require(`@/assets/images/${item.icon}`)" class="icon" />
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

    <!-- 月度/年度切换 -->
    <div class="select-area">
      <div class="btn-area">
        <span :class="['period', { 'm-or-y': !isYearly }]">{{ periodView.monthly }}</span>
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
        <span :class="['period', { 'm-or-y': isYearly }]">{{ periodView.yearly }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useCommonsStore } from "@/stores/commons";
import { STEP2_ITEMS } from "@/constants/formData";

const { t } = useI18n();

const commonsStore = useCommonsStore();
const { isYearly, plan } = storeToRefs(commonsStore);
const { setPlanItem, toggleYearly } = commonsStore;

const planCards = computed(() =>
  STEP2_ITEMS.map((item) => ({
    ...item,
    name: t(`items.plans.${item.id}.name`),
    monthly: t(`items.plans.${item.id}.monthly`),
    yearly: t(`items.plans.${item.id}.yearly`),
    discount: t(`items.plans.${item.id}.discount`),
  })),
);

const periodView = computed(() => ({
  monthly: t("common.period.monthly"),
  yearly: t("common.period.yearly"),
}));
</script>
