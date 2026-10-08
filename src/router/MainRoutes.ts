import type { CustomRoute, PermissionItem } from '@/types/routes';
import { AI_CHAT_ALLOWED_PARENTS } from '@/constants/AIChatPermissions';

const MainRoutes: CustomRoute = {
  path: '/main',
  meta: {
    requiredAuth: true
  },
  redirect: '/main',
  component: () => import('@/layouts/dashboard/DashboardLayout.vue'),
  children: [
    {
      name: 'Dashboard',
      path: '/',
      component: () => import('@/views/dashboard/DashboardMAJNEW.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Dashboard',
        icon: 'mdi-view-dashboard-outline'
      }
    },
    // ------------------------------------
    // ====== Start Admin Routes ========
    // ------------------------------------
    {
      path: '/admin/display-management',
      name: 'admin-display-management',
      component: () => import('@/views/admin/Admin/DisplayManagement.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Display Management',
        icon: 'mdi-monitor-dashboard',
        headers: [{ title: 'Admin', icon: 'mdi-shield-account' }],
        permission: {
          parent: 'Module.View.DisplayManagement',
          child: ['Create', 'Update']
        }
      }
    },
    // {
    //   path: '/admin/Dashboard-management',
    //   name: 'admin-Dashboard-management',
    //   component: () => import('@/views/admin/Admin/DashboardManagement.vue'),
    //   meta: {
    //     createSideBar: true,
    //     requiredAuth: true,
    //     title: 'Dashboard Management',
    //     icon: 'mdi-monitor-dashboard',
    //     headers: [{ title: 'Admin', icon: 'mdi-shield-account' }],
    //     permission: {
    //       parent: 'Module.View.DashboardManagement',
    //       child: ['Create', 'Update']
    //     }
    //   }
    // },
    {
      path: '/admin/manage-user',
      name: 'admin-manage-user',
      component: () => import('@/views/admin/Admin/ManageUser.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Manage User',
        icon: 'mdi-account-group',
        headers: [{ title: 'Admin', icon: 'mdi-shield-account' }],
        permission: {
          parent: 'Module.View.ManageUsers',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/admin/sto-event',
      name: 'admin-sto-event',
      component: () => import('@/views/admin/Admin/StoEvent.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Manage Event',
        icon: 'mdi-calendar-check',
        headers: [
          { title: 'Admin', icon: 'mdi-shield-account' },
          { title: 'STO', icon: 'mdi-clipboard-list-outline' }
        ],
        permission: {
          parent: 'Module.View.STOEvent',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/admin/sto-event/manage-user',
      name: 'admin-sto-event-manage-user',
      component: () => import('@/views/admin/Admin/StoManageUser.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Manage User STO',
        icon: 'mdi-account-key',
        headers: [
          { title: 'Admin', icon: 'mdi-shield-account' },
          { title: 'STO', icon: 'mdi-clipboard-list-outline' }
        ],
        permission: {
          parent: 'Module.View.STOManageUser',
          child: ['Create', 'Update', 'Delete']
        }
      }
    },
    {
      path: '/admin/sto-event/cancel-tag',
      name: 'admin-sto-event-cancel-tag',
      component: () => import('@/views/admin/Admin/StoCancelTag.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Cancel Tag',
        icon: 'mdi-tag-off-outline',
        headers: [
          { title: 'Admin', icon: 'mdi-shield-account' },
          { title: 'STO', icon: 'mdi-clipboard-list-outline' }
        ],
        permission: {
          parent: 'Module.View.STOCancelTag',
          child: ['Update']
        }
      }
    },
    {
      path: '/admin/sto-event/master-data',
      name: 'admin-sto-event-master-data',
      component: () => import('@/views/admin/Admin/StoMasterData.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Master Data STO',
        icon: 'mdi-database-cog-outline',
        headers: [
          { title: 'Admin', icon: 'mdi-shield-account' },
          { title: 'STO', icon: 'mdi-clipboard-list-outline' }
        ],
        permission: {
          parent: 'Module.View.STOMasterData',
          child: ['Create', 'Update', 'Delete']
        }
      }
    },
    {
      path: '/admin/sto-event/tag-list',
      name: 'admin-sto-event-tag-list',
      component: () => import('@/views/admin/Admin/StoTagList.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'List Tags',
        icon: 'mdi-tag-multiple-outline',
        headers: [
          { title: 'Admin', icon: 'mdi-shield-account' },
          { title: 'STO', icon: 'mdi-clipboard-list-outline' }
        ],
        permission: {
          parent: 'Module.View.STOTagList',
          child: ['View']
        }
      }
    },

    // ------------------------------------
    // ====== End Admin Routes ========
    // ------------------------------------
    // ─── General ─────────────────────────────────────────────────────────────
    {
      path: '/general/folder-sharing',
      name: 'approval-folder-sharing',
      component: () => import('@/views/admin/Approval/FolderSharing.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Folder Sharing',
        icon: 'mdi-folder-key-network-outline',
        headers: [{ title: 'General', icon: 'mdi-check-decagram-outline' }]
        // Sengaja tanpa `permission`: seluruh akun yang login boleh membuka dan
        // mengajukan.
      }
    },
    {
      path: '/general/audit-folder',
      name: 'approval-audit-folder',
      component: () => import('@/views/admin/Approval/AuditFolder.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Audit Folder',
        icon: 'mdi-folder-search-outline',
        headers: [{ title: 'General', icon: 'mdi-check-decagram-outline' }],
        // Hanya akun yang diberi akses admin di Manage User. Backend memeriksa
        // permission yang sama di setiap endpoint; cakupan datanya = departemen HR
        // pemakai. CRUD tetap administrator saja, bukan lewat child permission.
        permission: {
          parent: 'Module.View.AuditFolder',
          child: ['View']
        }
      }
    },

    // ------------------------------------
    // ====== Start IT Routes ========
    // ------------------------------------
    {
      path: '/it/master-barang',
      name: 'it-master-barang',
      component: () => import('@/views/admin/Admin/MasterBarang.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Master Barang',
        icon: 'mdi-package-variant-closed',
        headers: [{ title: 'IT', icon: 'mdi-laptop' }],
        permission: {
          parent: 'Module.View.MasterBarang',
          child: ['Create', 'Update', 'Delete']
        }
      }
    },
    {
      path: '/it/peminjaman-barang',
      name: 'it-peminjaman-barang',
      component: () => import('@/views/admin/Admin/PeminjamanBarang.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Peminjaman Barang',
        icon: 'mdi-clipboard-arrow-left-outline',
        headers: [{ title: 'IT', icon: 'mdi-laptop' }],
        permission: {
          parent: 'Module.View.PeminjamanBarang',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/it/master-kategori-barang',
      name: 'it-master-kategori-barang',
      component: () => import('@/views/admin/Admin/MasterKategori.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Master Kategori Barang',
        icon: 'mdi-shape-outline',
        headers: [{ title: 'IT', icon: 'mdi-laptop' }],
        permission: {
          parent: 'Module.View.MasterBarang',
          child: ['Create', 'Update', 'Delete']
        }
      }
    },
    // {
    //   path: '/it/internal-memo',
    //   name: 'it-internal-memo',
    //   component: () => import('@/views/admin/Admin/InternalMemo.vue'),
    //   meta: {
    //     createSideBar: true,
    //     requiredAuth: true,
    //     title: 'Internal Memo',
    //     icon: 'mdi-file-document-multiple-outline',
    //     headers: [{ title: 'IT', icon: 'mdi-laptop' }],
    //     permission: {
    //       parent: 'Module.View.InternalMemo',
    //       child: ['Create', 'Update', 'Delete']
    //     }
    //   }
    // },
    // ------------------------------------
    // ====== End IT Routes ========
    // ------------------------------------

    // ─── HRD ──────────────────────────────────────────────────────────────────
    // ── Submenu 1: Transaction (Urutan Pertama)
    {
      path: '/hrd/absensi/import-mapping',
      name: 'hrd-absensi-import-mapping',
      component: () => import('@/views/admin/HRD/ImportMapping.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Import Mapping',
        icon: 'mdi-calendar-import',
        headers: [{ title: 'HRD', icon: 'mdi-account-hard-hat' }, { title: 'Transaction' }],
        permission: {
          parent: 'Module.View.Absensi',
          child: ['View']
        }
      }
    },
    // ── Submenu 2: Report
    {
      path: '/hrd/absensi/mapped',
      name: 'hrd-absensi-mapped',
      component: () => import('@/views/admin/HRD/Absensi/MappedView.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Mapped',
        icon: 'mdi-calendar-check',
        headers: [{ title: 'HRD', icon: 'mdi-account-hard-hat' }, { title: 'Report' }],
        permission: {
          parent: 'Module.View.Absensi.mapped',
          child: ['View']
        }
      }
    },
    {
      path: '/hrd/absensi/unmapped',
      name: 'hrd-absensi-unmapped',
      component: () => import('@/views/admin/HRD/Absensi/UnmappedView.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Unmapped',
        icon: 'mdi-calendar-remove',
        headers: [{ title: 'HRD', icon: 'mdi-account-hard-hat' }, { title: 'Report' }],
        permission: {
          parent: 'Module.View.Absensi',
          child: ['View']
        }
      }
    },
    {
      path: '/hrd/absensi/henkaten',
      name: 'hrd-absensi-henkaten',
      component: () => import('@/views/admin/HRD/Absensi/HenkatenView.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Laporan Henkaten',
        icon: 'mdi-alert-circle-outline',
        headers: [{ title: 'HRD', icon: 'mdi-account-hard-hat' }, { title: 'Report' }],
        permission: {
          parent: 'Module.View.Absensi',
          child: ['View']
        }
      }
    },
    // ------------------------------------
    // ====== End HRD Routes ========
    // ------------------------------------

    // ------------------------------------
    // ====== Start Quality Routes =======
    // ------------------------------------
    {
      path: '/quality/report/repair-reject-akurasi',
      name: 'quality-report-repair-reject-akurasi',
      component: () => import('@/views/admin/PCD/Stamping/ReportPareto.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Repair Reject Akurasi',
        icon: 'mdi-chart-bar',
        headers: [{ title: 'Quality', icon: 'mdi-content-paste' }, { title: 'Report' }],
        permission: {
          parent: 'Module.View.ReportParetoQuality',
          child: ['Quality']
        }
      }
    },
    // ------------------------------------
    // ====== End Quality Routes ========
    // ------------------------------------

    // ------------------------------------
    // ====== Start Logistik Routes ========
    // ------------------------------------
    {
      path: '/logistik/master-data/master-strength',
      name: 'logistik-master-data-master-strength',
      component: () => import('@/views/admin/Logistik/MasterData/MasterStrength.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Master Strength',
        icon: 'mdi-clipboard-list-outline',
        headers: [
          { title: 'Logistik', icon: 'mdi-truck-delivery', disabled: false, href: '#' },
          { title: 'Master Data', disabled: false, href: '#' }
        ],
        permission: {
          parent: 'Logistik.View.MasterStrength',
          child: ['Update']
        }
      }
    },
    {
      path: '/logistik/master-data/master-cycle',
      name: 'logistik-master-data-master-cycle',
      component: () => import('@/views/admin/Logistik/MasterData/MasterCycle.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Master Cycle',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'Master Data' }],
        permission: {
          parent: 'Logistik.View.MasterCycle',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/logistik/master-data/goods',
      name: 'logistik-master-data-goods',
      component: () => import('@/views/admin/Logistik/MasterData/Goods.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Goods',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'Master Data' }],
        permission: {
          parent: 'Logistik.View.MasterConsumable',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/logistik/master-data/budgets',
      name: 'logistik-master-data-budgets',
      component: () => import('@/views/admin/Logistik/MasterData/Budget.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Budgets',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'Master Data' }],
        permission: {
          parent: 'Logistik.View.MasterBudget',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/master-data/incoming-consumable',
      name: 'logistik-master-data-incoming',
      component: () => import('@/views/admin/Logistik/MasterData/Incoming.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Incoming',
        icon: 'mdi-package-down',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'Master Data' }],
        permission: {
          parent: 'Logistik.View.IncomingConsumable',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/master-data/master-combine-rfid-pallet',
      name: 'logistik-master-combine-rfid-pallet',
      component: () => import('@/views/admin/Logistik/MasterData/MasterCombine.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Combine RFID Pallet',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'Master Data' }],
        permission: {
          parent: 'Logistik.View.MasterCombine',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/master-data/master-rfid-pallet',
      name: 'logistik-master-rfid-pallet',
      component: () => import('@/views/admin/Logistik/MasterData/MasterPalletRfid.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Master Pallet & RFID',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'Master Data' }],
        permission: {
          parent: 'Logistik.View.MasterPallet',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/master-data/master-driver',
      name: 'logistik-master-driver',
      component: () => import('@/views/admin/Logistik/MasterData/MasterDriver.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Master Driver',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'Master Data' }],
        permission: {
          parent: 'Logistik.View.MasterDriver',
          child: ['Create', 'Update']
        }
      }
    },
    // {
    //   path: '/logistik/pallet/transaction/trip-driver',
    //   name: 'logistik-trip-driver',
    //   component: () => import('@/views/admin/Logistik/Pallet/Transaction/DriverTrip.vue'),
    //   meta: {
    //     createSideBar: true,
    //     requiredAuth: true,
    //     title: 'Trip Delivery',
    //     icon: 'mdi-clipboard-list-outline',
    //     headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'Pallet' }, { title: 'Transaction' }],
    //     permission: {
    //       parent: 'Logistik.View.TripDelivery',
    //       child: ['Create', 'Update']
    //     }
    //   }
    // },
    {
      path: '/logistik/pallet/transaction/scan-ok-pallet',
      name: 'logistik-scan-ok-pallet',
      component: () => import('@/views/admin/Logistik/Pallet/Transaction/ScanOkPallet.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'Scan Ok Pallet',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'Pallet' }],
        permission: {
          parent: 'Logistik.View.ScanOkPallet'
        }
      }
    },
    {
      path: '/logistik/pallet/transaction/scan-in-pallet',
      name: 'logistik-scan-in-pallet',
      component: () => import('@/views/admin/Logistik/Pallet/Transaction/ScanInDriver.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Scan In Pallet',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'Pallet' }, { title: 'Transaction' }],
        permission: {
          parent: 'Logistik.View.ScanInPallet',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/logistik/pallet/transaction/scan-out-pallet',
      name: 'logistik-scan-out-pallet',
      component: () => import('@/views/admin/Logistik/Pallet/Transaction/ScanPalletOut.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Scan Preparation',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'Pallet' }, { title: 'Transaction' }],
        permission: {
          parent: 'Logistik.View.ScanOutPallet',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/logistik/pallet/transaction/delivery-driver',
      name: 'logistik-delivery-driver',
      component: () => import('@/views/admin/Logistik/Pallet/Transaction/DeliveryDriver.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Scan Out Pallet',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'Pallet' }, { title: 'Transaction' }],
        permission: {
          parent: 'Logistik.View.DeliveryDriver',
          child: ['Create', 'Update']
        }
      }
    },    
    {
      path: '/logistik/pallet/transaction/scan-out-pallet-adm',
      name: 'logistik-scan-out-pallet-adm',
      component: () => import('@/views/admin/Logistik/Pallet/Transaction/ScanPalletOutAdm.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'Scan Out Pallet',
        icon: 'mdi-clipboard-list-outline'
      }
    },
    {
      path: '/logistik/pallet/transaction/scan-out-pallet-hmmi',
      name: 'logistik-scan-out-pallet-hmmi',
      component: () => import('@/views/admin/Logistik/Pallet/Transaction/ScanPalletOutGroup2.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'Scan Out Pallet',
        icon: 'mdi-clipboard-list-outline'
      }
    },
    {
      path: '/logistik/pallet/transaction/scan-out-pallet-tmmin',
      name: 'logistik-scan-out-pallet-tmmin',
      component: () => import('@/views/admin/Logistik/Pallet/Transaction/ScanPalletOutTmmin.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'Scan Out Pallet',
        icon: 'mdi-clipboard-list-outline'
      }
    },
    {
      path: '/logistik/pallet/transaction/scan-out-pallet-polybox',
      name: 'logistik-scan-out-pallet-polybox',
      component: () => import('@/views/admin/Logistik/Pallet/Transaction/ScanPalletPolybox.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'Scan Out Pallet',
        icon: 'mdi-clipboard-list-outline'
      }
    },
    {
      path: '/logistik/pallet/report/monitoring-worksop-pallet',
      name: 'logistik-monitoring-workshop-pallet',
      component: () => import('@/views/admin/Logistik/Pallet/Report/MonitoringWorkshop.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Monitoring Workshop Pallet',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'Pallet' }, { title: 'Report' }],
        permission: {
          parent: 'Logistik.View.MonitoringWorkshopPallet',
          child: ['View', 'Update']
        }
      }
    },
    {
      path: '/logistik/pallet/report/combine-pallet',
      name: 'logistik-report-combine-pallet',
      component: () => import('@/views/admin/Logistik/Pallet/Report/CombinePallet.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Resume Pallet',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'Pallet' }, { title: 'Report' }],
        permission: {
          parent: 'Logistik.View.CombinePallet',
          child: ['Create', 'Update']
        }
      }
    },
    // {
    //   path: '/logistik/pallet/report/resume-pallet',
    //   name: 'logistik-report-resume-pallet',
    //   component: () => import('@/views/admin/Logistik/Pallet/Report/ResumePallet.vue'),
    //   meta: {
    //     createSideBar: true,
    //     requiredAuth: true,
    //     title: 'Graph Pallet',
    //     icon: 'mdi-clipboard-list-outline',
    //     headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'Pallet' }, { title: 'Report' }],
    //     permission: {
    //       parent: 'Logistik.View.RfidPallet',
    //       child: ['Create', 'Update']
    //     }
    //   }
    // },
    {
      path: '/logistik/ifp/transaction/rundown-trial',
      name: 'rundown-trial',
      component: () => import('@/views/admin/Logistik/IFP/Transaction/RundownTrial.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Rundown',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'IFP' }, { title: 'Transaction' }],
        permission: {
          parent: 'Logistik.View.RundownTrial',
          child: ['Download', 'Update', 'Create']
        }
      }
    },
    {
      path: '/logistik/IFP/transaction/print-barcode-pallet',
      name: 'logistik-ifp-transaction-print-barcode-pallet',
      component: () => import('@/views/admin/Logistik/IFP/Transaction/PrintBarcodePallet.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Print Barcode Pallet',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'IFP' }, { title: 'Transaction' }],
        permission: {
          parent: 'Logistik.View.PrintBarcodePallet',
          child: ['Create']
        }
      }
    },
    {
      path: '/logistik/IFP/transaction/master-customer',
      name: 'logistik-ifp-transaction-master-customer',
      component: () => import('@/views/admin/Logistik/IFP/Transaction/MasterCustomer.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Master Customer',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'IFP' }, { title: 'Transaction' }],
        permission: {
          parent: 'Logistik.View.MasterCustomer',
          child: ['Create', 'Update', 'Delete']
        }
      }
    },
    {
      path: '/logistik/IFP/transaction/barcode-customer',
      name: 'logistik-ifp-transaction-barcode-customer',
      component: () => import('@/views/admin/Logistik/IFP/Transaction/BarcodeCustomer.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Barcode Customer',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'IFP' }, { title: 'Transaction' }],
        permission: {
          parent: 'Logistik.View.BarcodeCustomer',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/logistik/IFP/report/scanned-sto',
      name: 'logistik-ifp-report-scanned-sto',
      component: () => import('@/views/admin/Logistik/IFP/Report/ScannedSTO.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Scanned STO',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'IFP' }, { title: 'Report' }],
        permission: {
          parent: 'Logistik.View.ReportScannedSto',
          child: ['View']
        }
      }
    },
    {
      path: '/logistik/ifp/inhouse/scanned-tag-ifp',
      name: 'scanned-tag-ifp',
      component: () => import('@/views/admin/Logistik/IFP/Report/ScannedTagOk.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Scanned Tag OK',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'IFP' }, { title: 'Report' }],
        permission: {
          parent: 'Logistik.View.ScannedTagIfp',
          child: ['View', 'Update']
        }
      }
    },
    {
      path: '/logistik/ifp/inhouse/list-scan-shipping',
      name: 'list-scan-shipping',
      component: () => import('@/views/admin/Logistik/IFP/Report/ListScanShipping.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'List Scan Shipping',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'IFP' }, { title: 'Report' }],
        permission: {
          parent: 'Logistik.View.ListScanShipping',
          child: ['View', 'Update']
        }
      }
    },
    {
      path: '/logistik/ifp/inhouse/shipping-all',
      name: 'shipping-all',
      component: () => import('@/views/admin/Logistik/IFP/Report/MierukaShippingAll.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Shipping All',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'IFP' }, { title: 'Report' }],
        permission: {
          parent: 'Logistik.View.ShippingAll',
          child: ['View', 'Update', 'Create']
        }
      }
    },
    // {
    //   path: '/logistik/ifp/transaction/Mutation',
    //   name: 'logistik-ifp-mutation',
    //   component: () => import('@/views/admin/Logistik/IFP/Transaction/Mutation.vue'),
    //   meta: {
    //     createSideBar: true,
    //     requiredAuth: true,
    //     title: 'Mutation', // Nama menu di sidebar
    //     icon: 'mdi-swap-horizontal', // Ganti dengan icon yang sesuai di project Anda
    //     headers: [
    //       { title: 'Logistik', icon: 'mdi-swap-horizontal' },
    //       { title: 'IFP' },
    //       { title: 'Transaction' }
    //     ],
    //     permission: {
    //       parent: 'Module.View.StrengthStandard',
    //       child: ['Create', 'Update']
    //     }
    //   }
    // },
    {
      path: '/logistik/ifp/transaction/strength-standard',
      name: 'logistik-ifp-strength-standard',
      component: () => import('@/views/admin/Logistik/IFP/Transaction/StrengthStandardPage.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Strength Standard', // Nama menu di sidebar
        icon: 'mdi-weight-lifter', // Ganti dengan icon yang sesuai di project Anda
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'IFP' }, { title: 'Transaction' }],
        permission: {
          parent: 'Module.View.StrengthStandard',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/logistik/ifp/transaction/Mutation',
      name: 'logistik-ifp-mutation',
      component: () => import('@/views/admin/Logistik/IFP/Transaction/Mutation.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Mutation', // Nama menu di sidebar
        icon: 'mdi-weight-lifter', // Ganti dengan icon yang sesuai di project Anda
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'IFP' }, { title: 'Transaction' }],
        permission: {
          parent: 'Module.View.StrengthStandard',
          child: ['Create', 'Update']
        }
      }
    },
    // {
    //   path: '/logistik/ifp/transaction/mutation-table',
    //   name: 'logistik-ifp-mutation-table',
    //   component: () => import('@/views/admin/Logistik/IFP/Transaction/MutationTable.vue'),
    //   meta: {
    //     createSideBar: true,
    //     requiredAuth: true,
    //     title: 'Mutation Table', // Nama menu di sidebar
    //     icon: 'mdi-table-large',
    //     headers: [
    //       { title: 'Logistik', icon: 'mdi-truck-delivery' },
    //       { title: 'IFP' },
    //       { title: 'Transaction' }
    //     ],
    //     permission: {
    //       parent: 'Module.View.StrengthStandard',
    //       child: ['View']
    //     }
    //   }
    // },
    {
      path: '/logistik/IRM/transaction/upload-rundown',
      name: 'logistik-irm-transaction-upload-rundown',
      component: () => import('@/views/admin/Logistik/IRM/Transaction/UploadRundownByExcel.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Upload Rundown',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'IRM' }, { title: 'Transaction' }],
        permission: {
          parent: 'Logistik.View.TransactionRundown',
          child: ['Download']
        }
      }
    },
    {
      path: '/logistik/IRM/transaction/shortage-stock',
      name: 'logistik-irm-transaction-shortage-stock',
      component: () => import('@/views/admin/Logistik/IRM/Transaction/ShortageStock.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Shortage Stock',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'IRM' }, { title: 'Transaction' }],
        permission: {
          parent: 'Logistik.View.ShortageStock',
          child: ['View']
        }
      }
    },
    {
      path: '/logistik/IRM/transaction/input-qty-supply',
      name: 'logistik-irm-transaction-supply-material',
      component: () => import('@/views/admin/Logistik/IRM/Transaction/SupplyMaterial.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Supply Material',
        icon: 'mdi-clipboard-edit-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'IRM' }, { title: 'Transaction' }],
        permission: {
          parent: 'Logistik.View.InputQtySupplyIrm',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/logistik/WIP/transaction/upload-rundown-inhouse',
      name: 'logistik-wip-transaction-upload-rundown-inhouse',
      component: () => import('@/views/admin/Logistik/WIP/Transaction/UploadRundownInhouse.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Upload Rundown Inhouse',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'WIP' }, { title: 'Transaction' }],
        permission: {
          parent: 'Logistik.View.RundownIrmInhouse',
          child: ['Download']
        }
      }
    },
    {
      path: '/logistik/WIP/transaction/transaction',
      name: 'logistik-wip-transaction-transaction',
      component: () => import('@/views/errors/UnderConstruction.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Transaction',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'WIP' }, { title: 'Transaction' }],
        permission: {
          parent: 'Logistik.View.TransactionWip',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/logistik/WIP/transaction/mutation',
      name: 'logistik-wip-transaction-mutation',
      component: () => import('@/views/errors/UnderConstruction.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Mutation',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'WIP' }, { title: 'Transaction' }],
        permission: {
          parent: 'Logistik.View.TransactionMutation',
          child: []
        }
      }
    },
    {
      path: '/logistik/WIP/transaction/monitoring',
      name: 'logistik-wip-transaction-monitoring',
      component: () => import('@/views/admin/Logistik/WIP/Transaction/Monitoring.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Monitoring',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'WIP' }, { title: 'Transaction' }],
        permission: {
          parent: 'Logistik.View.TransactionMonitoring',
          child: ['Download']
        }
      }
    },
    {
      path: '/logistik/WIP/transaction/upload-rundown-outhouse',
      name: 'logistik-wip-transaction-upload-rundown-outhouse',
      component: () => import('@/views/admin/Logistik/WIP/Transaction/UploadRundownOuthouse.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Upload Rundown Outhouse',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'WIP' }, { title: 'Transaction' }],
        permission: {
          parent: 'Logistik.View.RundownWipOuthouse',
          child: ['Download']
        }
      }
    },
    {
      path: '/logistik/IFPP/transaction/rundown-ifpp-inhouse',
      name: 'logistik-ifpp-transaction-rundown-ifpp-inhouse',
      component: () => import('@/views/admin/Logistik/IFPP/Transaction/RundownInhouse.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Rundown IFPP Inhouse',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'IFPP' }, { title: 'Transaction' }],
        permission: {
          parent: 'Logistik.View.RundownIFPPInhouse',
          child: ['Download']
        }
      }
    },
    {
      path: '/logistik/IFPP/transaction/rundown-ifpp-outhouse',
      name: 'logistik-ifpp-transaction-rundown-ifpp-outhouse',
      component: () => import('@/views/admin/Logistik/IFPP/Transaction/RundownOuthouse.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Rundown IFPP Outhouse',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'IFPP' }, { title: 'Transaction' }],
        permission: {
          parent: 'Logistik.View.RundownIFPPOuthouse',
          child: ['Download']
        }
      }
    },
    {
      path: '/logistik/IFPP/report/scan-history',
      name: 'logistik-ifpp-report-scan-history',
      component: () => import('@/views/admin/Logistik/IFPP/Report/ScanHistory.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Scan History',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'IFPP' }, { title: 'Report' }],
        permission: {
          parent: 'Logistik.View.ScanHistoryInhouse',
          child: ['Download']
        }
      }
    },
    {
      path: '/logistik/IFPP/report/scan-history-inhouse',
      name: 'logistik-ifpp-report-scan-history-inhouse',
      component: () => import('@/views/admin/Logistik/IFPP/Report/ScanHistoryInhouse.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'Scan History Inhouse',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'IFPP' }, { title: 'Report' }],
        permission: {
          parent: 'Logistik.View.ScanHistoryInhouse',
          child: ['Download']
        }
      }
    },
    {
      path: '/logistik/IFPP/report/scan-history-outhouse',
      name: 'logistik-ifpp-report-scan-history-outhouse',
      component: () => import('@/views/admin/Logistik/IFPP/Report/ScanHistoryOuthouse.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'Scan History Outhouse',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Logistik', icon: 'mdi-truck-delivery' }, { title: 'IFPP' }, { title: 'Report' }],
        permission: {
          parent: 'Logistik.View.ScanHistoryOuthouse',
          child: ['Download']
        }
      }
    },
  
   // ------------------------------------
    // ======== Marketing Routes ==========
    // ------------------------------------
    // ==================== TRANSACTION MENU ====================
    {
      name: 'working-day',
      path: '/mkt/transaction/working-day',
      component: () => import('@/views/admin/Marketing/Monthly/WorkingDay.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Working Day',
        icon: 'mdi-calendar-check-outline',
        headers: [{ title: 'Marketing', icon: 'mdi-briefcase-outline' }, { title: 'Transaction' }],
        permission: {
          parent: 'Marketing.View.Monthly.WorkingDay',
          child: ['View', 'Create']
        }
      }
    },

    // ==================== REPORT MENU ====================
    {
      path: '/mkt/report/upload-mdfo',
      name: 'uploadMdfo',
      component: () => import('@/views/admin/Marketing/Monthly/UploadMdfo.vue'),
      meta: {
        createSideBar: true,
        title: 'Upload MDFO',
        icon: 'mdi-cube-outline',
        headers: [{ title: 'Marketing', icon: 'mdi-briefcase-outline' }, { title: 'Transaction' }],
        permission: {
          parent: 'Marketing.View.Monthly.UploadMdfo',
          child: ['View', 'Create', 'Update', 'Delete', 'Download']
        }
      }
    },
    {
      name: 'upload-so',
      path: '/mkt/report/upload-so',
      component: () => import('@/views/admin/Marketing/Daily/UploadSo.vue'),
      meta: {
        createSideBar: true,
        title: 'Upload SO',
        icon: 'mdi-cube-outline',
        headers: [{ title: 'Marketing', icon: 'mdi-briefcase-outline' }, { title: 'Transaction' }],
        permission: {
          parent: 'Marketing.View.Daily.UploadSO',
          child: ['View', 'Create', 'Update', 'Delete', 'Download']
        }
      }
    },
      // {
    //   name: 'surat-jalan-kembali',
    //   path: '/mkt/report/surat-jalan-kembali',
    //   component: () => import('@/views/admin/Marketing/Daily/SuratJalanKembali.vue'),
    //   meta: {
    //     createSideBar: true,
    //     title: 'Surat Jalan Kembali',
    //     icon: 'mdi-cube-outline',
    //     headers: [{ title: 'Marketing', icon: 'mdi-briefcase-outline' }, { title: 'Transaction' }],
    //     permission: {
    //       parent: 'Marketing.View.Daily.SuratJalanKembali',
    //       child: ['View']
    //     }
    //   }
    // },
    {
      name: 'budgeting-hmmi-material',
      path: '/mkt/report/budgeting/hmmi/material',
      component: () => import('@/views/admin/Marketing/Monthly/Budgeting/HMMI/BudgetMatHMMI.vue'),
      meta: {
        createSideBar: true,
        title: 'Budget Material',
        icon: 'mdi-cube-outline',
        headers: [{ title: 'Marketing', icon: 'mdi-briefcase-outline' }, { title: 'Report' }],
        permission: {
          parent: 'Marketing.View.Daily.BudgetMaterial',
          child: ['View', 'Create', 'Update', 'Delete', 'Download']
        }
      }
    },
    {
      name: 'budgeting-hmmi-sales',
      path: '/mkt/report/budgeting/hmmi/sales',
      component: () => import('@/views/admin/Marketing/Monthly/Budgeting/HMMI/BudgetSoHMMI.vue'),
      meta: {
        createSideBar: true,
        title: 'Budget Sales Amount',
        icon: 'mdi-currency-usd',
        headers: [{ title: 'Marketing', icon: 'mdi-briefcase-outline' }, { title: 'Report' }],
        permission: {
          parent: 'Marketing.View.Daily.BudgetSalesAmount',
          child: ['View', 'Create', 'Update', 'Download']
        }
      }
    },
    {
      path: '/mkt/report/mdfo-so',
      name: 'mdfo-so',
      component: () => import('@/views/admin/Marketing/Monthly/Mdfo.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'MDFO-SO',
        icon: 'mdi-chart-bar',
        headers: [{ title: 'Marketing', icon: 'mdi-briefcase-outline' }, { title: 'Report' }],
        permission: {
          parent: 'Marketing.View.Monthly.Mdfo',
          child: ['View', 'Update', 'Create']
        }
      }
    },
    {
      path: '/mkt/report/quotation-contract',
      name: 'quotation-contract',
      component: () => import('@/views/admin/Marketing/Monthly/QuotContract.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Quotation-Contract',
        icon: 'mdi-file-document-outline',
        headers: [{ title: 'Marketing', icon: 'mdi-briefcase-outline' }, { title: 'Report' }],
        permission: {
          parent: 'Marketing.View.Monthly.QuotContract',
          child: ['View', 'Update', 'Create']
        }
      }
    },
    {
      path: '/mkt/report/mdfo-analisis',
      name: 'mdfo-analisis',
      component: () => import('@/views/admin/Marketing/Monthly/MdfoAnalisis.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'MDFO Analysis',
        icon: 'mdi-chart-timeline-variant',
        headers: [{ title: 'Marketing', icon: 'mdi-briefcase-outline' }, { title: 'Report' }],
        permission: {
          parent: 'Marketing.View.Monthly.MdfoAnalisis',
          child: ['View', 'Update', 'Create']
        }
      }
    },
    {
      path: '/mkt/report/annual-report',
      name: 'daily-budgeting-hmmi-material',
      component: () => import('@/views/errors/UnderConstruction.vue'),
      meta: {
        createSideBar: true,
        title: 'Check Report',
        icon: 'mdi-cube-outline',
        headers: [{ title: 'Marketing', icon: 'mdi-briefcase-outline' }, { title: 'Report' }],
        permission: {
          parent: 'Marketing.View.Daily.AnnualReport',
          child: ['View', 'Download']
        }
      }
    },
    // ------------------------------------
    // ====== End Marketing Routes ========
    // ------------------------------------

    // ------------------------------------
    // ========= Start PCD Routes =========
    // ------------------------------------
    {
      path: '/pcd/kanban/print-kanban',
      name: 'pcd-print-kanban',
      component: () => import('@/views/admin/PCD/Kanban/PrintKanban.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Print Kanban',
        icon: 'mdi-printer',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Kanban' }],
        permission: {
          parent: 'Module.View.PrintKanban',
          child: ['Create']
        }
      }
    },
    {
      path: '/pcd/kanban/print-kanban/print-preview-kanban',
      name: 'pcd-print-kanban-preview-kanban',
      component: () => import('@/views/admin/PCD/Kanban/PreviewPrintKanban.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true
      }
    },
    {
      path: '/pcd/kanban/scan-ekanban',
      name: 'pcd-scan-barcode-ekanban',
      component: () => import('@/views/admin/PCD/Kanban/ScanEKanban.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Scan E - Kanban',
        icon: 'mdi-barcode-scan',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Kanban' }],
        permission: {
          parent: 'Transaction.View.ScanBarcodeEkanban',
          child: ['Create', 'Update', 'Delete']
        }
      }
    },
    {
      path: '/pcd/kanban/scan-kanban/in',
      name: 'pcd-scan-kanban-in',
      component: () => import('@/views/admin/PCD/Kanban/ScanKanbanIN.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Scan Kanban (IN)',
        icon: 'mdi-barcode-scan',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Kanban' }],
        permission: {
          parent: 'Module.View.ScanKanbanIn',
          child: ['Create']
        }
      }
    },
    {
      path: '/pcd/kanban/scan-kanban/out',
      name: 'pcd-scan-kanban-out',
      component: () => import('@/views/admin/PCD/Kanban/ScanKanbanOUT.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Scan Kanban (OUT)',
        icon: 'mdi-barcode-scan',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Kanban' }],
        permission: {
          parent: 'Module.View.ScanKanbanOut',
          child: ['Create']
        }
      }
    },
    {
      path: '/pcd/kanban/scan-kanban-sto',
      name: 'report-scan-kanban-sto',
      component: () => import('@/views/admin/PCD/Kanban/ScanKanbanSTO.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Scan Kanban STO',
        icon: 'mdi-barcode-scan',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Kanban' }],
        permission: {
          parent: 'Module.View.ScanKanbanSTO',
          child: ['Create', 'Update']
        }
      }
    },

    {
      path: '/pcd/master/master-andon-welding',
      name: 'master-andon-welding',
      component: () => import('@/views/admin/PCD/Master/MasterDataAndonWelding.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Master Andon Welding',
        icon: 'mdi-form-select',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Master' }],
        permission: {
          parent: 'Module.View.AndonWelding',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/pcd/master/dedicated-machine',
      name: 'pcd-master-dedicated-machine',
      component: () => import('@/views/admin/PCD/Master/DedicatedMachine.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Master Dedicated Part & Machine',
        icon: 'mdi-robot-industrial',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Master' }],
        permission: {
          parent: 'Module.View.DataKanban',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/pcd/master/master-data-kanban',
      name: 'master-data-kanban',
      component: () => import('@/views/admin/PCD/Master/MasterDataKanban.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Master Data Kanban',
        icon: 'mdi-form-select',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Master' }],
        permission: {
          parent: 'Module.View.DataKanban',
          child: ['Create', 'Update']
        }
      }
    },

    {
      path: '/pcd/master/machine-press',
      name: 'master-machine-press',
      component: () => import('@/views/admin/PCD/Master/MachinePress.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Master Mesin Press',
        icon: 'mdi-cog-outline',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Master' }],
        permission: {
          parent: 'Master.View.MachinePress',
          child: ['Create', 'Update', 'Delete']
        }
      }
    },
    {
      path: '/pcd/master/part-andon',
      name: 'master-part',
      component: () => import('@/views/admin/PCD/Master/MasterPartAndon.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Master Part Andon',
        icon: 'mdi-form-select',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Master' }],
        permission: {
          parent: 'Module.View.PartAndon',
          child: ['Create', 'Update']
        }
      }
    },

    {
      path: '/pcd/stamping/patan',
      name: 'pcd-stamping-patan',
      component: () => import('@/views/admin/PCD/Stamping/Patan.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Patan',
        icon: 'mdi-form-select',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Stamping' }],
        permission: {
          parent: 'Module.View.Patan',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/pcd/stamping/patan/print-preview',
      name: 'print-tagOK-stamping-patan',
      component: () => import('@/views/admin/PCD/Stamping/PreviewTagOkPress.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true
      }
    },
    {
      path: '/pcd/stamping/weekly-achievement-stamping',
      name: 'stamping-weekly-achievement-stamping',
      component: () => import('@/views/admin/PCD/Stamping/WeeklyAchievement.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Weekly Achievement',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Stamping' }],
        permission: {
          parent: 'Module.View.AchievementStampingGraph',
          child: ['PCD']
        }
      }
    },

    {
      path: '/pcd/welding/weekly-achievement-welding',
      name: 'welding-weekly-achievement-welding',
      component: () => import('@/views/admin/PCD/Welding/WeeklyAchievement.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Weekly Achievement',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Welding' }],
        permission: {
          parent: 'Module.View.AchievementWeldingGraph',
          child: ['PCD']
        }
      }
    },
    {
      path: '/pcd/welding/schedule',
      name: 'master-welding-schedule',
      component: () => import('@/views/admin/PCD/Welding/WeldingSchedule.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Welding Schedule',
        icon: 'mdi-form-select',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Welding' }],
        permission: {
          parent: 'Module.View.WeldingSchedule',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/pcd/welding/schedule/print-preview',
      name: 'print-tagOK-welding-schedule',
      component: () => import('@/views/admin/PCD/Welding/PreviewTagOKWeldSched.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true
      }
    },
    {
      path: '/pcd/welding/mutasi',
      name: 'PcdWeldingMutasiMenu',
      redirect: { name: 'PlanningProduksiAreaWelding', params: { area: 'SA-ADM' } },
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Mutasi Bulanan',
        icon: 'mdi-swap-horizontal',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Welding' }],
        permission: {
          parent: 'Module.View.MutasiWelding',
          child: ['PCD']
        }
      }
    },
    {
      // Mutasi Bulanan — FP dan WIP dalam 1 tabel (kolom TIPE). ?sheet=wip = filter TIPE WIP (bookmark lama).
      path: '/pcd/welding/mutasi/:area',
      name: 'PlanningProduksiAreaWelding',
      component: () => import('@/views/admin/PCD/Welding/mutasi-unified.vue'),
      meta: {
        requiredAuth: true,
        title: 'Mutasi Bulanan'
      }
    },
    {
      // Backward-compat: bookmark lama Mutasi WIP → tabel gabungan, filter TIPE = WIP.
      path: '/pcd/welding/mutasi-wip/:area',
      redirect: (to) => ({ name: 'PlanningProduksiAreaWelding', params: to.params, query: { sheet: 'wip' } }),
      meta: { requiredAuth: true }
    },
    {
      // PCD › Auto (2026-09-25) — parameter sistem auto-planning dikumpulkan di satu grup.
      // Params Mutasi = Aturan DN (global + per customer), Parameter Planning, Log Welding.
      path: '/pcd/auto/params-mutasi',
      name: 'PcdAutoParamsMutasi',
      component: () => import('@/views/admin/PCD/Auto/params-mutasi.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Params Mutasi',
        icon: 'mdi-tune',
        headers: [
          { title: 'PCD', icon: 'mdi-content-paste' },
          { title: 'Auto', icon: 'mdi-robot-outline' }
        ],
        permission: {
          parent: 'Module.View.MutasiWelding',
          child: ['PCD']
        }
      }
    },
    {
      // Default GLC Welding (planning_config glc_welding) — dipakai saat membuat periode baru.
      path: '/pcd/auto/params-glc-welding',
      name: 'PcdAutoParamsGlcWelding',
      component: () => import('@/views/admin/PCD/Auto/params-category.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Params GLC Welding',
        icon: 'mdi-robot-industrial',
        headers: [
          { title: 'PCD', icon: 'mdi-content-paste' },
          { title: 'Auto', icon: 'mdi-robot-outline' }
        ],
        paramsCategory: 'glc_welding',
        paramsSubtitle: 'Nilai default saat membuat periode GLC Robot Sub Assy baru',
        paramsNote: 'Berlaku untuk periode GLC baru. Periode yang sudah ada tetap memakai parameternya sendiri.',
        permission: {
          parent: 'Transaction.View.GlcSubAssyWelding',
          child: ['PCD']
        }
      }
    },
    {
      // Default GLC Press (planning_config glc_press) — dipakai saat membuat simulasi baru.
      path: '/pcd/auto/params-glc-press',
      name: 'PcdAutoParamsGlcPress',
      component: () => import('@/views/admin/PCD/Auto/params-category.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Params GLC Press',
        icon: 'mdi-hammer-wrench',
        headers: [
          { title: 'PCD', icon: 'mdi-content-paste' },
          { title: 'Auto', icon: 'mdi-robot-outline' }
        ],
        paramsCategory: 'glc_press',
        paramsSubtitle: 'Nilai default saat membuat simulasi GLC Press baru',
        paramsNote: 'Berlaku untuk simulasi GLC Press baru. Simulasi yang sudah ada tetap memakai parameternya sendiri.',
        permission: {
          parent: 'Transaction.View.GlcStamping',
          child: ['PCD']
        }
      }
    },
    {
      // Audit Log Welding kini tab "Log Welding" di Params Mutasi — bookmark lama dialihkan.
      path: '/pcd/welding/audit-log',
      name: 'WeldingAuditLog',
      redirect: { name: 'PcdAutoParamsMutasi', query: { tab: 'log' } },
      meta: { requiredAuth: true }
    },
    {
      // Aturan #7-lanjutan — dashboard grid persentase TPT semua mesin,
      // realtime dari plan_day/plan_night mutasi_weld. Klik kartu mesin ->
      // detail per-part (reuse MachineCompetitionModal, sama dgn modal edit plan).
      path: '/pcd/welding/machine-utilization',
      name: 'WeldingMachineUtilization',
      component: () => import('@/views/admin/PCD/Welding/machine-utilization.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Utilisasi Mesin',
        icon: 'mdi-view-grid-outline',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Welding' }],
        permission: {
          parent: 'Module.View.MachineUtilizationWelding',
          child: ['PCD']
        }
      }
    },
    {
      path: '/pcd/master/part',
      name: 'MasterData',
      component: () => import('@/views/admin/PCD/Master/master-data.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Master Data',
        icon: 'mdi-database-cog-outline',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Master' }],
        permission: {
          parent: 'Module.View.MasterDataWelding',
          child: ['View', 'Create', 'Update', 'Delete', 'Download', 'PCD']
        }
      }
    },
    {
      path: '/pcd/master/area-machine',
      name: 'AreaMachine',
      component: () => import('@/views/admin/PCD/Master/area-machine.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Area & Mesin',
        icon: 'mdi-map-marker-radius-outline',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Master' }],
        permission: {
          // key sendiri — dulu berbagi MasterDataWelding, jadi centang di halaman permission
          // ikut nyangkut ke Master Data (2026-09-22)
          parent: 'Module.View.AreaMachineWelding',
          child: ['View', 'Create', 'Update', 'Download', 'PCD']
        }
      }
    },
    {
      // Halaman sama dengan Area & Mesin Welding, mode stamping (line press + dies).
      path: '/pcd/master/area-machine-stamping',
      name: 'AreaMachineStamping',
      component: () => import('@/views/admin/PCD/Master/area-machine-stamping.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Area & Mesin Stamping',
        icon: 'mdi-map-marker-radius-outline',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Master' }],
        permission: {
          parent: 'Module.View.AreaMachineStamping',
          child: ['View', 'Create', 'Update', 'Download', 'PCD']
        }
      }
    },
    {
      path: '/pcd/master/qr-aset',
      name: 'QrAset',
      component: () => import('@/views/admin/PCD/Master/qr-aset.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'QR Aset',
        icon: 'mdi-qrcode',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Master' }],
        permission: {
          parent: 'Module.View.QrAset',
          child: ['View', 'Create', 'Update', 'Download', 'PCD']
        }
      }
    },
    {
      path: '/pcd/master/audit-log',
      name: 'WeldingAuditLog',
      component: () => import('@/views/admin/PCD/Master/audit-log.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Log Perubahan',
        icon: 'mdi-history',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Master' }],
        permission: {
          // View = lihat/cari/export log; Update = ubah kebijakan arsip & jalankan arsip
          parent: 'Module.View.AuditLogWelding',
          child: ['View', 'Update']
        }
      }
    },
    {
      path: '/pcd/welding/lkh',
      name: 'PcdWeldingLkhMenu',
      redirect: { name: 'WeldingPlanLKH' },
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'LKH Welding',
        icon: 'mdi-clipboard-text-clock-outline',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Welding' }],
        permission: {
          parent: 'Module.View.LKHWelding',
          child: ['PCD']
        }
      }
    },
    {
      path: '/pcd/welding/lkh/:area?',
      name: 'WeldingPlanLKH',
      component: () => import('@/views/admin/PCD/Welding/lkh.vue'),
      meta: {
        requiredAuth: true,
        title: 'LKH Welding'
      }
    },
    {
      path: '/Transaction/welding/glc-simulation',
      name: 'Transaction-welding-glc-simulation',
      component: () => import('@/views/admin/PCD/Welding/Simulation.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'GLC Simulation',
        icon: 'mdi-chart-line',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Welding' }],
        permission: {
          parent: 'Module.View.GLCSimulation',
          child: ['View', 'Create', 'Update', 'Download', 'PCD']
        }
      }
    },
    {
      path: '/Transaction/welding/glc-simulation/detail/:id',
      name: 'Transaction-welding-glc-simulation-detail',
      component: () => import('@/views/admin/PCD/Welding/SimulationDetail.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'Detail GLC Simulation',
        icon: 'mdi-chart-line',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Welding' }],
        permission: {
          parent: 'Module.View.GLCSimulation',
          child: ['View', 'PCD']
        }
      }
    },
    {
      path: '/Transaction/welding/glc-simulation/edit/:id',
      name: 'Transaction-welding-glc-simulation-edit',
      component: () => import('@/views/admin/PCD/Welding/SimulationEdit.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'Edit GLC Simulation',
        icon: 'mdi-chart-line',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Welding' }],
        permission: {
          parent: 'Module.View.GLCSimulation',
          child: ['Update', 'PCD']
        }
      }
    },
    {
      path: '/Transaction/welding/glc-simulation/create',
      name: 'Transaction-welding-glc-simulation-create',
      component: () => import('@/views/admin/PCD/Welding/SimulationCreate.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'GLC Simulation Create',
        icon: 'mdi-plus',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Welding' }],
        permission: {
          parent: 'Module.View.GLCSimulation',
          child: ['Create', 'PCD']
        }
      }
    },
    {
      path: '/Transaction/welding/glc-simulation/live',
      name: 'Transaction-welding-glc-simulation-live',
      component: () => import('@/views/admin/PCD/Welding/SimulationLiveDashboard.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'GLC Simulation Live',
        icon: 'mdi-chart-bar',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Welding' }],
        permission: {
          parent: 'Module.View.GLCSimulation',
          child: ['View', 'PCD']
        }
      }
    },
    {
      path: '/Transaction/welding/glc-simulation/patan',
      name: 'Transaction-welding-glc-simulation-patan',
      component: () => import('@/views/admin/PCD/Welding/SimulationPatan.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'GLC Patan Line',
        icon: 'mdi-calendar-clock',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Welding' }],
        permission: {
          parent: 'Module.View.GLCSimulation',
          child: ['View', 'PCD']
        }
      }
    },
    {
      path: '/Transaction/welding/glc-simulation/compare',
      name: 'Transaction-welding-glc-simulation-compare',
      component: () => import('@/views/admin/PCD/Welding/SimulationCompare.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'GLC Simulation Compare',
        icon: 'mdi-scale-balance',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Welding' }],
        permission: {
          parent: 'Module.View.GLCSimulation',
          child: ['View', 'PCD']
        }
      }
    },
    {
      path: '/Transaction/welding/subassy-simulation',
      name: 'Transaction-welding-subassy-simulation',
      component: () => import('@/views/admin/PCD/Welding/SubAssy/SubAssySimulation.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'GLC Sub Assy Simulation',
        icon: 'mdi-robot-industrial',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Welding' }],
        permission: {
          parent: 'Module.View.GLCSimulation',
          child: ['View', 'Create', 'Update', 'Download', 'PCD']
        }
      }
    },
    {
      path: '/Transaction/welding/subassy-simulation/create',
      name: 'Transaction-welding-subassy-simulation-create',
      component: () => import('@/views/admin/PCD/Welding/SubAssy/SubAssySimulationCreate.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'Create GLC Sub Assy Simulation',
        icon: 'mdi-plus',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Welding' }],
        permission: {
          parent: 'Module.View.GLCSimulation',
          child: ['Create', 'PCD']
        }
      }
    },
    {
      path: '/Transaction/welding/subassy-simulation/detail/:id?',
      name: 'Transaction-welding-subassy-simulation-detail',
      component: () => import('@/views/admin/PCD/Welding/SubAssy/SubAssySimulationDetail.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'Detail GLC Sub Assy Simulation',
        icon: 'mdi-chart-bar',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Welding' }],
        permission: {
          parent: 'Module.View.GLCSimulation',
          child: ['View', 'PCD']
        }
      }
    },
    {
      path: '/Transaction/welding/subassy-simulation/edit/:id?',
      name: 'Transaction-welding-subassy-simulation-edit',
      component: () => import('@/views/admin/PCD/Welding/SubAssy/SubAssySimulationEdit.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'Edit GLC Sub Assy Simulation',
        icon: 'mdi-pencil',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Welding' }],
        permission: {
          parent: 'Module.View.GLCSimulation',
          child: ['Update', 'PCD']
        }
      }
    },
    {
      path: '/Transaction/welding/subassy-simulation/patan',
      name: 'Transaction-welding-subassy-simulation-patan',
      component: () => import('@/views/admin/PCD/Welding/SubAssy/SubAssySimulationPatan.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'GLC Sub Assy Patan Line',
        icon: 'mdi-calendar-clock',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Welding' }],
        permission: {
          parent: 'Module.View.GLCSimulation',
          child: ['View', 'PCD']
        }
      }
    },
    {
      path: '/Transaction/welding/subassy-simulation/compare',
      name: 'Transaction-welding-subassy-simulation-compare',
      component: () => import('@/views/admin/PCD/Welding/SimulationCompare.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'GLC Sub Assy Simulation Compare',
        icon: 'mdi-scale-balance',
        headers: [{ title: 'PCD', icon: 'mdi-content-paste' }, { title: 'Welding' }],
        permission: {
          parent: 'Module.View.GLCSimulation',
          child: ['View', 'PCD']
        }
      }
    },
    // ------------------------------------
    // ========== End PCD Routes ==========
    // ------------------------------------

    // ------------------------------------
    // ====== Start Stamping Routes =======
    // ------------------------------------

    // ------------------------------------
    // Transaction Stamping
    // ------------------------------------
    {
      name: 'Transaction Stamping LKH',
      path: '/Transaction/stamping/lkh',
      component: () => import('@/views/errors/UnderConstruction.vue'),
      // import('@/views/admin/Stamping/Transaction/Lkh/IndexPage.vue'),
      meta: {
        createSideBar: true,
        title: 'LKH',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.LkhStamping',
          child: ['Create', 'Update', 'Download']
        }
      }
    },
    {
      name: 'Transaction Achievement',
      path: '/Transaction/stamping/achievement',
      component: () => import('@/views/admin/Stamping/Transaction/Achievement/Achievement.vue'),
      meta: {
        createSideBar: true,
        title: 'Achievement',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.AchievementKanban',
          child: ['Create', 'Update', 'PCD']
        }
      }
    },
    {
      path: '/Transaction/stamping/metal-finish',
      name: 'Transaction-stamping-metal-finish',
      component: () => import('@/views/admin/Stamping/Transaction/Achievement/MetalFinish.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Metal Finish',
        icon: 'mdi-hammer',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.MetalFinishStamping',
          child: ['Create', 'Update']
        }
      }
    },
    {
      path: '/Transaction/stamping/achievement/achievementSAP',
      name: 'Transaction-stamping-achievement-sap',
      component: () =>
        // import("@/views/errors/UnderConstruction.vue"),
        import('@/views/admin/Stamping/Transaction/Achievement/AchievementSAP.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Achievement SAP',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.AchievementStampingSAP',
          child: []
        }
      }
    },
    {
      path: '/Transaction/stamping/achievement/GangguanMesin',
      name: 'Transaction-stamping-gangguan-mesin',
      component: () => import('@/views/admin/Stamping/Transaction/Achievement/GangguanMesin.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Gangguan Mesin',
        icon: 'mdi-cog-outline',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.GangguanMesin',
          child: ['Create', 'Update']
        }
      }
    },
    {
      name: 'Transaction Stamping Tag',
      path: '/Transaction/stamping/e-tag',
      component: () => import('@/views/admin/Stamping/Transaction/Achievement/TagOKbyKanban.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Tag OK by Kanban',
        icon: 'mdi-printer',
        headers: [{ title: 'Stamping', icon: 'mdi-robot-industrial' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.TagOKSTP',
          child: ['Create']
        }
      }
    },
    {
      path: '/Transaction/Stamping/TagOkByPartNumber',
      name: 'Transaction-stamping-tag-ok-by-part-number',
      component: () => import('@/views/admin/Stamping/Transaction/Achievement/TagOkByPartNumber.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Tag OK by Part Number',
        icon: 'mdi-printer',
        headers: [{ title: 'Stamping', icon: 'mdi-robot-industrial' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.TagOKWLD',
          child: ['Create']
        }
      }
    },
    {
      path: '/Transaction/stamping/achievement-kanban',
      name: 'Transaction-stamping-achievement-kanban',
      component: () => import('@/views/admin/Stamping/Transaction/Achievement/AchievementKanban.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Achievement Kanban',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.AchievementKanbanStamping',
          child: ['Download', 'Create']
        }
      }
    },

    // ------------------------------------
    // Report Stamping
    // ------------------------------------

    {
      name: 'Report Stamping Lkh',
      path: '/report/stamping/lkh',
      component: () => import('@/views/admin/Stamping/Report/Lkh/Lkh.vue'),
      meta: {
        createSideBar: true,
        title: 'LKH',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Report' }],
        permission: {
          parent: 'Report.View.LkhStamping',
          child: ['Download']
        }
      }
    },
    {
      name: 'Report Stamping Achievement',
      path: '/report/stamping/achievement',
      component: () => import('@/views/admin/Stamping/Report/Achievement/Achievement.vue'),
      meta: {
        createSideBar: true,
        title: 'Achievement',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Report' }],
        permission: {
          parent: 'Report.View.AchievementStamping',
          child: ['Download']
        }
      }
    },
    {
      name: 'Report Stamping Metal Finish',
      path: '/report/stamping/metal-finish',
      component: () => import('@/views/admin/Stamping/Report/MetalFinish/MetalFinish.vue'),
      meta: {
        createSideBar: true,
        title: 'Metal Finish',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Report' }],
        permission: {
          parent: 'Report.View.MetalFinishStamping',
          child: ['Download']
        }
      }
    },
    {
      name: 'Report Stamping Achievement SAP',
      path: '/report/stamping/achievementSAP',
      component: () => import('@/views/admin/Stamping/Report/Achievement/AchievementSAP.vue'),
      meta: {
        createSideBar: true,
        title: 'Achievement SAP',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Report' }],
        permission: {
          parent: 'Report.View.AchievementSAPStamping',
          child: ['Download']
        }
      }
    },
    {
      name: 'Report Stamping Achievement Summary',
      path: '/report/stamping/achievementSummary',
      component: () => import('@/views/admin/Stamping/Report/Achievement/AchievementSum.vue'),
      meta: {
        createSideBar: true,
        title: 'Summary Achievement',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Report' }],
        permission: {
          parent: 'Report.View.AchievementSummaryStamping',
          child: ['Download']
        }
      }
    },
    {
      name: 'Report Stamping Achievement Machine',
      path: '/report/stamping/achievementMachine',
      component: () => import('@/views/admin/Stamping/Report/Achievement/AchievementMachine.vue'),
      meta: {
        createSideBar: true,
        title: 'Achievement Machine',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Report' }],
        permission: {
          parent: 'Report.View.AchievementMachine',
          child: ['Download']
        }
      }
    },
    {
      name: 'Report Stamping Andon',
      path: '/report/stamping/achievement/Andon',
      component: () => import('@/views/admin/Stamping/Report/Achievement/AchievementAndon.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Achievement Andon',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Report' }],
        permission: {
          parent: 'Report.View.AchievementAndonStamping',
          child: ['Download', 'Create']
        }
      }
    },
    {
      name: 'Report Stamping Stock',
      path: '/report/stamping/stock',
      component: () => import('@/views/admin/Stamping/Report/Stock/StockPage.vue'),
      meta: {
        createSideBar: true,
        title: 'Achievement Stock',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Report' }],
        permission: {
          parent: 'Report.View.Stock',
          child: ['Download']
        }
      }
    },
    {
      name: 'Report Stamping Stock V2',
      path: '/report/stamping/stock-v2',
      component: () => import('@/views/admin/Stamping/Report/Stock/StockPageV2.vue'),
      meta: {
        createSideBar: true,
        title: 'Achievement Stock V2',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Report' }],
        permission: {
          parent: 'Report.View.Stock',
          child: ['Download']
        }
      }
    },
    {
      name: 'Compare Achievement vs Master',
      path: '/report/stamping/compare-master',
      component: () => import('@/views/admin/Stamping/Report/Stock/CompareMasterPage.vue'),
      meta: {
        createSideBar: true,
        title: 'Compare Achievement vs Master',
        icon: 'mdi-compare-horizontal',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Report' }],
        permission: {
          parent: 'Report.View.Stock',
          child: ['Download']
        }
      }
    },
    {
      name: 'Report Achievement Kanban',
      path: '/report/stamping/achievement-kanban',
      component: () => import('@/views/admin/Stamping/Report/Achievement/IndexKanbanPage.vue'),
      meta: {
        createSideBar: true,
        title: 'Achievement Kanban',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Report' }],
        permission: {
          parent: 'Report.View.AchievementKanbanStamping',
          child: ['Download', 'Create']
        }
      }
    },
    // ------------------------------------
    // ======= End Stamping Routes ========
    // ------------------------------------

    // ------------------------------------
    // ====== Start welding Routes ========
    // ------------------------------------
    {
      path: '/master-data/welding/welding-glc-master-part',
      name: 'master-data-welding-glc-master-part',
      component: () => import('@/views/admin/PCD/Welding/welding_glc.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'GLC Master Part',
        icon: 'mdi-table-large',
        headers: [{ title: 'Welding', icon: 'mdi-robot-industrial' }, { title: 'Master Data' }],
        permission: {
          parent: 'Master.View.WeldingGLCMasterPart',
          child: ['Create', 'Update', 'Delete', 'Download']
        }
      }
    },
    {
      path: '/master-data/stamping/spec-machine',
      name: 'master-data-stamping-spec-machine',
      component: () => import('@/views/admin/Stamping/Master/SpecMachine.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Spec Machine',
        icon: 'mdi-cog-outline',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Master Data' }],
        permission: {
          parent: 'Master.View.SpecMachineStamping',
          child: ['Create', 'Update', 'Delete', 'Download']
        }
      }
    },
    {
      path: '/master-data/stamping/dies-pairing',
      name: 'master-data-stamping-dies-pairing',
      component: () => import('@/views/admin/Stamping/Master/DiesPairing.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Dies Pairing',
        icon: 'mdi-puzzle-outline',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Master Data' }],
        permission: {
          parent: 'Master.View.SpecMachine',
          child: ['Create', 'Update', 'Download']
        }
      }
    },
    {
      // Tiruan GLC Simulation welding untuk line press; line & jumlah mesin
      // dari master machine press.
      path: '/Transaction/stamping/glc-press',
      name: 'Transaction-stamping-glc-press',
      component: () => import('@/views/admin/PCD/Stamping/GlcSimulation.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'GLC Simulation',
        icon: 'mdi-chart-bar-stacked',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.GlcStamping',
          child: ['Create', 'Update', 'Download']
        }
      }
    },
    {
      path: '/Transaction/stamping/glc-press/detail/:id',
      name: 'Transaction-stamping-glc-press-detail',
      component: () => import('@/views/admin/PCD/Stamping/GlcSimulationDetail.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        title: 'Detail GLC Simulation',
        headers: [{ title: 'Stamping', icon: 'mdi-tools' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.GlcStamping',
          child: ['Create', 'Update', 'Download']
        }
      }
    },
    {
      // Satu menu, dua tab yang saling bergantung: GLC menentukan beban tiap
      // robot, PATAN menyusun skema produksinya. Sebelumnya dua menu terpisah.
      path: '/Transaction/welding/glc-sub-assy',
      name: 'Transaction-welding-glc-sub-assy',
      component: () => import('@/views/admin/PCD/Welding/glc-sub-assy.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'GLC & PATAN Sub Assy',
        icon: 'mdi-robot-industrial',
        headers: [{ title: 'Welding', icon: 'mdi-robot-industrial' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.GlcSubAssyWelding',
          child: ['Create', 'Update', 'Download']
        }
      }
    },
    {
      // GLC Sub Assy Robot Spot — parameter beku per periode, pattern tandem
      // per jig, dan kebutuhan yang sudah dipotong stock IFPD.
      // Tabel sendiri (glc/glc_part/glc_machine/glc_pattern/glc_master_part),
      // terpisah dari glc_simulation* milik WSS ADM.
      path: '/Transaction/welding/glc-robot',
      name: 'Transaction-welding-glc-robot',
      component: () => import('@/views/admin/PCD/Welding/glc-robot.vue'),
      meta: {
        // Tidak lagi di sidebar: isinya sudah jadi tab di menu
        // "GLC & PATAN Sub Assy". Route-nya dibiarkan hidup supaya
        // tautan lama tetap terbuka.
        createSideBar: false,
        requiredAuth: true,
        title: 'GLC Robot Sub Assy',
        icon: 'mdi-robot-industrial',
        headers: [{ title: 'Welding', icon: 'mdi-robot-industrial' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.GlcSubAssyWelding',
          child: ['Create', 'Update', 'Download']
        }
      }
    },
    {
      // Uji Skema GLC — coba skema perhitungan waktu, review tiap robot,
      // lalu terbitkan jadi VERSI GLC baru (periode lama tidak ditimpa).
      // CT dibentuk dari fisika proses las; penjadwalan per kombinasi tandem.
      // Tabel: glc_uji, glc_uji_robot, glc_uji_kombinasi, glc_uji_segmen,
      // glc_uji_part, glc_param_ct, glc_kombinasi, glc_istirahat.
      path: '/Transaction/welding/glc-uji-skema',
      name: 'Transaction-welding-glc-uji-skema',
      component: () => import('@/views/admin/PCD/Welding/glc-uji-skema.vue'),
      meta: {
        // Tidak lagi di sidebar: isinya sudah jadi tab di menu
        // "GLC & PATAN Sub Assy". Route-nya dibiarkan hidup supaya
        // tautan lama tetap terbuka.
        createSideBar: false,
        requiredAuth: true,
        title: 'Uji Skema GLC',
        icon: 'mdi-flask-outline',
        headers: [{ title: 'Welding', icon: 'mdi-robot-industrial' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.GlcSubAssyWelding',
          child: ['Create', 'Update', 'Download']
        }
      }
    },

    {
      path: '/master-data/welding/spec-machine',
      name: 'master-data-welding-spec-machine',
      component: () => import('@/views/admin/Welding/Master/SpecMachine.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Spec Machine',
        icon: 'mdi-cog-outline',
        headers: [{ title: 'Welding', icon: 'mdi-robot-industrial' }, { title: 'Master Data' }],
        permission: {
          parent: 'Master.View.SpecMachine',
          child: ['Create', 'Update', 'Delete', 'Download']
        }
      }
    },

    {
      path: '/Transaction/welding/AddTagOK',
      name: 'Transaction-welding-add-tag-ok',
      component: () => import('@/views/admin/Welding/Transaction/TagOkByKanban.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'TAG OK by Kanban',
        icon: 'mdi-printer',
        headers: [{ title: 'Welding', icon: 'mdi-robot-industrial' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.TagOKWLDADD',
          child: ['Create']
        }
      }
    },
    {
      path: '/Transaction/welding/TagOkByPartNumber',
      name: 'Transaction-welding-tag-ok-by-part-number',
      component: () => import('@/views/admin/Welding/Transaction/TagOkByPartNumber.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Tag OK by Part Number',
        icon: 'mdi-printer',
        headers: [{ title: 'Welding', icon: 'mdi-robot-industrial' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.TagOKByPartNumber',
          child: ['Create']
        }
      }
    },
    {
      path: '/Transaction/welding/ScanTagOK',
      name: 'Transaction-welding-scan-tag-ok',
      component: () => import('@/views/admin/Welding/Transaction/ScanTagOk.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Scan TAG OK',
        icon: 'mdi-barcode',
        headers: [{ title: 'Welding', icon: 'mdi-robot-industrial' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.ScanTagOK',
          child: ['Create']
        }
      }
    },
    {
      path: '/Transaction/welding/achievement/',
      name: 'Transaction-welding-achievement',
      component: () => import('@/views/admin/Welding/Transaction/Achievement.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Achievement',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Welding', icon: 'mdi-robot-industrial' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.AchievementWelding',
          child: ['Create', 'Update', 'PCD']
        }
      }
    },
    {
      path: '/transaction/welding/achievement-v2/',
      name: 'transaction-welding-achievement-v2',
      component: () => import('@/views/admin/Welding/Transaction/Achievement_v2.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Achievement V2',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Welding', icon: 'mdi-robot-industrial' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.AchievementWeldingV2',
          child: ['Create', 'Update', 'PCD'],
          // Batasi kartu area per user → permission `Transaction.Area.AchievementWeldingV2:<AREA>`.
          // Tanpa satu pun area terpilih = lihat semua. AREA = kode area master
          // (ms_welding_area: WSS/CO/SA × ADM/MMKI/HMMI), bukan zone lama.
          areas: ['WSS ADM', 'CO ADM', 'SA ADM', 'WSS MMKI', 'CO MMKI', 'SA MMKI', 'WSS HMMI', 'CO HMMI', 'SA HMMI']
        }
      }
    },
    {
      path: '/Transaction/welding/achievement/showline',
      name: 'transaction-welding-achievement-showline',
      component: () => import('@/views/admin/Welding/Transaction/Achievement-page2.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        headers: [{ title: 'Welding', icon: 'mdi-robot-industrial' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.AchievementWelding',
          child: ['Create', 'Update', 'PCD']
        }
      }
    },
    {
      path: '/Transaction/welding/achievement/viewdetail',
      name: 'transaction-welding-achievement-detail',
      component: () => import('@/views/admin/Welding/Transaction/Achievement-page3.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        headers: [{ title: 'Welding', icon: 'mdi-robot-industrial' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.AchievementWelding',
          child: ['Create', 'Update', 'PCD']
        }
      }
    },

    {
      path: '/Transaction/welding/achievement/viewdetail/edit',
      name: 'transaction-welding-achievement-detail-edit',
      component: () => import('@/views/admin/Welding/Transaction/Achievement-page3-edit.vue'),
      meta: {
        createSideBar: false,
        requiredAuth: true,
        headers: [{ title: 'Welding', icon: 'mdi-robot-industrial' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.AchievementWelding',
          child: ['Create', 'Update', 'PCD']
        }
      }
    },

    {
      path: '/Transaction/welding/achievement-sap',
      name: 'Transaction-welding-achievement-sap',
      component: () => import('@/views/admin/Welding/Transaction/AchievementSAP.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Achievement SAP',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Welding', icon: 'mdi-robot-industrial' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.AchievementSapWelding',
          child: ['Download', 'Create']
        }
      }
    },
    {
      path: '/Transaction/welding/achievement-kanban',
      name: 'Transaction-welding-achievement-kanban',
      component: () => import('@/views/admin/Welding/Transaction/AchievementKanban.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Achievement Kanban',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Welding', icon: 'mdi-robot-industrial' }, { title: 'Transaction' }],
        permission: {
          parent: 'Transaction.View.AchievementKanbanWelding',
          child: ['Download', 'Create']
        }
      }
    },

    {
      path: '/report/welding/lkh',
      name: 'report-welding-lkh',
      component: () => import('@/views/admin/Welding/Report/LKH.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'LKH',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Welding', icon: 'mdi-robot-industrial' }, { title: 'Report' }],
        permission: { parent: 'Report.View.LkhWelding', child: ['Download'] }
      }
    },
    {
      path: '/report/welding/achievement',
      name: 'report-welding-achievement',
      component: () => import('@/views/admin/Welding/Report/Achievement.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Achievement',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Welding', icon: 'mdi-robot-industrial' }, { title: 'Report' }],
        permission: {
          parent: 'Report.View.AchievementWelding',
          child: ['Download']
        }
      }
    },
    {
      path: '/report/welding/achievement-kanban',
      name: 'report-welding-achievement-kanban',
      component: () => import('@/views/admin/Welding/Report/AchievementKanban.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Achievement Kanban',
        icon: 'mdi-clipboard-list-outline',
        headers: [{ title: 'Welding', icon: 'mdi-robot-industrial' }, { title: 'Report' }],
        permission: {
          parent: 'Report.View.AchievementKanbanWelding',
          child: ['Download', 'Create']
        }
      }
    },
    // ------------------------------------
    // ======= End welding Routes =========
    // ------------------------------------

    // ------------------------------------
    // ====== Start Finance Routes ========
    // ------------------------------------
    {
      path: '/finance/master/employee',
      name: 'finance-master-employee',
      component: () => import('@/views/admin/Finance/Master/Employee.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Employee',
        icon: 'mdi-account-group-outline',
        headers: [{ title: 'Finance', icon: 'mdi-bank-outline' }, { title: 'Master' }],
        permission: {
          parent: 'Finance.View.Employee',
          child: ['Create', 'Update', 'Delete']
        }
      }
    },
    {
      path: '/finance/master/category',
      name: 'finance-master-category',
      component: () => import('@/views/admin/Finance/Master/Category.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Category',
        icon: 'mdi-shape-outline',
        headers: [{ title: 'Finance', icon: 'mdi-bank-outline' }, { title: 'Master' }],
        permission: {
          parent: 'Finance.View.Category',
          child: ['Create', 'Update', 'Delete']
        }
      }
    },
    {
      path: '/finance/transaction/cash-advance-request',
      name: 'finance-transaction-cash-advance-request',
      component: () => import('@/views/admin/Finance/Transaction/CashAdvanceRequest.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Advance Payment Request',
        icon: 'mdi-cash-plus',
        headers: [{ title: 'Finance', icon: 'mdi-bank-outline' }, { title: 'Transaction' }],
        permission: {
          parent: 'Finance.View.CashAdvanceRequest',
          child: ['Create', 'Update', 'Delete']
        }
      }
    },
    {
      path: '/finance/transaction/advance-settlement',
      name: 'finance-transaction-advance-settlement',
      component: () => import('@/views/admin/Finance/Transaction/AdvanceSettlement.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Advance Settlement',
        icon: 'mdi-cash-check',
        headers: [{ title: 'Finance', icon: 'mdi-bank-outline' }, { title: 'Transaction' }],
        permission: {
          parent: 'Finance.View.AdvanceSettlement',
          child: ['Create', 'Update', 'Delete', 'Download']
        }
      }
    },
    {
      path: '/finance/report/cash-advance-summary',
      name: 'finance-report-cash-advance-summary',
      component: () => import('@/views/admin/Finance/Report/CashAdvanceSummary.vue'),
      meta: {
        createSideBar: true,
        requiredAuth: true,
        title: 'Advance Payment Summary',
        icon: 'mdi-chart-box-outline',
        headers: [{ title: 'Finance', icon: 'mdi-bank-outline' }, { title: 'Report' }],
        permission: {
          parent: 'Finance.View.CashAdvanceSummary',
          // Update di halaman ini = "lihat semua departemen" (tidak ada aksi update di report ini).
          // Tanpa Update, data dibatasi ke departemen user sendiri (dept head).
          child: ['Download', 'Update']
        }
      }
    },
    // ------------------------------------
    // ======= End Finance Routes =========
    // ------------------------------------

    // ------------------------------------
    // ======= AI Chat Route =========
    // ------------------------------------
    {
      path: '/ai-chat',
      name: 'ai-chat',
      component: () => import('@/views/admin/AI/Chat.vue'),
      meta: {
        requiredAuth: true,
        title: 'Chat AI',
        icon: 'mdi-chat-outline',
        permissionAnyOf: [...AI_CHAT_ALLOWED_PARENTS]
      }
    },
    // ------------------------------------
    // ======= AI Chat Route =========
    // ------------------------------------
  ]
};
export default MainRoutes;
export const menu: CustomRoute[] = [];
export const permissionList: Record<string, PermissionItem> = {};

