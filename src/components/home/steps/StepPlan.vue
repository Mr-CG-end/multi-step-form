<template>
  <div>
    <!-- 套餐选项卡片 -->
    <div class="options">
      <button
        v-for="item in planCards"
        :key="item.id"
        type="button"
        :class="['option non-selected', { selected: item.id === plan }]"
        :aria-pressed="item.id === plan"
        :aria-label="`${item.name}, ${!isYearly ? item.monthly : item.yearly}${isYearly && item.discount ? ', ' + item.discount : ''}`"
        @click="setPlanItem(item.id)"
      >
        <img
          :src="require(`@/assets/images/${item.icon}`)"
          class="icon"
          alt=""
          aria-hidden="true"
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

    <!-- 月度/年度计费周期切换 -->
    <div class="select-area">
      <div class="btn-area">
        <span :class="['period', { 'm-or-y': !isYearly }]">{{
          periodView.monthly
        }}</span>
        <span class="toggle">
          <input
            type="checkbox"
            id="toggle"
            class="sr-only"
            role="switch"
            :checked="isYearly"
            :aria-checked="isYearly"
            :aria-label="`${periodView.monthly} / ${periodView.yearly}`"
            @change="toggleYearly"
          />
          <label for="toggle" class="switch">
            <span class="toggle-btn"></span>
          </label>
        </span>
        <span :class="['period', { 'm-or-y': isYearly }]">{{
          periodView.yearly
        }}</span>
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

<style scoped lang="scss">
/* 视觉隐藏原生复选框，但保留在无障碍树中以支持键盘焦点与读屏器 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.toggle {
  position: relative;
  display: inline-block;
}

/* 计费周期切换开关键盘聚焦高亮 */
.sr-only:focus-visible + .switch {
  outline: 2px solid #534D93;
  outline-offset: 3px;
  box-shadow: 0 0 0 4px rgba(83, 77, 147, 0.25);
}

/* 套餐卡片键盘聚焦高亮 */
.option:focus-visible {
  outline: 2px solid #534D93;
  outline-offset: 2px;
}
</style>
