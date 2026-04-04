<template>
  <div class="third-step">
    <div class="addons">
      <button
        v-for="addon in addonsView"
        :key="addon.id"
        :class="[
          'addon non-selected',
          { selected: addonIds.includes(addon.id) },
        ]"
        @click="setAddonItems(addon.id)"
      >
        <span :class="['checkbox', { check: addonIds.includes(addon.id) }]">
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
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useCommonsStore } from "@/stores/commons";
import { STEP3_ITEMS } from "@/constants/formData";

const { t } = useI18n();

const commonsStore = useCommonsStore();
const { addonIds, isYearly } = storeToRefs(commonsStore);
const { setAddonItems } = commonsStore;

const addonsView = computed(() =>
  STEP3_ITEMS.map((item) => ({
    id: item.id,
    title: t(`items.addons.${item.id}.title`),
    semititle: t(`items.addons.${item.id}.semititle`),
    monthly: t(`items.addons.${item.id}.monthly`),
    yearly: t(`items.addons.${item.id}.yearly`),
  })),
);
</script>
