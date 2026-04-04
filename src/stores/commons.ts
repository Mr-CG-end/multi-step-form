import { defineStore } from "pinia";
import { IPersonal } from "@/types/items";
import { clearPersistedState } from "@/plugins/piniaPersistedState";
import { ref } from "vue";

export const useCommonsStore = defineStore("commonsStore", () => {
  const nowTab = ref("1");
  const personalInfo = ref<IPersonal>({
    name: "",
    email: "",
    phone: "",
  });
  const plan = ref("1");
  const addonIds = ref<string[]>([]);
  // 是否是年付
  const isYearly = ref(false);
  // 记录已完成步骤的ID 存储字符串 completedSteps
  const completedSteps = ref<string[]>([]);

  function setTabActive(tabId: string) {
    nowTab.value = tabId;
  }

  function setPlanItem(planId: string) {
    plan.value = planId;
  }

  function setAddonItems(addon: string) {
    const index = addonIds.value.indexOf(addon);
    if (index === -1) {
      addonIds.value.push(addon);
    } else {
      addonIds.value.splice(index, 1);
    }
  }

  function toggleYearly() {
    isYearly.value = !isYearly.value;
  }

  // 更新重置函数
  function clearForm() {
    // 手动重置数据
    nowTab.value = "1";
    personalInfo.value = { name: "", email: "", phone: "" };
    plan.value = "1";
    addonIds.value = [];
    isYearly.value = false;
    completedSteps.value = [];
    clearPersistedState();
  }

  // 将步骤标记为完成  addCompletedStep
  const addCompletedStep = (stepId: string) => {
    if (!completedSteps.value.includes(stepId))
      completedSteps.value.push(stepId);
  };

  return {
    // state
    nowTab,
    personalInfo,
    plan,
    addonIds,
    isYearly,
    completedSteps,
    // action
    setTabActive,
    setPlanItem,
    setAddonItems,
    toggleYearly,
    clearForm,
    addCompletedStep,
  };
});
