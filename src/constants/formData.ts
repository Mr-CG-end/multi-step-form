import type { ITabMeta } from "@/types/content";
import type { IAddonMeta, IPlanMeta } from "@/types/items";

// Structural data only. All user-facing copy comes from i18n resources.
export const TABS: ITabMeta[] = [
  { id: "1" },
  { id: "2" },
  { id: "3" },
  { id: "4" },
];

export const STEP2_ITEMS: IPlanMeta[] = [
  { id: "1", icon: "icon-arcade.svg" },
  { id: "2", icon: "icon-advanced.svg" },
  { id: "3", icon: "icon-pro.svg" },
];

export const STEP3_ITEMS: IAddonMeta[] = [
  { id: "1" },
  { id: "2" },
  { id: "3" },
];
