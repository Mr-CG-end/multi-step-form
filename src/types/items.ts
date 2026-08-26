// 业务数据类型

export interface IPersonal {
  name: string;
  email: string;
  phone: string;
}

export interface IPlanMeta {
  id: string;
  icon: string;
}

export interface IAddonMeta {
  id: string;
}

export interface IStep2 {
  id: string;
  name: string;
  monthly: string;
  yearly: string;
  discount: string;
  icon?: string;
}

export interface IStep3 {
  id: string;
  title: string;
  monthly: string;
  yearly: string;
  semititle: string;
}
