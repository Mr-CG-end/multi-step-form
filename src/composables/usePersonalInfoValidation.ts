import { ref, reactive, watch, computed, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useCommonsStore } from "@/stores/commons";
import { isValidEmail, isValidPhone } from "@/utils/validators";
import { debounce } from "@/utils/debounce";

export function usePersonalInfoValidation() {
  const { t } = useI18n();
  const { personalInfo } = storeToRefs(useCommonsStore());

  // 是否提交过——控制空值报错时机，点击提交前不骚扰用户
  const isSubmitted = ref(false);

  // 防抖替身：格式验证基于此对象，而非 v-model 原始数据
  const debouncedInfo = reactive({
    email: personalInfo.value.email,
    phone: personalInfo.value.phone,
  });

  // 300ms 延时防抖，保存引用以便 unmount 时取消
  const debouncedSyncEmail = debounce((newValue: string) => {
    debouncedInfo.email = newValue;
  }, 300);
  const debouncedSyncPhone = debounce((newValue: string) => {
    debouncedInfo.phone = newValue;
  }, 300);

  watch(() => personalInfo.value.email, debouncedSyncEmail);
  watch(() => personalInfo.value.phone, debouncedSyncPhone);

  // 组件卸载时取消未执行的 debounce，防止遗留异步副作用
  onUnmounted(() => {
    debouncedSyncEmail.cancel();
    debouncedSyncPhone.cancel();
  });

  // ---- 验证 computed：每个字段独立返回 { valid, message } ----

  const nameValidation = computed(() => {
    if (isSubmitted.value && !personalInfo.value.name.trim())
      return { valid: false, message: t("validation.required.name") };
    return { valid: true, message: "" };
  });

  /**
   * 邮箱验证：
   * - 必填：仅在 isSubmitted 后才对空值报错
   * - 格式：基于防抖替身 debouncedInfo，减少频繁报错
   */
  const emailValidation = computed(() => {
    if (isSubmitted.value && !personalInfo.value.email.trim())
      return { valid: false, message: t("validation.required.email") };
    if (!debouncedInfo.email.trim()) return { valid: true, message: "" };
    if (!isValidEmail(debouncedInfo.email))
      return { valid: false, message: t("validation.format.email") };
    return { valid: true, message: "" };
  });

  /**
   * 手机号验证：
   * - 必填验证
   * - 格式验证
   */
  const phoneValidation = computed(() => {
    if (isSubmitted.value && !personalInfo.value.phone.trim())
      return { valid: false, message: t("validation.required.phone") };
    if (!debouncedInfo.phone.trim()) return { valid: true, message: "" };
    if (!isValidPhone(debouncedInfo.phone))
      return { valid: false, message: t("validation.format.phone") };
    return { valid: true, message: "" };
  });

  /**
   * 守门函数：提交时触发
   * 1. 置 isSubmitted 为 true
   * 2. 强制同步防抖替身，防止用户手速 < 300ms 时读取旧值
   * 3. 只通过 computed.valid 判断是否放行（DRY）
   */
  const checkForm = (): boolean => {
    isSubmitted.value = true;
    // 强制同步替身，打破 300ms 延迟
    debouncedInfo.email = personalInfo.value.email;
    debouncedInfo.phone = personalInfo.value.phone;
    return (
      nameValidation.value.valid &&
      emailValidation.value.valid &&
      phoneValidation.value.valid
    );
  };

  return {
    isSubmitted,
    debouncedInfo,
    nameValidation,
    emailValidation,
    phoneValidation,
    checkForm,
  };
}
