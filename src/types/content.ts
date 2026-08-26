// 页面展示内容类型
// 标题
export interface IContent {
  id: string;
  title: string;
  semititle: string;
}
// 左侧完整结构
export interface ITab {
  id: string;
  step: string;
  name: string;
}
// 左侧精简结构
export interface ITabMeta {
  id: string;
}
