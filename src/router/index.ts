// import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
// import MainRoutes from './MainRoutes';
// import PublicRoutes from './PublicRoutes';
// import { useAuthStore } from '@/stores/auth';
// import { useUIStore } from '@/stores/ui';
// import { useConfigStore } from '@/stores/config';
// import { useNotificationStore } from '@/stores/notification';

// export const router = createRouter({
//   history: createWebHistory(import.meta.env.BASE_URL),
//   routes: [
//     {
//       path: '/:pathMatch(.*)*',
//       component: () => import('@/views/errors/Error404Page.vue')
//     },
//     MainRoutes as RouteRecordRaw,
//     PublicRoutes as RouteRecordRaw
//   ]
// });

// router.beforeEach((to, _from, next) => {
//   const authStore = useAuthStore();
//   const configStore = useConfigStore();
//   const notificationStore = useNotificationStore();

//   // Check if route requires authentication
//   if (to.matched.some((record) => record.meta.requiredAuth)) {
//     // Check if user has a valid token (not just user object which is always truthy)
//     if (authStore.token) {
//       // Check if token is expired
//       if (authStore.checkExpired()) {
//         authStore.logout();
//         notificationStore.showDialogWarning(
//           "Session Expired",
//           "Your session has expired. Please login again.",
//           () => {
//             next('/login');
//           }
//         );
//         return;
//       }

//       // Set user data from token if not already set
//       if (!authStore.user.username) {
//         authStore.setUserData(authStore.token);
//       }

//       // Set page info
//       if (to.meta.title) {
//         configStore.page.name = to.meta.title as string;
//       }

//       // Check permissions
//       if (authStore.checkPermission(to.meta)) {
//         next();
//       } else {
//         notificationStore.showAlertWarning("Access Denied!!");
//         next(false); // Cancel navigation
//         return;
//       }
//     } else {
//       // No token, redirect to login
//       authStore.returnUrl = to.fullPath;
//       next('/login');
//     }
//   } else {
//     // Public route or login page
//     if (authStore.token && to.path === '/login') {
//       // Already logged in, redirect to dashboard
//       next('/');
//     } else {
//       next();
//     }
//   }
// });

// router.beforeEach(() => {
//   const uiStore = useUIStore();
//   uiStore.isLoading = true;
// });

// router.afterEach(() => {
//   const uiStore = useUIStore();
//   uiStore.isLoading = false;
// });
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import MainRoutes from './MainRoutes';
import PublicRoutes from './PublicRoutes';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { useConfigStore } from '@/stores/config';
import { useNotificationStore } from '@/stores/notification';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/:pathMatch(.*)*',
      component: () => import('@/views/errors/Error404Page.vue')
    },
    MainRoutes as RouteRecordRaw,
    PublicRoutes as RouteRecordRaw
  ]
});

// ==================== NAVIGATION GUARDS ====================

/**
 * Main navigation guard
 * Handles: Authentication, Authorization, Page Title, Loading State
 */
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const configStore = useConfigStore();
  const uiStore = useUIStore();
  const notificationStore = useNotificationStore();

  // Start loading
  uiStore.isLoading = true;

  // Set page title
  setPageTitle(to.meta.title as string);

  // Handle authentication
  if (to.matched.some((record) => record.meta.requiredAuth)) {
    handleAuthenticatedRoute(to, next, authStore, configStore, notificationStore);
  } else {
    handlePublicRoute(to, next, authStore);
  }
});

/**
 * Stop loading after navigation completes
 */
router.afterEach(() => {
  const uiStore = useUIStore();
  uiStore.isLoading = false;
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Set page title from route meta
 */
function setPageTitle(title?: string): void {
  if (title) {
    document.title = `${title} - MIMS`;
  } else {
    document.title = 'MIMS';
  }
}

/**
 * Handle routes that require authentication
 */
function handleAuthenticatedRoute(
  to: any,
  next: any,
  authStore: ReturnType<typeof useAuthStore>,
  configStore: ReturnType<typeof useConfigStore>,
  notificationStore: ReturnType<typeof useNotificationStore>
): void {
  // Check if user has valid token
  if (!authStore.token) {
    // No token, redirect to login
    authStore.returnUrl = to.fullPath;
    next('/login');
    return;
  }

  // Check if token is expired
  const checkToken = setInterval(() => {
    if (authStore.checkExpired()) {
      clearInterval(checkToken);

      notificationStore.showDialogWarning('Session Expired', 'Your session has expired. Please login again.', () => {
        authStore.logout();
        next('/login');
      });
      setTimeout(() => {
        notificationStore.dialog.status = false;
        authStore.logout();
        next('/login');
      }, 30000);
    }
  }, 1000);

  // Set user data from token if not already set
  if (!authStore.user.username) {
    authStore.setUserData(authStore.token);
  }

  // Set page info in config store
  if (to.meta.title) {
    configStore.page.name = to.meta.title as string;
  }

  // Check permissions
  if (!authStore.checkPermission(to.meta)) {
    notificationStore.showAlertWarning('Access Denied!!');
    next(false); // Cancel navigation
    return;
  }

  // All checks passed, proceed
  next();
}

/**
 * Handle public routes (no authentication required)
 */
function handlePublicRoute(to: any, next: any, authStore: ReturnType<typeof useAuthStore>): void {
  // If already logged in and trying to access login page
  if (authStore.token && to.path === '/login') {
    // ?redirect=/path (mis. dari halaman scan QR aset); hanya path internal.
    const redirect = typeof to.query.redirect === 'string' && /^\/(?!\/)/.test(to.query.redirect) ? to.query.redirect : '/';
    next(redirect);
    return;
  }

  // Proceed to public route
  next();
}

export default router;
