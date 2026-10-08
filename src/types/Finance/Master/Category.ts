export interface CategoryItem {
  id: number;
  category: string;
  due_days: number;
  active: number;
}

export interface CategoryForm {
  category: string;
  due_days: number | null;
}

export interface CategoryOption {
  value: number;
  label: string;
  due_days: number;
}
