<template>
  <div class="home">
    <div id="container">
      <div class="box">
        <!-- 左侧步骤导航 -->
        <div class="navbar">
          <ul>
            <li
              v-for="tab in tabsView"
              :key="tab.id"
              :class="[
                'step',
                {
                  current: tab.id === nowTab,
                  completed:
                    completedSteps.includes(tab.id) && tab.id !== nowTab,
                  disabled:
                    !isStepAccessible(tab.id) && tab.id !== nowTab,
                },
              ]"
              @click="goToStep(tab.id)"
            >
              <div class="num">
                {{ tab.id }}
              </div>
              <div class="item">
                <div class="step-nm">{{ tab.step }}</div>
                <div class="name">{{ tab.name }}</div>
              </div>
            </li>
          </ul>
        </div>

        <!-- 右侧内容区 -->
          <div class="content">
          <div v-if="showStepTip" class="step-tip">
            {{ pageView.stepTip }}
          </div>
          <div class="title top-area" v-if="pageView.title">
            {{ pageView.title }}
          </div>
          <div class="semi-title" v-if="pageView.semititle">
            {{ pageView.semititle }}
          </div>
          <div class="forms">
            <StepPersonalInfo v-if="nowTab === '1'" ref="stepPersonalRef" />
            <StepPlan v-else-if="nowTab === '2'" />
            <StepAddons v-else-if="nowTab === '3'" />
            <StepSummary v-else-if="nowTab === '4'" @go-to-step="goToStep" />
            <StepThankYou v-if="nowTab === '5'" />
          </div>
          <!-- 底部操作按钮 -->
          <div
            :class="['btns', { none: nowTab === '5' }]"
            v-if="nowTab !== '5'"
          >
            <button class="lft-btn" @click="goBack" v-if="nowTab !== '1'">
              {{ pageView.backText }}
            </button>
            <button class="rgt-btn" v-if="nowTab !== '4'" @click="onSubmit">
              {{ pageView.nextText }}
            </button>
            <button
              class="rgt-btn confirm"
              v-else-if="nowTab === '4'"
              @click="onSubmit"
            >
              {{ pageView.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useCommonsStore } from "@/stores/commons";
import { clearPersistedState } from "@/plugins/piniaPersistedState";
import { TABS } from "@/constants/formData";

import StepPersonalInfo from "@/components/home/steps/StepPersonalInfo.vue";
import StepPlan from "@/components/home/steps/StepPlan.vue";
import StepAddons from "@/components/home/steps/StepAddons.vue";
import StepSummary from "@/components/home/steps/StepSummary.vue";
import StepThankYou from "@/components/home/steps/StepThankYou.vue";

const commonsStore = useCommonsStore();
const { t } = useI18n();
const { nowTab, completedSteps } = storeToRefs(commonsStore);
const { setTabActive, addCompletedStep } = commonsStore;

// 记录本次会话访问过的最远步骤。完成状态仍由 completedSteps 独立维护，
// 这样用户回到前一步编辑时，仍可返回刚才访问过但尚未提交的步骤。
const furthestVisitedStep = ref(
  Math.max(Number(nowTab.value), ...completedSteps.value.map(Number), 1),
);

watch(nowTab, (step) => {
  if (step === "1" && completedSteps.value.length === 0) {
    furthestVisitedStep.value = 1;
    return;
  }
  furthestVisitedStep.value = Math.max(
    furthestVisitedStep.value,
    Number(step),
  );
});

watch(
  completedSteps,
  (steps) => {
    if (nowTab.value === "1" && steps.length === 0) {
      furthestVisitedStep.value = 1;
    }
  },
  { deep: true },
);

const isStepAccessible = (stepId: string): boolean =>
  Number(stepId) <= furthestVisitedStep.value;

// ---- 步骤组件 ref ----

const stepPersonalRef = ref<InstanceType<typeof StepPersonalInfo> | null>(null);

// ---- 当前步骤文案（替代原来的 reactive 手动赋值） ----

const tabsView = computed(() =>
  TABS.map((tab) => ({
    ...tab,
    step: t(`steps.step${tab.id}.step`),
    name: t(`steps.step${tab.id}.name`),
  })),
);

const pageView = computed(() => ({
  stepTip: t("common.toast.stepOrder"),
  backText: t("common.buttons.back"),
  nextText: t("common.buttons.next"),
  confirmText: t("common.buttons.confirm"),
  title: nowTab.value === "5" ? "" : t(`steps.content.step${nowTab.value}.title`),
  semititle:
    nowTab.value === "5" ? "" : t(`steps.content.step${nowTab.value}.semititle`),
}));

// ---- 流程控制 ----

const onSubmit = (): void => {
  if (
    (nowTab.value === "1" && stepPersonalRef.value?.checkForm()) ||
    nowTab.value === "2" ||
    nowTab.value === "3" ||
    nowTab.value === "4"
  ) {
    // 当前步骤标记为已完成
    addCompletedStep(nowTab.value);
    const nextTab = String(Number(nowTab.value) + 1);
    setTabActive(nextTab);
    // 确认提交后清除持久化数据
    if (nextTab === "5") {
      clearPersistedState();
      completedSteps.value = [];
    }
  }
};

const goBack = (): void => {
  setTabActive(String(Number(nowTab.value) - 1));
};

// ---- 步骤跳转控制与提示 ----

const showStepTip = ref(false);
let stepTipTimer: ReturnType<typeof setTimeout> | null = null;

// 2秒后自动消失
const showTip = () => {
  showStepTip.value = true;
  if (stepTipTimer) clearTimeout(stepTipTimer);
  stepTipTimer = setTimeout(() => {
    showStepTip.value = false;
  }, 2000);
};

const goToStep = (targetId: string) => {
  // 点击当前步骤忽略
  if (targetId === nowTab.value) return;
  // 已完成或本次会话已经访问过的步骤允许返回
  if (isStepAccessible(targetId)) {
    setTabActive(targetId);
  } else {
    // 未完成步骤提示
    showTip();
  }
};

// 组件卸载时清理未执行的 timeout
onUnmounted(() => {
  if (stepTipTimer) clearTimeout(stepTipTimer);
});
</script>

<style scoped>
.step-tip {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 14px;
  pointer-events: none;
  z-index: 100;
}

/* 步骤导航样式 */
.step {
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.step .num {
  border: 1px solid #bde2fd;
  border-radius: 50%;
  color: #fff;
}

.step.current .num {
  background-color: #bde2fd;
  color: #12335e;
}

.step.completed .num {
  background-color: rgba(255, 255, 255, 0.3);
  color: #fff;
  border-color: #fff;
}

.step.disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.step.disabled .num {
  background-color: transparent;
  border-color: rgba(255, 255, 255, 0.5);
  color: rgba(255, 255, 255, 0.7);
}

.step.disabled .item {
  opacity: 0.8;
}
</style>
