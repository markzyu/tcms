<script setup lang="ts">
import packageJson from '../package.json';
import { computed, onMounted, ref } from 'vue';
import { IonApp, IonRouterOutlet, toastController } from '@ionic/vue';
import { type as osType, OsType } from '@tauri-apps/plugin-os';
import { InstallStatus, InstallStatusSchema, invokeWithType } from './admin/tauri-types';
import { z } from 'zod';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';

const mobileOsTypes: OsType[] = ["android", "ios"];
const isMobile = computed(() => {
  try {
    return mobileOsTypes.includes(osType());
  } catch (error) {
    return false;
  }
});

// Returns true if the latest templates/prefabs are installed.
const checkInstallStatus = async () => {
  try {
    let osDataDir = await invokeWithType(z.string(), 'ensure_os_data_dir');
    let installStatusJsonPath = osDataDir + "/install-status.json";
    let installStatusJsonText = await readTextFile(installStatusJsonPath);
    let installStatus = InstallStatusSchema.parse(JSON.parse(installStatusJsonText));
    return installStatus.appVersion === packageJson.version;
  } catch (error) {
    console.error('Error checking install status', error);
    return false;
  }
};

const updateInstallStatus = async () => {
  let osDataDir = await invokeWithType(z.string(), 'ensure_os_data_dir');
  let installStatusJsonPath = osDataDir + "/install-status.json";
  let installStatus: InstallStatus = {
    appVersion: packageJson.version,
  };
  await writeTextFile(installStatusJsonPath, JSON.stringify(installStatus));
};

const isInstalling = ref(false);

onMounted(async () => {
  let isInstalled = await checkInstallStatus();
  if (!isInstalled) {
    isInstalling.value = true;
    console.log('Installing latest templates/prefabs...');
    try {
      await updateInstallStatus();
      await invoke('perform_first_time_setup');
    } catch (error) {
      const toast = await toastController.create({
        message: 'Error installing latest templates/prefabs: ' + String(error),
        duration: 5000,
      });
      await toast.present();
    }
    isInstalling.value = false;
  }
});
</script>

<template>
  <ion-app :class="{ 'is-mobile-os': isMobile, 'is-desktop-os': !isMobile }">
    <ion-router-outlet v-if="!isInstalling" />
    <div v-else class="mx-auto flex flex-col items-center justify-center h-screen">
      <ion-spinner name="crescent" />
      <p>Installing latest templates/prefabs...</p>
    </div>
  </ion-app>
</template>