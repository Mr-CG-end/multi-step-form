import { defineStore } from "pinia";
import { IPersonal } from "@/types/items";
import { clearPersistedState } from "@/plugins/piniaPersistedState";
import { ref } from "vue";
import type {
  CommonsSnapshot,
  FormIntent,
  PartialFormIntent,
} from "@/types/form-assistant";

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

  function createSnapshot(): CommonsSnapshot {
    return {
      nowTab: nowTab.value,
      personalInfo: { ...personalInfo.value },
      plan: plan.value,
      addonIds: [...addonIds.value],
      isYearly: isYearly.value,
      completedSteps: [...completedSteps.value],
    };
  }

  function restoreSnapshot(snapshot: CommonsSnapshot) {
    nowTab.value = snapshot.nowTab;
    personalInfo.value = { ...snapshot.personalInfo };
    plan.value = snapshot.plan;
    addonIds.value = [...snapshot.addonIds];
    isYearly.value = snapshot.isYearly;
    completedSteps.value = [...snapshot.completedSteps];
  }

  function prepareAssistantRun(intent: FormIntent) {
    personalInfo.value = { ...intent.personalInfo };
    plan.value = "1";
    addonIds.value = [];
    isYearly.value = false;
    completedSteps.value = ["1"];
    nowTab.value = "2";
  }

  function applyAssistantProgress(intent: PartialFormIntent) {
    if (intent.personalInfo.name !== undefined) {
      personalInfo.value.name = intent.personalInfo.name;
    }
    if (intent.personalInfo.email !== undefined) {
      personalInfo.value.email = intent.personalInfo.email;
    }
    if (intent.personalInfo.phone !== undefined) {
      personalInfo.value.phone = intent.personalInfo.phone;
    }
    if (intent.plan !== undefined) plan.value = intent.plan;
    if (intent.billingCycle !== undefined) {
      isYearly.value = intent.billingCycle === "yearly";
    }
    if (intent.addonIds !== undefined) addonIds.value = [...intent.addonIds];

    const hasPersonalInfo =
      Boolean(personalInfo.value.name.trim()) &&
      Boolean(personalInfo.value.email.trim()) &&
      Boolean(personalInfo.value.phone.trim());
    if (hasPersonalInfo) addCompletedStep("1");
    if (hasPersonalInfo && intent.plan !== undefined && intent.billingCycle) {
      addCompletedStep("2");
    }
    if (
      hasPersonalInfo &&
      intent.plan !== undefined &&
      intent.billingCycle &&
      intent.addonIds !== undefined
    ) {
      addCompletedStep("3");
    }

    if (!hasPersonalInfo) nowTab.value = "1";
    else if (intent.plan === undefined || !intent.billingCycle) nowTab.value = "2";
    else if (intent.addonIds === undefined) nowTab.value = "3";
    else nowTab.value = "4";
  }

  function applyAssistantIntent(intent: FormIntent) {
    personalInfo.value = { ...intent.personalInfo };
    plan.value = intent.plan;
    addonIds.value = [...intent.addonIds];
    isYearly.value = intent.billingCycle === "yearly";
    completedSteps.value = ["1", "2", "3"];
    nowTab.value = "4";
  }

  function matchesAssistantIntent(intent: FormIntent): boolean {
    const expectedAddons = [...intent.addonIds].sort();
    const actualAddons = [...addonIds.value].sort();
    return (
      personalInfo.value.name === intent.personalInfo.name &&
      personalInfo.value.email === intent.personalInfo.email &&
      personalInfo.value.phone.replace(/\s/g, "") ===
        intent.personalInfo.phone.replace(/\s/g, "") &&
      plan.value === intent.plan &&
      isYearly.value === (intent.billingCycle === "yearly") &&
      JSON.stringify(actualAddons) === JSON.stringify(expectedAddons) &&
      nowTab.value === "4"
    );
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
    createSnapshot,
    restoreSnapshot,
    prepareAssistantRun,
    applyAssistantProgress,
    applyAssistantIntent,
    matchesAssistantIntent,
    clearForm,
    addCompletedStep,
  };
});
