export default {
  plans: {
    "1": {
      name: "基础版",
      monthly: "¥9/月",
      yearly: "¥90/年",
      discount: "免 2 个月费用",
    },
    "2": {
      name: "高级版",
      monthly: "¥12/月",
      yearly: "¥120/年",
      discount: "免 2 个月费用",
    },
    "3": {
      name: "专业版",
      monthly: "¥15/月",
      yearly: "¥150/年",
      discount: "免 2 个月费用",
    },
  },
  addons: {
    "1": {
      title: "在线服务",
      semititle: "访问多人游戏",
      monthly: "+¥1/月",
      yearly: "+¥10/年",
    },
    "2": {
      title: "更大存储空间",
      semititle: "额外 1TB 云存储",
      monthly: "+¥2/月",
      yearly: "+¥20/年",
    },
    "3": {
      title: "自定义个人资料",
      semititle: "自定义个人资料主题",
      monthly: "+¥2/月",
      yearly: "+¥20/年",
    },
  },
  // 价格格式模板，用于 totalCost 的动态拼接
  priceFormat: {
    monthly: "¥{amount}/月",
    yearly: "¥{amount}/年",
  },
};