if (MainRoutes.children) {
  MainRoutes.children.forEach((route) => {
    if (!route.meta?.createSideBar) return;

    menu.push(route);

    if (!route.meta?.permission?.parent) return;
    if (!route.meta?.headers || route.meta.headers.length === 0) return;

    const headerTitle = route.meta.headers[0]?.title;
    const subHeaderTitle = route.meta.headers[1]?.title;
    const subSubTitle = route.meta.headers[2]?.title;
    const submenuLabel = subSubTitle ? `${subHeaderTitle} > ${subSubTitle}` : subHeaderTitle;

    const linkItem: PermissionItem = {
      type: 'link',
      title: route.meta.title!,
      permission: route.meta.permission
    };

    if (!headerTitle) {
      permissionList[route.meta.title!] = linkItem;
      return;
    }

    if (!permissionList[headerTitle]) {
      permissionList[headerTitle] = {
        type: 'header',
        title: headerTitle,
        content: {}
      };
    }
    if (!submenuLabel) {
      (permissionList[headerTitle] as any).content[route.meta.title!] = linkItem;
      return;
    }
    const headerContent = (permissionList[headerTitle] as any).content;
    if (!headerContent[submenuLabel]) {
      headerContent[submenuLabel] = {
        type: 'submenu',
        title: submenuLabel,
        content: {}
      };
    }
    headerContent[submenuLabel].content[route.meta.title!] = linkItem;
  });
}
