/**
 * 表单静态数据集中管理
 * 从 JSON 导入并附加类型，供各组件统一引用
 */
import type { ITab, IContent } from "@/types/content";
import type { IStep2, IStep3 } from "@/types/items";

import tabsData from "@/assets/data/tabs-info.json";
import contentData from "@/assets/data/content.json";
import itemsData from "@/assets/data/items.json";

/** 左侧步骤导航标签列表 */
export const TABS: ITab[] = tabsData as ITab[];

/** 每个步骤的标题 / 副标题文案 */
export const CONTENT: IContent[] = contentData as IContent[];

/** Step2 套餐列表 */
export const STEP2_ITEMS: IStep2[] = itemsData.STEP2 as IStep2[];

/** Step3 附加服务列表 */
export const STEP3_ITEMS: IStep3[] = itemsData.STEP3 as IStep3[];
