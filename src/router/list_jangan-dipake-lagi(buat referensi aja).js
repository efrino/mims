/* eslint-disable no-prototype-builtins */
export const routes = [
  {
    path: "/",
    name: "dashboard",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      // createSideBar: true,
      // requiresAuth: true,
      title: "Dashboard",
      icon: "mdi-view-dashboard-outline",
    },
  },
  {
    path: "/login",
    name: "login",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/andon-production",
    name: "andon-production",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/andon-production-press",
    name: "andon-production-press",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/display-maintenance",
    name: "display-maintenance",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/report-glc",
    name: "report-glc",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/under-construction",
    name: "under-construction",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/andon-production-line/:line",
    name: "andon-production-line",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/andon-production-animate/:line",
    name: "andon-production-animate",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/andon-production/:line",
    name: "andon-production-direksi",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/andon-trial-b/",
    name: "andon-trial-B",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/andon-trial-c/",
    name: "andon-trial-c",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/andon-press-office/:line",
    name: "andon-press-office",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/andon-office/:line",
    name: "andon-office-stamping",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/andon-line/:line",
    name: "andon-line-press",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  // Marketing
  {
    path: "/report-delivery-customer/:period",
    name: "report-delivery-customer",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/report-delivery-kembali-customer/:period",
    name: "report-delivery-kembali-customer",
    component: () =>
      import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  // {
  //   path: "/report-delivery-tp-customer/:period",
  //   name: "report-delivery-tp-customer",
  //   component: () =>
  //     import("@/views/Public/Marketing/DisplayDeliveryCustomerDNTP"),
  //   meta: {
  //     createSideBar: false,
  //     layout: "blank",
  //   },
  // },
  // {
  //   path: "/report-delivery-pgi-customer/:period",
  //   name: "report-delivery-pgi-customer",
  //   component: () =>
  //     import("@/views/Public/Marketing/DisplayDeliveryCustomerPGI"),
  //   meta: {
  //     createSideBar: false,
  //     layout: "blank",
  //   },
  // },
  // {
  //   path: "/report-delivery-billing-customer/:period",
  //   name: "report-delivery-billing-customer",
  //   component: () =>
  //     import("@/views/Public/Marketing/DisplayDeliveryCustomerBilling"),
  //   meta: {
  //     createSideBar: false,
  //     layout: "blank",
  //   },
  // },

  // {
  //   path: "/report-delivery-dn-detail",
  //   name: "report-delivery-dn-detail",
  //   component: () =>
  //     import("@/views/Public/Marketing/DisplayDeliveryCustomerDetail"),
  //   meta: {
  //     createSideBar: false,
  //     layout: "blank",
  //   },
  // },
  // {
  //   path: "/report-delivery",
  //   name: "report-delivery",
  //   component: () => import("@/views/Public/Marketing/DisplayDelivery"),
  //   meta: {
  //     createSideBar: false,
  //     layout: "blank",
  //   },
  // },

  {
    path: "/rundown-total-wip",
    name: "rundown-total-wip",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  // Logistic
  {
    path: "/rundown-irm",
    name: "rundown-irm",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/rundown-irm-adjustment",
    name: "rundown-irm-adjustment",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/rundown-irm-sap",
    name: "rundown-irm-sap",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/rundown-wip-outhouse-sap",
    name: "rundown-wip-outhouse-sap",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/rundown-wip-inhouse-sap",
    name: "rundown-wip-inhouse-sap",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  // {
  //   path: "/rundown-stock",
  //   name: "rundown-stock",
  //   component: () => import("@/views/Public/DisplayTotalRundown"),
  //   meta: {
  //     createSideBar: false,
  //     layout: "blank",
  //   },
  // },
  {
    path: "/rundown-ifp-detail",
    name: "rundown-ifp-detail",
    component: () =>
      import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/display-control-prepare",
    name: "display-control-prepare",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/display-control-sap",
    name: "display-control-sap",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/report-cycle-delivery/:group",
    name: "report-cycle-delivery",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/report-cycle-delivery-all/:group",
    name: "report-cycle-delivery-all",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/report-cycle-delivery-direksi/:group",
    name: "report-cycle-delivery-direksi",
    component: () =>
      import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/integrated-warehouse",
    name: "integrated-warehouse",
    component: () =>
      import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/andon-auto-page",
    name: "andon-auto-page",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/andon-auto-page-next",
    name: "andon-auto-page-next",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/andon-auto-page-left",
    name: "andon-auto-page-left",
    component: () =>
      import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/andon-auto-page-right",
    name: "andon-auto-page-right",
    component: () =>
      import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  // {
  //   path: "/contract",
  //   name: "contract",
  //   component: () => import("@/views/admin/Users/Index.vue"),
  //   meta: {
  //     createSideBar: true,
  //     title: "Contract",
  //     icon: "mdi-form-select",
  //     header: "Master Data",
  //     subHeader: "Admin",
  //     requiresAuth: true,
  //     permission: {
  //       parent: "Module.View.Contract",
  //       child: ["Create", "Update"]
  //     }
  //   }
  // },
  // {
  //   path: "/customer",
  //   name: "customer",
  //   component: () => import("@/views/admin/Users/Index.vue"),
  //   meta: {
  //     createSideBar: true,
  //     title: "Customer",
  //     icon: "mdi-form-select",
  //     header: "Master Data",
  //     subHeader: "Admin",
  //     requiresAuth: true,
  //     permission: {
  //       parent: "Module.View.Customer",
  //       child: ["Create", "Update"]
  //     }
  //   }
  // },

  // INI Menu CRUD Schedule andon press per shift
  // {
  //   path: "/master/schedule-press",
  //   name: "master-schedule-press",
  //   component: () => import("@/views/admin/Master/SchedulePress.vue"),
  //   meta: {
  //     createSideBar: true,
  //     title: "Schedule Press",
  //     icon: "mdi-form-select",
  //     header: "Master Data",
  //     subHeader: "Admin",
  //     requiresAuth: true,
  //     permission: {
  //       parent: "Master.View.Patan",
  //       child: ["Create", "Update"],
  //     },
  //   },
  // },
  // {
  //   path: "/master/patan-schedule",
  //   name: "master-patan-schedule",
  //   component: () => import("@/views/admin/Master/PatanSchedule.vue"),
  //   meta: {
  //     createSideBar: true,
  //     title: "Patan Schedule",
  //     icon: "mdi-calendar",
  //     header: "Master Data",
  //     subHeader: "Admin",
  //     requiresAuth: true,
  //     permission: {
  //       parent: "Master.View.PatanSchedule",
  //       child: ["Create", "Update"],
  //     },
  //   },
  // },
  // {
  //   path: "/master/update-log",
  //   name: "master-update-log",
  //   component: () => import("@/views/admin/Master/UpdateLog.vue"),
  //   meta: {
  //     createSideBar: true,
  //     title: "Create Update Log",
  //     icon: "mdi-update",
  //     header: "Master Data",
  //     subHeader: "Admin",
  //     requiresAuth: true,
  //     permission: {
  //       parent: "Master.View.UpdateLog",
  //       child: ["Create", "Update"],
  //     },
  //   },
  // },
  {
    path: "/manage-users",
    name: "manage-users",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: true,
      title: "Manage Users",
      icon: "mdi-account-multiple-outline",
      // headers: ["Admin","Master Data"],
      headers: [
          { title: "Admin", icon: "mdi-account-cog" },
          { title: "Master Data"},                     
      ],
      // header: "Admin",
      // subHeader: "Admin",
      // requiresAuth: true,
      permission: {
        parent: "Module.View.ManageUsers",
        child: ["Create", "Update"],
      },
    },
  },
  {
    path: "/manage-users/set-permisssion",
    name: "set-permisssion",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      permission: { parent: "Module.Update.ManageUsers", child: [] },
      // requiresAuth: true,
    },
  },
  {
    path: "/manage-users/edit-user",
    name: "edit-user",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      permission: { parent: "Module.Update.ManageUsers", child: [] },
      // requiresAuth: true,
    },
  },
  {
    path: "/manage-users/add-user",
    name: "add-user",
    component: () => import("@/views/Placeholder.vue"),
    meta: {
      createSideBar: false,
      permission: { parent: "Module.Create.ManageUsers", child: [] },
      // requiresAuth: true,
    },
  },
  
  // {
  //   path: "/master/part-blank",
  //   name: "master-part-blank",
  //   component: () => import("@/views/admin/Master/PartBlank.vue"),
  //   meta: {
  //     createSideBar: true,
  //     title: "Master Part Blank",
  //     icon: "mdi-form-select",
  //     header: "Master Data",
  //     subHeader: "Admin",
  //     requiresAuth: true,
  //     permission: {
  //       parent: "Master.View.Part",
  //       child: ["Create", "Update"],
  //     },
  //   },
  // },
  // {
  //   path: "/master/part-maj",
  //   name: "master-part-maj",
  //   component: () => import("@/views/admin/Master/PartMaj.vue"),
  //   meta: {
  //     createSideBar: true,
  //     title: "Master Part MAJ",
  //     icon: "mdi-form-select",
  //     header: "Master Data",
  //     subHeader: "Admin",
  //     requiresAuth: true,
  //     permission: {
  //       parent: "Master.View.PartMaj",
  //       child: ["Create", "Update"],
  //     },
  //   },
  // },
  // {
  //   path: "/master/master-glc",
  //   name: "master-glc",
  //   component: () => import("@/views/admin/Master/IndexGsph.vue"),
  //   meta: {
  //     createSideBar: true,
  //     title: "Master GLC",
  //     icon: "mdi-form-select",
  //     header: "Master Data",
  //     subHeader: "Admin",
  //     requiresAuth: true,
  //     permission: {
  //       parent: "Master.View.GSPH",
  //       child: ["Create", "Update"],
  //     },
  //   },
  // },
  {
    path: "/ifp/inhouse/rundown",
    name: "ifp-inhouse-rundown",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      // requiresAuth: true,
      title: "Rundown",
      icon: "mdi-clipboard-list-outline",
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "IFP", icon: "mdi-warehouse" },          
          { title: "In House" }                           
      ],
      header: "IFP",
      subHeader: "In House",
      // permission: {
      //   parent: "Module.View.RundownIfpInhouse",
      //   child: ["Download"],
      // },
    },
  },
  // {
  //   path: "/ifp/outhouse/rundown",
  //   name: "ifp-outhouse-rundown",
  //   component: () => import("@/views/admin/Ifp/Outhouse/Rundown"),
  //   meta: {
  //     createSideBar: true,
  //     requiresAuth: true,
  //     title: "Rundown",
  //     icon: "mdi-clipboard-list-outline",
  //     header: "IFP",
  //     subHeader: "Out House",
  //     permission: {
  //       parent: "Module.View.RundownIfpOuthouse",
  //       child: ["Download"]
  //     }
  //   }
  // },
  {
    path: "/irm/inhouse/rundown",
    name: "irm-inhouse-rundown",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      // requiresAuth: true,
      title: "Rundown",
      icon: "mdi-clipboard-list-outline",
      // headers: ["Logistic","IRM","In House"],
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "IRM", icon: "mdi-cube-outline" },          
          { title: "In House" }                           
      ],
      // header: "IRM",
      // subHeader: "In House",
      // permission: {
      //   parent: "Module.View.RundownIrmInhouse",
      //   child: ["Download"],
      // },
    },
  },
  {
    path: "/irm/outhouse/rundown",
    name: "irm-outhouse-rundown",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      // requiresAuth: true,
      title: "Rundown",
      icon: "mdi-clipboard-list-outline",
      // headers: ["Logistic","IRM","Out House"],
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "IRM", icon: "mdi-cube-outline" },          
          { title: "Out House" }                           
      ],
      // header: "IRM",
      // subHeader: "Out House",
      // permission: {
      //   parent: "Module.View.RundownIrmOuthouse",
      //   child: ["Download"],
      // },
    },
  },
  {
    path: "/wip/inhouse/rundown",
    name: "wip-rundown-inhouse",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      // requiresAuth: true,
      title: "Rundown",
      icon: "mdi-clipboard-list-outline",
      // headers: ["Logistic","WIP","In House"],
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "WIP", icon: "mdi-progress-wrench" },          
          { title: "In House" }                           
      ],
      // header: "WIP",
      // subHeader: "In House",
      permission: {
        parent: "Module.View.RundownWipInhouse",
        child: ["Download"],
      },
    },
  },
  {
    path: "/wip/outhouse/rundown",
    name: "wip-rundown-outhouse",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      requiresAuth: true,
      title: "Rundown",
      icon: "mdi-clipboard-list-outline",
      // headers: ["Logistic","WIP","Out House"],
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "WIP", icon: "mdi-progress-wrench" },          
          { title: "Out House" }                           
      ],
      // header: "WIP",
      // subHeader: "Out House",
      permission: {
        parent: "Module.View.RundownWipOuthouse",
        child: ["Download"],
      },
    },
  },
  {
    path: "/ifp/inhouse/display-management",
    name: "ifp-inhouse/display-management",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      // requiresAuth: true,
      title: "Display",
      icon: "mdi-monitor-multiple",
      // headers: ["Logistic","IFP","In House"],
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "IFP", icon: "mdi-warehouse" },          
          { title: "In House" }                           
      ],
      // header: "IFP",
      // subHeader: "In House",
      // permission: {
      //   parent: "Module.View.DisplayIfpInhouse",
      //   child: ["Update"],
      // },
    },
  },
  {
    path: "/ifp/inhouse/strength-management",
    name: "ifp-inhouse/strength-management",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      requiresAuth: true,
      title: "Master Strength",
      icon: "mdi-chart-bar",
      // headers: ["Logistic","IFP","In House"],
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "IFP", icon: "mdi-warehouse" },          
          { title: "In House" }                           
      ],
      // header: "IFP",
      // subHeader: "In House",
      permission: {
        parent: "Module.View.DisplayIfpInhouse",
        child: ["Update"],
      },
    },
  },
  // {
  //   path: "/ifp/outhouse/display-management",
  //   name: "ifp-outhouse/display-management",
  //   component: () => import("@/views/admin/Ifp/Outhouse/DisplayManagement"),
  //   meta: {
  //     createSideBar: true,
  //     requiresAuth: true,
  //     title: "Display",
  //     icon: "mdi-monitor-multiple",
  //     header: "IFP",
  //     subHeader: "Out House",
  //     permission: {
  //       parent: "Module.View.DisplayIfpOuthouse",
  //       child: ["Update"]
  //     }
  //   }
  // },
  {
    path: "/irm/inhouse/display-management",
    name: "irm-inhouse-display-management",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      requiresAuth: true,
      title: "Display",
      icon: "mdi-monitor-multiple",
      // headers: ["Logistic","IRM","In House"],
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "IRM", icon: "mdi-cube-outline" },          
          { title: "In House" }                           
      ],
      // header: "IRM",
      // subHeader: "In House",
      permission: {
        parent: "Module.View.DisplayIrmInhouse",
        child: ["Update"],
      },
    },
  },
  {
    path: "/irm/outhouse/display-management",
    name: "irm-outhouse-display-management",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      requiresAuth: true,
      title: "Display",
      icon: "mdi-monitor-multiple",
      // headers: ["Logistic","IRM","Out House"],
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "IRM", icon: "mdi-cube-outline" },          
          { title: "Out House" }                           
      ],
      // header: "IRM",
      // subHeader: "Out House",
      permission: {
        parent: "Module.View.DisplayIrmOuthouse",
        child: ["Update"],
      },
    },
  },
  {
    path: "/wip/inhouse/display-management",
    name: "wip-inhouse-display-management",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      requiresAuth: true,
      title: "Display",
      icon: "mdi-monitor-multiple",
      // headers: ["Logistic","WIP","In House"],
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "WIP", icon: "mdi-progress-wrench" },          
          { title: "In House" }                           
      ],
      // header: "WIP",
      // subHeader: "In House",
      permission: {
        parent: "Module.View.DisplayWipInhouse",
        child: ["Update"],
      },
    },
  },
  {
    path: "/wip/outhouse/display-management",
    name: "wip-outhouse-display-management",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      requiresAuth: true,
      title: "Display",
      icon: "mdi-monitor-multiple",
      // headers: ["Logistic","WIP","Out House"],
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "WIP", icon: "mdi-progress-wrench" },          
          { title: "Out House" }                           
      ],
      // header: "WIP",
      // subHeader: "Out House",
      permission: {
        parent: "Module.View.DisplayWipOuthouse",
        child: ["Update"],
      },
    },
  },
  {
    path: "/wip/inhouse/transaction",
    name: "wip-inhouse-transaction",
    component: () =>
      import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      requiresAuth: true,
      title: "Transaction",
      icon: "mdi-swap-horizontal",
      // headers: ["Logistic","WIP","In House"],
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "WIP", icon: "mdi-progress-wrench" },          
          { title: "In House" }                           
      ],
      // header: "WIP",
      // subHeader: "In House",
      permission: {
        parent: "Module.View.TransactionWipInhouse",
        child: ["Create", "Update"],
      },
    },
  },
  {
    path: "/wip/inhouse/transaction-detail",
    name: "wip-inhouse-transaction-detail",
    component: () =>
      import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      // requiresAuth: true,
    },
  },
  {
    path: "/wip/inhouse/create-transaction",
    name: "wip-inhouse-create-transaction",
    component: () =>
      import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      requiresAuth: true,
      parent: "Module.Create.TransactionWipInhouse",
    },
  },
  {
    path: "/wip/inhouse/mutation",
    name: "wip-inhouse-mutation",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      requiresAuth: true,
      title: "Mutation",
      icon: "mdi-notebook-check-outline",
      // headers: ["Logistic","WIP","In House"],
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "WIP", icon: "mdi-progress-wrench" },          
          { title: "In House" }                           
      ],
      // header: "WIP",
      // subHeader: "In House",
      permission: { parent: "Module.View.MutationWipInhouse", child: [] },
    },
  },
  {
    path: "/wip/inhouse/mutation-detail",
    name: "wip-inhouse-mutation-detail",
    component: () =>
      import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      requiresAuth: true,
    },
  },
  {
    path: "/wip/inhouse/monitoring",
    name: "wip-monitoring-inhouse",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      // requiresAuth: true,
      title: "Monitoring",
      icon: "mdi-chart-box",
      // headers: ["Logistic","WIP","In House"],
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "WIP", icon: "mdi-progress-wrench" },          
          { title: "In House" }                           
      ],
      // header: "WIP",
      // subHeader: "In House",
      permission: {
        parent: "Module.View.MonitoringWipInhouse",
        child: ["Download"],
      },
    },
  },
  {
    path: "/display/:type",
    name: "ifp-display",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      requiresAuth: true,
    },
  },
  // Dept Stamping
  
  {
    path: "/production/stamping/lkh/create",
    name: "production-stamping-lkh-create",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      title: "Create LKH",
      createSideBar: false,
      permission: { parent: "Production.Create.LkhStamping", child: [] },
      requiresAuth: true,
    },
  },
  // Dept Welding Production

  
  {
    path: "/production/welding/lkh",
    name: "production-welding-lkh",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      // requiresAuth: true,
      title: "LKH",
      icon: "mdi-clipboard-list-outline",
      // headers: ["Welding","Production"],
      headers: [
          { title: "Welding", icon: "mdi-robot-industrial" },         
          { title: "Production"},                           
      ],
      // header: "Production",
      // subHeader: "Welding",
      permission: {
        parent: "Production.View.LkhWelding",
        child: ["Create", "Update", "Download"],
      },
    },
  },
  {
    path: "/production/welding/lkh/create",
    name: "production-welding-lkh-create",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      title: "Create LKH",
      createSideBar: false,
      permission: { parent: "Production.Create.LkhWelding", child: [] },
      requiresAuth: true,
    },
  },
  // {
  //   path: "/report/UploadGlc",
  //   name: "report-glc",
  //   component: () => import("@/views/admin/Report/Stamping/Achievement/UploadGlc"),
  //   meta: {
  //     createSideBar: true,
  //     requiresAuth: true,
  //     title: "GLC Per Week",
  //     icon: "mdi-chart-bar",
  //     header: "Report",
  //     subHeader: "Stamping",
  //     permission: {
  //       parent: "Report.View.UploadGlc",
  //       child: ["Create"],
  //     },
  //   },
  // },
  
  // {
  //   path: "/production/stamping/achievement/IndexPageQuality",
  //   name: "production-stamping-quality",
  //   component: () =>
  //     import("@/views/admin/Production/Stamping/Achievement/IndexPageQuality"),
  //   meta: {
  //     createSideBar: true,
  //     requiresAuth: true,
  //     title: "Quality",
  //     icon: "mdi-check-decagram",
  //     header: "Production",
  //     subHeader: "Stamping",
  //     permission: {
  //       parent: "Production.View.Quality",
  //       child: ["Create", "Update"],
  //     },
  //   },
  // },
  
  // {
  //   path: "/production/stamping/achievement/GangguanDies",
  //   name: "production-stamping-gangguan-dies",
  //   component: () =>
  //     import("@/views/admin/Production/Stamping/Achievement/GangguanDies"),
  //   meta: {
  //     createSideBar: true,
  //     requiresAuth: true,
  //     title: "Gangguan Dies",
  //     icon: "mdi-alert-box",
  //     header: "Production",
  //     subHeader: "Stamping",
  //     permission: {
  //       parent: "Production.View.GangguanDies",
  //       child: ["Create", "Update"],
  //     },
  //   },
  // },
  // {
  //   path: "/production/stamping/achievement/GangguanSarana",
  //   name: "production-stamping-gangguan-sarana",
  //   component: () =>
  //     import("@/views/admin/Production/Stamping/Achievement/GangguanSarana"),
  //   meta: {
  //     createSideBar: true,
  //     requiresAuth: true,
  //     title: "Gangguan Sarana",
  //     icon: "mdi-alert-box",
  //     header: "Production",
  //     subHeader: "Stamping",
  //     permission: {
  //       parent: "Production.View.GangguanSarana",
  //       child: ["Create", "Update"],
  //     },
  //   },
  // },{
  //   path: "/production/stamping/achievement/GangguanMesin",
  //   name: "production-stamping-gangguan-mesin",
  //   component: () =>
  //     import("@/views/admin/Production/Stamping/Achievement/GangguanMesin"),
  //   meta: {
  //     createSideBar: true,
  //     requiresAuth: true,
  //     title: "Gangguan Mesin",
  //     icon: "mdi-cog-outline",
  //     header: "Production",
  //     subHeader: "Stamping",
  //     permission: {
  //       parent: "Production.View.GangguanMesin",
  //       child: ["Create", "Update"],
  //     },
  //   },
  // },
  // {
  //   path: "/production/stamping/achievement/GangguanDies",
  //   name: "production-stamping-gangguan-dies",
  //   component: () =>
  //     import("@/views/admin/Production/Stamping/Achievement/GangguanDies"),
  //   meta: {
  //     createSideBar: true,
  //     requiresAuth: true,
  //     title: "Gangguan Dies",
  //     icon: "mdi-alert-box",
  //     header: "Production",
  //     subHeader: "Stamping",
  //     permission: {
  //       parent: "Production.View.GangguanDies",
  //       child: ["Create", "Update"],
  //     },
  //   },
  // },
  // {
  //   path: "/production/stamping/achievement/GangguanSarana",
  //   name: "production-stamping-gangguan-sarana",
  //   component: () =>
  //     import("@/views/admin/Production/Stamping/Achievement/GangguanSarana"),
  //   meta: {
  //     createSideBar: true,
  //     requiresAuth: true,
  //     title: "Gangguan Sarana",
  //     icon: "mdi-alert-box",
  //     header: "Production",
  //     subHeader: "Stamping",
  //     permission: {
  //       parent: "Production.View.GangguanSarana",
  //       child: ["Create", "Update"],
  //     },
  //   },
  // },
  {
    path: "/andon-production-machine/:machine",
    name: "andon-production-machine",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      title: "Machine",
      icon: "mdi-clipboard-list-outline",
      // headers: ["Stamping","Production"],
      headers: [
          { title: "Stamping", icon: "mdi-tools" },         
          { title: "Production"},                           
      ],
      // header: "Production",
      // subHeader: "Stamping",
      createSideBar: true,
      layout: "blank",
      permission: {
        parent: "Production.View.AndonMachine",
        child: "",
      },
    },
  },
  {
    path: "/ifp/print/print-barcode",
    name: "ifp-print-barcode",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      requiresAuth: true,
      title: "Print Barcode Palet",
      icon: "mdi-printer",
      // headers: ["Logistic","IFP","Print"],
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "IFP", icon: "mdi-warehouse" },          
          { title: "Print" }                           
      ],
      // header: "IFP",
      // subHeader: "Print",
      permission: {
        parent: "Module.View.PrintBarcode",
        child: ["Create"],
      },
    },
  },
  {
    path: "/ifp/scan/scan-barcode-ifp",
    name: "ifp-scan-barcode-ifp",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      requiresAuth: true,
      title: "Scan Barcode IFP",
      icon: "mdi-barcode-scan",
      // headers: ["Logistic","IFP","Scan"],
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "IFP", icon: "mdi-warehouse" },          
          { title: "Scan" }                           
      ],
      // header: "IFP",
      // subHeader: "Scan",
      permission: {
        parent: "Module.View.ScanBarcodeIFP",
        child: ["Create", "Update"],
      },
    },
  },

  {
    path: "/ifp/scan/scan-barcode-shipping",
    name: "ifp-scan-barcode-shipping",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      requiresAuth: true,
      title: "Scan Barcode Shipping",
      icon: "mdi-barcode-scan",
      // headers: ["Logistic","IFP","Scan"],
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "IFP", icon: "mdi-warehouse" },          
          { title: "Scan" }                           
      ],
      // header: "IFP",
      // subHeader: "Scan",
      permission: {
        parent: "Module.View.ScanBarcodeShipping",
        child: ["Create", "Update"],
      },
    },
  },
  // {
  //   path: "/ifp/scan/scan-etd-maj",
  //   name: "ifp-scan-etd-maj",
  //   component: () => import("@/views/admin/Ifp/Scan/ScanBarcodeETD"),
  //   meta: {
  //     createSideBar: true,
  //     requiresAuth: true,
  //     title: "Scan Barcode ETD",
  //     icon: "mdi-barcode",
  //     header: "IFP",
  //     subHeader: "Scan",
  //     permission: {
  //       parent: "Module.View.ScanBarcodeShipping",
  //       child: ["Create","Update"],
  //     },
  //   },
  // },
  // {
  //   path: "/report/scan/scan-sto",
  //   name: "report-scan-sto",
  //   component: () => import("@/views/admin/Report/Sto/StoStock.vue"),
  //   meta: {
  //     createSideBar: true,
  //     requiresAuth: true,
  //     title: "Scan STO",
  //     icon: "mdi-barcode",
  //     header: "Report",
  //     subHeader: "STO",
  //     permission: {
  //       parent: "Report.View.ScanBarcodeKanban",
  //       child: ["Create","Update"],
  //     },
  //   },
  // },
  {
    path: "/report/sto/kanban",
    name: "report-sto-kanban",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      // requiresAuth: true,
      title: "STO Kanban",
      icon: "mdi-clipboard-list-outline",
      // headers: ["Stamping","Report"],
      headers: [
          { title: "Stamping", icon: "mdi-tools" },         
          { title: "Report"},                           
      ],
      // header: "Report",
      // subHeader: "Stamping",
      permission: {
        parent: "Report.View.StoKanban",
        child: "",
      },
    },
  },
  {
    path: "/ifp/print/print-preview-barcode",
    name: "ifp-print-preview-barcode",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/ifp/print/print-preview-repeat",
    name: "ifp-print-preview-repeat",
    component: () =>
      import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/production/stamping/print-tag-ok",
    name: "production-stamping-print-tag-ok",
    component: () =>
      import(
        "@/views/StarterPage.vue"
      ),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/production/tag-ok",
    name: "production-tag-ok",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/production-welding/tag-ok",
    name: "production-welding-tag-ok",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/production/print-e-kanban",
    name: "production-print-e-kanban",
    component: () =>
      import(
        "@/views/StarterPage.vue"
      ),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/production/welding/print-tag-ok",
    name: "production-welding-print-tag-ok",
    component: () =>
      import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/display-guest-book/:id",
    name: "display-guest-book",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/display-guest-book-2",
    name: "display-guest-book-2",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/asc-guest-book",
    name: "asc-guest-book",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/display-barcode-number-2",
    name: "display-barcode-number-2",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/display-chart",
    name: "display-chart",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  

  {
    path: "/report-order-daily",
    name: "report-order-daily",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/report-order-monthly",
    name: "report-order-monthly",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/running-text/:machine",
    name: "running-text",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/andon-stroke",
    name: "andon-stroke",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  // Finance
  {
    path: "/report-billing-customer/:period",
    name: "report-billing-customer",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/andon-finance-1",
    name: "andon-finance-1",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/andon-finance-2",
    name: "andon-finance-2",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/rundown-ifp",
    name: "rundown-ifp",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/rundown-ifp-adjustment",
    name: "rundown-ifp-adjustment",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/rundown-ifp-sap",
    name: "rundown-ifp-sap",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  // {
  //   path: "/rundown-ifp-sap/:group",
  //   name: "rundown-ifp-sap",
  //   component: () => import("@/views/Public/DisplayTotalRundownIFPSAP"),
  //   meta: {
  //     createSideBar: false,
  //     layout: "blank",
  //   },
  // },
  {
    path: "/rundown-pcs/:group",
    name: "rundown-pcs",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/andon-welding/:line",
    name: "andon-welding",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/andon-welding-detail/:line",
    name: "andon-welding-detail",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/andon-running-text",
    name: "andon-running-text",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/ifp/inhouse/scan",
    name: "ifp-inhouse-scan",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      // requiresAuth: true,
      title: "Scan Kanban ADM dan E-Kanban MAJ",
      icon: "mdi-barcode-scan",
      // headers: ["Logistic","IFP","In House"],
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "IFP", icon: "mdi-warehouse" },          
          { title: "In House" }                           
      ],
      // header: "IFP",
      // subHeader: "In House",
      permission: {
        parent: "Module.View.ScanLabel",
        child: ["Create"],
      },
    },
  },
  {
    path: "/production/welding/IndexPage",
    name: "production-welding",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      // requiresAuth: true,
      title: "Tag OK by Kanban",
      icon: "mdi-printer",
      // headers: ["Welding","Production"],
      headers: [
          { title: "Welding", icon: "mdi-robot-industrial" },         
          { title: "Production"},                           
      ],
      // header: "Production",
      // subHeader: "Welding",
      permission: {
        parent: "Production.View.TagOKWLD",
        child: ["Create"],
      },
    },
  },
  // {
  //   path: "/production/welding/IndexPage/v2",
  //   name: "production-welding-tag-ok",
  //   component: () =>
  //     import("@/views/admin/Production/Welding/IndexPageV2"),
  //   meta: {
  //     createSideBar: true,
  //     requiresAuth: true,
  //     title: "Print E Tag V2",
  //     icon: "mdi-printer",
  //     header: "Production",
  //     subHeader: "Welding",
  //     permission: {
  //       parent: "Production.View.TagOKWLDV2",
  //       child: ["Create"],
  //     },
  //   },
  // },
  
  {
    path: "/andon-next-process",
    name: "andon-next-process",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  // {
  //   path: "/ifp/soal",
  //   name: "ifp-soal",
  //   component: () => import("@/views/admin/Ifp/Inhouse/SoalLatihan"),
  //   meta: {
  //     createSideBar: true,
  //     requiresAuth: true,
  //     title: "Soal",
  //     icon: "mdi-clipboard-list-outline",
  //     header: "IFP",
  //     subHeader: "In House",
  //     permission: {
  //       parent: "Ifp.View.Soal",
  //       child: [],
  //     },
  //   },
  // },

  {
    path: "/andon-press-summary",
    name: "andon-press-summary",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/andon-press-summary-office/:line/:page",
    name: "andon-press-summary-office",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/andon-press/:line",
    name: "andon-press",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/andon-akurasi",
    name: "andon-akurasi",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/ifp/inhouse/IndexPage",
    name: "ifp-inhouse",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      // requiresAuth: true,
      title: "Print E Tag",
      icon: "mdi-printer",
      // headers: ["Logistic","IFP","In House"],
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "IFP", icon: "mdi-warehouse" },          
          { title: "In House" }                           
      ],
      // header: "IFP",
      // subHeader: "In House",
      permission: {
        parent: "Production.View.TagOKIFP",
        child: ["Create"],
      },
    },
  },

  {
    path: "/mieruka-kap/:cycle",
    name: "mieruka-kap",
    component: () =>
      import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },
  {
    path: "/mieruka-sap/:cycle",
    name: "mieruka-sap",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/mieruka-spd/:cycle",
    name: "mieruka-spd",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/mieruka-ekspor/:cycle",
    name: "mieruka-ekspor",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/mieruka-shipping/:customer/:cycle",
    name: "mieruka-shipping",
    component: () =>
      import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/andon-production-running-text/:line",
    name: "andon-production-running-text",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/andon-running-text/static",
    name: "andon-running-text-static",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  // PUD

  {
    path: "/summary-supplier/:supplier",
    name: "summary-supplier",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/report-supplier/:supplier/:customer",
    name: "report-supplier",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  

  {
    path: "/andon-production-line-sap/:line",
    name: "andon-production-line-sap",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/andon-production-welding/:line",
    name: "andon-production-welding",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/ifp/inhouse/cycle-management",
    name: "ifp-inhouse/cycle-management",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      requiresAuth: true,
      title: "Master Cycle",
      icon: "mdi-timetable",
      // headers: ["Logistic","IFP","In House"],
      headers: [
          { title: "Logistic", icon: "mdi-truck-delivery" },
          { title: "IFP", icon: "mdi-warehouse" },          
          { title: "In House" }                           
      ],
      // header: "IFP",
      // subHeader: "In House",
      permission: {
        parent: "Module.View.MasterCycle",
        child: ["Update", "Create"],
      },
    },
  },

  // {
  //   path: "/ifp/inhouse/rundown-stock-sap",
  //   name: "ifp-inhouse/rundown-stock-sap",
  //   component: () => import("@/views/admin/Ifp/Inhouse/RundownStockSAP"),
  //   meta: {
  //     createSideBar: true,
  //     requiresAuth: true,
  //     title: "Rundown Stock SAP",
  //     icon: "mdi-chart-bar",
  //     header: "IFP",
  //     subHeader: "In House",
  //     permission: {
  //       parent: "Module.View.RundownStockSAP",
  //       child: ["Download"],
  //     },
  //   },
  // },

  // {
  //   path: "/detail-rundown-stock-sap/:customer/:model/:status",
  //   name: "detail-rundown-stock-sap",
  //   component: () => import("@/views/admin/Ifp/Inhouse/DetailRundownStockSAP"),
  //   meta: {
  //     createSideBar: false,
  //     layout: "blank2",
  //     permission: {
  //       parent: "Module.View.DetailRundownStockSAP",
  //       child: ["Download"],
  //     },
  //   },
  // },

  // DEPT WELDING
  // {
  //   path: "/report/welding/achievement-summary",
  //   name: "report-welding-achievement-summary",
  //   component: () =>
  //     import("@/views/admin/Report/Welding/Achievement/Summary"),
  //   meta: {
  //     createSideBar: true,
  //     requiresAuth: true,
  //     title: "Summary Achievement",
  //     icon: "mdi-clipboard-list-outline",
  //     header: "Report",
  //     subHeader: "Welding",
  //     permission: {
  //       parent: "Report.View.AchievementSummaryWelding",
  //       child: ["Download"],
  //     },
  //   },
  // },

  {
    path: "/production/welding/achievement/IndexPageSAP",
    name: "production-welding-achievement-sap",
    component: () =>
      import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      requiresAuth: true,
      title: "Achievement SAP",
      icon: "mdi-clipboard-list-outline",
      // headers: ["Welding","Production"],
      headers: [
          { title: "Welding", icon: "mdi-robot-industrial" },         
          { title: "Production"},                           
      ],
      // header: "Production",
      // subHeader: "Welding",
      permission: {
        parent: "Production.View.AchievementWeldingSAP",
        child: [],
      },
    },
  },

  // DEPT TOOLING
  // {
  //   path: "/tooling/dies/data-stroke",
  //   name: "tooling-dies-data-stroke",
  //   component: () => import("@/views/admin/Production/Tooling/DataStroke"),
  //   meta: {
  //     createSideBar: true,
  //     requiresAuth: true,
  //     title: "Report Stroke",
  //     icon: "mdi-clipboard-list-outline",
  //     header: "Report",
  //     subHeader: "Tooling",
  //     permission: {
  //       parent: "Report.View.DataStroke",
  //       child: ["Download", "Create"],
  //     },
  //   },
  // },

  // {
  //   path: "/tooling/dies/master-stroke",
  //   name: "tooling-dies-master-stroke",
  //   component: () => import("@/views/admin/Master/Stroke.vue"),
  //   meta: {
  //     createSideBar: true,
  //     title: "Master Stroke",
  //     icon: "mdi-form-select",
  //     header: "Master Data",
  //     subHeader: "Admin Tooling",
  //     requiresAuth: true,
  //     permission: {
  //       parent: "Master.View.MasterStroke",
  //       child: ["Create", "Update"],
  //     },
  //   },
  // },

  // Welding

  {
    path: "/andon-welding-line/:line",
    name: "andon-welding-line",
    component: () =>
      import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  // {
  //   path: "/andon-welding-summary",
  //   name: "andon-welding-summary",
  //   component: () => import("@/views/Public/AndonADM/ProductionWeldingSummary"),
  //   meta: {
  //     createSideBar: false,
  //     layout: "blank",
  //   },
  // },

  // {
  //   path: "/weekly-graph-welding",
  //   name: "weekly-graph-welding",
  //   component: () => import("@/views/Public/Andon/GraphWelding"),
  //   meta: {
  //     createSideBar: false,
  //     layout: "blank",
  //   },
  // },

  // Eksport
  // {
  //   path: "/ifp/ekspor/IndexPage",
  //   name: "ifp-ekspor",
  //   component: () =>
  //     import("@/views/admin/Ifp/Ekspor/IndexPage"),
  //   meta: {
  //     createSideBar: true,
  //     requiresAuth: true,
  //     title: "Print Barcode Sticker",
  //     icon: "mdi-printer",
  //     header: "IFP",
  //     subHeader: "Ekspor",
  //     permission: {
  //       parent: "Production.View.TagOKEkspor",
  //       child: ["Create"],
  //     },
  //   },
  // },

  // Management Display Andon in Production
  {
    path: "/management/andon/index",
    name: "management-andon-index",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      title: "Display Management",
      icon: "mdi-monitor-multiple",
      headers: [
          { title: "Admin", icon: "mdi-account-cog" },
          { title: "Display"},                     
      ],
      // header: "Master Data",
      // subHeader: "Andon",
      // requiresAuth: true,
      permission: {
        parent: "Master.View.AndonManagement",
        child: ["Create", "Update"],
      },
    },
  },

  // {
  //   path: "/management/andon/socket-io/index",
  //   name: "management-andon/socket-io-index",
  //   component: () => import("@/views/admin/Andon/IndexSocketIOPage.vue"),
  //   meta: {
  //     createSideBar: true,
  //     title: "Display Group with Socket IO",
  //     icon: "mdi-monitor-multiple",
  //     header: "Master Data",
  //     subHeader: "Andon",
  //     requiresAuth: true,
  //     permission: {
  //       parent: "Master.View.AndonManagement",
  //       child: ["Create", "Update"],
  //     },
  //   },
  // },

  // Display Andon dari Database
  {
    path: "/andon/:shortlink",
    name: "andon",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/countdown/",
    name: "countdown",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/countdown/job/index",
    name: "countdown-job-index",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      title: "Job Schedule Countdown",
      icon: "mdi-monitor-multiple",
      headers: [
          { title: "Admin", icon: "mdi-account-cog" },
          { title: "Display"},                     
      ],
      // header: "Master Data",
      // subHeader: "Andon",
      // requiresAuth: true,
      permission: {
        parent: "Master.View.CountdownManagement",
        child: ["Create", "Update"],
      },
    },
  },

  // Press
  {
    path: "/weekly-graph-press",
    name: "weekly-graph-press",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: "/bren-andon",
    name: "achievement-andon",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  {
    path: '/bren-andon2/:model',
    name: "forecastactual-andon",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank",
    },
  },

  // Consumable
  {
    path: "/master-data/consumable",
    name: "master-data-consumable",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      requiresAuth: true,
      title: "Goods",
      icon: "mdi-package",
      // headers: ["Admin","Consumable"],
      headers: [
          { title: "Admin", icon: "mdi-account-cog" },
          { title: "Consumable" },                     
      ],
      // header: "Master Data",
      // subHeader: "Consumable",
      permission: {
        parent: "Master.View.Consumable",
        child: ["Create", "Update"],
      },
    },
  },
  {
    path: "/master-data/budget-consumable",
    name: "master-data-budget-consumable",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      requiresAuth: true,
      title: "Budget",
      icon: "mdi-cash-multiple",
      // headers: ["Admin","Consumable"],
      headers: [
          { title: "Admin", icon: "mdi-account-cog" },
          { title: "Consumable"},                     
      ],
      // header: "Master Data",
      // subHeader: "Consumable",
      permission: {
        parent: "Master.View.BudgetConsumable",
        child: ["Create", "Update"],
      },
    },
  },
  {
    path: "/master-data/incoming-consumable",
    name: "master-data-incoming-consumable",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      requiresAuth: true,
      title: "Incoming",
      icon: "mdi-package-down",
      // headers: ["Admin","Consumable"],
      headers: [
          { title: "Admin", icon: "mdi-account-cog" },
          { title: "Consumable"},                     
      ],
      // header: "Master Data",
      // subHeader: "Consumable",
      permission: {
        parent: "Master.View.IncomingConsumable",
        child: ["Create", "Update"],
      },
    },
  },

  // {
  //   path: "/report-sto",
  //   name: "report-sto",
  //   component: () => import("@/views/Public/ReportSTOPage"),
  //   meta: {
  //     createSideBar: false,
  //     layout: "blank2",
  //   },
  // },
  {
    path: "/pcd/stamping/achievement-graph",
    name: "stamping-achievement-graph",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: true,
      // requiresAuth: true,
      title: "Achievement Graph",
      icon: "mdi-clipboard-list-outline",
      // headers: ["PCD","Stamping"],
      headers: [
          { title: "PCD", icon: "mdi-clipboard-check-outline" },         
          { title: "Stamping"},                           
      ],
      // header: "PCD",
      // subHeader: "Stamping",
      permission: {
        parent: "Report.View.AchievementStampingGraph",
        child: ["PCD"],
      },
    },
  },

  {
    path: "/table-sto-report",
    name: "table-sto-report",
    component: () => import("@/views/StarterPage.vue"),
    meta: {
      createSideBar: false,
      layout: "blank2",
    },
  },
];
export const menu = [];
export const permissionList = [];

routes.forEach((route) => {
  if (route.meta.hasOwnProperty("createSideBar")) {
    if (route.meta.createSideBar) {
      menu.push(route);
      if (route.meta.hasOwnProperty("permission")) {
        if (route.meta.permission.parent) {
          if (route.meta.hasOwnProperty("header")) {
            if (!permissionList.hasOwnProperty(route.meta.header)) {
              permissionList[route.meta.header] = {
                type: "header",
                title: route.meta.header,
                content: {},
              };
            }
            if (route.meta.hasOwnProperty("subHeader")) {
              if (
                !permissionList[route.meta.header]["content"].hasOwnProperty(
                  route.meta.subHeader
                )
              ) {
                permissionList[route.meta.header]["content"][
                  route.meta.subHeader
                ] = {
                  type: "submenu",
                  title: route.meta.subHeader,
                  content: {},
                };
              }
              permissionList[route.meta.header]["content"][
                route.meta.subHeader
              ]["content"][route.meta.title] = {
                type: "link",
                title: route.meta.title,
                permission: route.meta.permission,
              };
            }
          } else {
            permissionList[route.meta.title] = {
              type: "link",
              title: route.meta.title,
              permission: route.meta.permission,
            };
          }
        }
      }
    }
  }
});
