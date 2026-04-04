<template>
  <LanguageSwitcher />
  <nav></nav>
  <router-view />
</template>

<script setup lang="ts">
import LanguageSwitcher from "@/components/LanguageSwitcher.vue";
</script>

<style lang="scss">
@use "@/assets/scss/default.scss";
@use "@/assets/scss/commons.scss";
</style>
