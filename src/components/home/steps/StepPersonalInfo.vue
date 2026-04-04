<template>
  <div>
    <div class="form form-name">
      <div class="labels">
        <label for="name" class="label-name">{{
          $t("form.labels.name")
        }}</label>
        <label for="name" v-if="nameValidation.valid === false" class="alert">{{
          nameValidation.message
        }}</label>
      </div>
      <input
        v-model="personalInfo.name"
        type="text"
        id="name"
        :placeholder="$t('form.placeholders.name')"
        :class="[{ error: nameValidation.valid === false }]"
      />
    </div>

    <div class="form form-email">
      <div class="labels">
        <label for="email" class="label-name">{{
          $t("form.labels.email")
        }}</label>
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
          :placeholder="$t('form.placeholders.email')"
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
        <label for="phone" class="label-name">{{
          $t("form.labels.phone")
        }}</label>
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
          :placeholder="$t('form.placeholders.phone')"
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
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useCommonsStore } from "@/stores/commons";
import { usePersonalInfoValidation } from "@/composables/usePersonalInfoValidation";
import IconCheck from "@/components/IconCheck.vue";

const { personalInfo } = storeToRefs(useCommonsStore());

const {
  debouncedInfo,
  nameValidation,
  emailValidation,
  phoneValidation,
  checkForm,
} = usePersonalInfoValidation();

// 暴露 checkForm 给父组件，供 onSubmit 调用
defineExpose({ checkForm });
</script>

<style scoped>
/* 输入框包裹器与对勾图标 */
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
  color: #28a745;
  font-size: 16px;
  pointer-events: none; /* 防止遮挡输入点击 */
}

/* 修复 input padding 导致的宽度溢出 */
.form input {
  width: 100% !important;
  box-sizing: border-box;
}
</style>
