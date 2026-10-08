import type { RouteRecordRaw } from 'vue-router';

export interface RouteMeta {
  createSideBar?: boolean;
  requiredAuth?: boolean;
  title?: string;
  icon?: string;
  permission?: {
    parent: string;
    child?: string[];
    /** Opsi pembatasan per area → permission `<parent dgn .View. → .Area.>:<AREA>` */
    areas?: string[];
  };
  /** Route boleh diakses jika pengguna memiliki minimal satu permission di daftar ini. Perubahan ini dilakukan untuk penyesuaian permission pada fitur AI*/
  permissionAnyOf?: string[];
  headers?: Array<{ title: string; icon?: string; disabled?: boolean; href?: string }>;
  /** Halaman parameter generik (views/admin/PCD/Auto/params-category.vue): grup planning_config. */
  paramsCategory?: string;
  paramsSubtitle?: string;
  paramsNote?: string;
}

export interface CustomRoute extends Omit<RouteRecordRaw, 'meta' | 'children'> {
  children?: CustomRoute[];
  meta?: RouteMeta;
}

export interface PermissionItem {
  type: string;
  title: string;
  content?: Record<string, any>;
  permission?: {
    parent: string;
  };
}
