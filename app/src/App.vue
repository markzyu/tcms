<script setup lang="ts">
import { computed } from 'vue';
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { type as osType, OsType } from '@tauri-apps/plugin-os';

const mobileOsTypes: OsType[] = ["android", "ios"];
const isMobile = computed(() => mobileOsTypes.includes(osType()));
</script>

<template>
  <ion-app :class="{ 'is-mobile-os': isMobile, 'is-desktop-os': !isMobile }">
    <ion-router-outlet></ion-router-outlet>
  </ion-app>
</template>