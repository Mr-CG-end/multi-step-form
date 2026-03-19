/**
 * 验证邮箱格式
 * @param email 邮箱地址
 * @returns 是否符合标准邮箱格式
 */
export const isValidEmail = (email: string): boolean => {
  // emailRegex 邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // 返回验证结果
  return emailRegex.test(email);
};

/**
 * 验证中国大陆11位手机号
 * @param phone 手机号
 * @returns 是否符合手机号格式
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};
