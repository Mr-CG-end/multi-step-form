import { defineStore } from "pinia";
import { IPersonal, IStep3 } from "@/types/items";
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
  const addons = ref<Array<IStep3>>([]);
  // 是否是年付
  const isYearly = ref(false);

  function setTabActive(tabId: string) {
    nowTab.value = tabId;
  }

  function setPlanItem(planId: string) {
    plan.value = planId;
  }

  function setAddonItems(addon: IStep3) {
    const index = addons.value.findIndex((a) => a.id === addon.id);
    if (index === -1) {
      addons.value.push(addon);
    } else {
      addons.value.splice(index, 1);
    }
  }

  function toggleYearly() {
    isYearly.value = !isYearly.value;
  }

  function clearForm() {
    // 手动重置数据
    nowTab.value = "1";
    personalInfo.value = { name: "", email: "", phone: "" };
    plan.value = "1";
    addons.value = [];
    isYearly.value = false;
    clearPersistedState();
  }

  return {
    // state
    nowTab,
    personalInfo,
    plan,
    addons,
    isYearly,
    // action
    setTabActive,
    setPlanItem,
    setAddonItems,
    toggleYearly,
    clearForm,
  };
});
