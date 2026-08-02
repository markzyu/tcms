import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import TabsScreen from './admin/TabsScreen.vue';

// Tabs: Library, Home, Settings
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/',
    component: TabsScreen,
    children: [
      {
        path: '',
        redirect: '/home',
      },
      {
        path: 'home',
        component: () => import('./admin/home/HomePage.vue'),
      },
      {
        path: 'library',
        component: () => import('./admin/library/LibraryPage.vue'),
      },
      {
        path: 'settings',
        component: () => import('./admin/settings/SettingsPage.vue'),
      },
      {
        path: 'tools/:workflowId/:inputJson',
        component: () => import('./admin/ToolsScreen.vue'),
      },
    ],
  },
];

const router = createRouter({
  // Use: createWebHistory(process.env.BASE_URL) in your app
  history: createWebHistory(),
  routes,
});

export default router;