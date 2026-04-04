<template>
  <div class="third-step">
    <div class="addons">
      <button
        v-for="addon in STEP3_ITEMS"
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
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useCommonsStore } from "@/stores/commons";
import { STEP3_ITEMS } from "@/constants/formData";

const commonsStore = useCommonsStore();
const { addons, isYearly } = storeToRefs(commonsStore);
const { setAddonItems } = commonsStore;
</script>
