<template>
  <LanguageSwitcher />
  <PageAgentDemo />
  <nav></nav>
  <router-view />
</template>

<script setup lang="ts">
import LanguageSwitcher from "@/components/LanguageSwitcher.vue";
import PageAgentDemo from "@/components/PageAgentDemo.vue";
</script>

<style lang="scss">
@use "@/assets/scss/default.scss";
@use "@/assets/scss/commons.scss";
</style>
