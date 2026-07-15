<script setup lang="ts">
  import { IonButton, IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, IonButtons, IonIcon, IonSpinner, IonList, IonItem, IonInput, IonTextarea } from '@ionic/vue';
  import { alertCircle, moon, playCircle } from 'ionicons/icons';
  import { computed, ref, watch } from 'vue';
  import { useEditableInstanceConfigs, useLocalCDNControls } from './hooks';

  const cardInstanceId = '6fa27a2f-2f1e-413d-a842-424242424242';
  const {
    isLoadingInstanceConfig,
    contentJson,
    urlSlug,
  } = useEditableInstanceConfigs(cardInstanceId, (url) => {
    urlToVisit.value = url;
  });

  const {
    isLocalCDNRunning,
    isLocalCDNStarting,
    isLocalCDNStopping,
    currentLCDNSlug,
    localCDNError,
    startLocalCDN,
    stopLocalCDN,
    urlToVisit,
  } = useLocalCDNControls();
  const showErrorTooltip = ref(false);

  const isSlugDirty = computed(() => urlSlug.value !== currentLCDNSlug.value);
  const iframeSrc = computed(() => urlToVisit.value ?? 'https://picsum.photos/600/400');
  watch(localCDNError, (newVal) => {
    if (newVal) {
      setTimeout(() => {
        showErrorTooltip.value = true;
      }, 100);
    }
  });
  const dismissErrorTooltip = () => {
    localCDNError.value = null;
    showErrorTooltip.value = false;
  };
</script>

<template>
  <ion-page @click="dismissErrorTooltip">
    <ion-header>
      <ion-toolbar class="toolbar-container">
        <ion-buttons slot="start">
          <ion-button>
            <ion-icon :icon="moon" />
          </ion-button>
        </ion-buttons>
        <ion-title class="page-title" data-testid="home-page-title">
          Home
        </ion-title>
        <ion-buttons slot="end">
          <ion-button>
            <ion-icon :icon="playCircle" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="isLoadingInstanceConfig" class="flex h-full w-full items-center justify-center absolute left-0 top-0 z-10 bg-white" data-testid="loading-configs-spinner">
        <ion-spinner />
      </div>
      <div class="w-full -lg:flex flex-col px-4 py-6 gap-4 lg:grid lg:grid-cols-[500px_1fr] lg:px-[60px]">
        <ion-card class="w-full mx-auto max-w-[500px]">
          <div class="relative h-[220px] rounded-t-sm overflow-hidden">
            <iframe data-testid="preview-iframe" class="absolute left-0 top-0 w-full object-cover max-w-none h-full -z-10" :src="iframeSrc" alt="Random image" referrerpolicy="no-referrer" />
          </div>
          <ion-card-content class="-mb-2" data-testid="home-status">
            Test: {{ urlSlug }} {{ isLocalCDNRunning ? '(Running)' : '' }} {{ localCDNError ? '(Error)' : '' }}
          </ion-card-content>
          <div class="flex justify-end gap-2">
            <ion-button size="small" fill="clear" data-testid="start-cdn-button" @click="urlSlug && startLocalCDN(urlSlug)" v-if="!isLocalCDNRunning">
              <ion-spinner class="w-4 h-4 mr-2" v-if="isLocalCDNStarting"></ion-spinner>
              <ion-icon class="w-4 h-4 mr-1 fill-red-600" :icon="alertCircle" v-if="localCDNError"></ion-icon>
              Start
            </ion-button>
            <ion-button size="small" fill="clear" data-testid="stop-cdn-button" @click="stopLocalCDN" v-else>
              <ion-spinner class="w-4 h-4 mr-2" v-if="isLocalCDNStopping"></ion-spinner>
              Stop
            </ion-button>
            <div class="pointer-events-none absolute bottom-10 left-20 right-20 bg-white p-2 rounded-md shadow-md" v-if="localCDNError && showErrorTooltip">
              {{ localCDNError }}
            </div>
            <ion-button size="small" fill="clear" data-testid="edit-button">Edit</ion-button>
            <ion-button size="small" fill="clear" data-testid="share-button">Share</ion-button>
          </div>
        </ion-card>
        <ion-card class="w-full mx-auto max-w-[500px] lg:max-w-none pr-2">
          <ion-card-content class="" data-testid="debug-tools-heading">
            Debug Tools
          </ion-card-content>
          <ion-list>
            <ion-item>
              <ion-input type="text" label="URL Slug" data-testid="url-slug-input" v-model="urlSlug" :helper-text="isSlugDirty && isLocalCDNRunning ? 'Please restart the server to apply the new slug' : ''"></ion-input>
            </ion-item>
            <ion-item>
              <ion-textarea label="JSON Data" data-testid="json-data-textarea" v-model="contentJson"></ion-textarea>
            </ion-item>
          </ion-list>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.content {
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 20px;
  --padding-bottom: 20px;
}
</style>