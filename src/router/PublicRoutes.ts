import path from 'path';
import type { RouteLocationNormalized, RouteRecordRaw } from 'vue-router';

import { createRouter, createWebHistory } from 'vue-router';

const PublicRoutes = {
  path: '/auth',
  component: () => import('@/layouts/blank/BlankLayout.vue'),
  meta: {
    requiredAuth: false
  },
  children: [
    {
      name: 'Login',
      path: '/login',
      component: () => import('@/views/authentication/auth/LoginPage.vue')
    },
    {
      name: 'Error 404',
      path: '/error',
      component: () => import('@/views/errors/Error404Page.vue')
    },
    {
      // Halaman hasil scan QR aset — lihat bebas, tambah informasi wajib login.
      path: '/asset/:code',
      name: 'PublicAssetScan',
      component: () => import('@/views/public/asset/index.vue'),
      meta: {
        title: 'QR Aset',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/welding',
      name: 'PublicWeldingIndex',
      component: () => import('@/views/public/welding/index.vue'),
      meta: {
        title: 'Welding Achievement',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/welding/category/:category',
      name: 'PublicWeldingCategory',
      component: () => import('@/views/public/welding/CategoryView.vue'),
      props: true,
      meta: {
        title: 'Welding Category',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/welding/line',
      name: 'PublicWeldingLine',
      component: () => import('@/views/public/welding/LineView.vue'),
      meta: {
        title: 'Welding Line Detail',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/welding/display/:category',
      name: 'PublicWeldingDisplay',
      component: () => import('@/views/public/welding/DisplayView.vue'),
      props: true,
      meta: {
        title: 'Welding Display',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/welding/patan/:patan',
      name: 'PublicWeldingPatan',
      component: () => import('@/views/public/welding/PatanView.vue'),
      props: true,
      meta: {
        title: 'Welding by Patan',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/welding/plan',
      name: 'PublicWeldingPlan',
      component: () => import('@/views/public/welding/plan/index.vue'),
      meta: {
        title: 'Welding Auto Planning',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/welding/monitoring/:id?',
      name: 'PublicWeldingMonitoring',
      component: () => import('@/views/admin/PCD/Welding/SimulationMonitoring.vue'),
      meta: {
        title: 'GLC Welding Monitoring Display',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/Transaction/welding/glc-simulation/monitoring/:id?',
      name: 'TransactionWeldingGlcMonitoring',
      component: () => import('@/views/admin/PCD/Welding/SimulationMonitoring.vue'),
      meta: {
        title: 'GLC Welding Monitoring Display',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    // Mutasi & LKH welding kini di menu PCD (MainRoutes, dgn sidebar, 2026-09-28).
    // Path lama /welding/... tetap diarahkan supaya bookmark tidak rusak.
    // Nama route sengaja TIDAK dipakai di sini: dulu nama ganda menimpa route PCD.
    {
      path: '/welding/mutasi/:area?',
      redirect: (to: RouteLocationNormalized) => ({ path: `/pcd/welding/mutasi/${to.params.area || 'SA-ADM'}`, query: to.query })
    },
    {
      path: '/welding/lkh/:area?',
      redirect: (to: RouteLocationNormalized) => ({ path: `/pcd/welding/lkh/${to.params.area || ''}`, query: to.query })
    },
    {
      path: '/welding/master-data',
      name: 'WeldingMasterData',
      component: () => import('@/views/admin/PCD/Master/master-data.vue'),
      meta: {
        title: 'Welding Master Data',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/welding/wip-management',
      name: 'WeldingWIPManagement',
      component: () => import('@/views/public/welding/WipManagement.vue'),
      meta: {
        title: 'Welding WIP Management',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/welding/stock-queue',
      name: 'WeldingStockQueue',
      component: () => import('@/views/public/welding/plan/StockQueueView.vue'),
      meta: {
        title: 'Welding Stock Queue',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/welding/stock-queue/reconcile',
      name: 'WeldingStockQueueReconcile',
      component: () => import('@/views/public/welding/plan/ReconcileView.vue'),
      meta: {
        title: 'Welding Stock Queue - Rekonsiliasi',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/welding/stock-queue/no-movement',
      name: 'WeldingStockQueueNoMovement',
      component: () => import('@/views/public/welding/plan/NoMovementView.vue'),
      meta: {
        title: 'Welding Stock Queue - Tanpa Pergerakan',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/welding/stock-queue/audit-master',
      name: 'WeldingStockQueueAuditMaster',
      component: () => import('@/views/public/welding/plan/AuditMasterView.vue'),
      meta: {
        title: 'Welding Stock Queue - Audit Master IFPP',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/welding/ifpw',
      name: 'WeldingIfpwStock',
      component: () => import('@/views/public/welding/plan/ifpwStockView.vue'),
      meta: {
        title: 'Welding Ifpw Stock',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/welding/visualisasi-auto-plan',
      name: 'WeldingVisualisasiAutoPlan',
      component: () => import('@/views/public/welding/plan/visualisasi-auto-plan.vue'),
      meta: {
        title: 'Welding Visualisasi Auto Plan',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/pallet/monitoring-pallet',
      name: 'PublicMonitoringPallet',
      component: () => import('@/views/admin/Logistik/Pallet/Report/MonitoringPallet.vue'),
      props: true,
      meta: {
        title: 'Monitoring Pallet IN/OUT',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/pallet/monitoring-pallet-in',
      name: 'PublicMonitoringPalletIn',
      component: () => import('@/views/admin/Logistik/Pallet/Report/MonitoringPalletIn.vue'),
      props: true,
      meta: {
        title: 'Monitoring Pallet IN',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/pallet/monitoring-pallet-out',
      name: 'PublicMonitoringPalletOut',
      component: () => import('@/views/admin/Logistik/Pallet/Report/MonitoringPalletOut.vue'),
      props: true,
      meta: {
        title: 'Monitoring Pallet OUT',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
        {
      path: '/pallet/monitoring-pallet-driver',
      name: 'PublicMonitoringPalletDriver',
      component: () => import('@/views/admin/Logistik/Pallet/Report/MonitoringPalletDriver.vue'),
      props: true,
      meta: {
        title: 'Monitoring Pallet Driver',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/quality/rundown-accuracy-ifpd',
      name: 'PublicRundownAccuracy',
      component: () => import('@/views/public/quality/RundownAccuracyIFPD.vue'),
      props: true,
      meta: {
        title: 'Rundown Accuracy',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/quality/rundown-accuracy-ifpp-inhouse',
      name: 'PublicRundownAccuracyIFPPInhouse',
      component: () => import('@/views/public/quality/RundownAccuracyIFPPInhouse.vue'),
      props: true,
      meta: {
        title: 'Rundown Accuracy IFPP Inhouse',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/quality/rundown-accuracy-ifpp-outhouse',
      name: 'PublicRundownAccuracyIFPPOuthouse',
      component: () => import('@/views/public/quality/RundownAccuracyIFPPOuthouse.vue'),
      props: true,
      meta: {
        title: 'Rundown Accuracy IFPP Outhouse',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
    {
      path: '/quality/resume-inspection-part',
      name: 'PublicResumeInspectionPart',
      component: () => import('@/views/public/quality/ResumeInspectionPart.vue'),
      props: true,
      meta: {
        title: 'Resume Inspection Part',
        isPublic: true,
        layout: 'fullscreen'
      }
    },
  ]
};


export default PublicRoutes;