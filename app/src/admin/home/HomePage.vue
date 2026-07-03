<script setup lang="ts">
  import { IonButton, IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, IonButtons, IonIcon, IonSpinner, IonList, IonItem, IonInput, IonTextarea } from '@ionic/vue';
  import { alertCircle, moon, playCircle } from 'ionicons/icons';
  import { computed, ref } from 'vue';
import { useLocalCDNControls } from './hooks';

  const initSlug = 'my-contact-card';

  const debugUrlSlug = ref(initSlug);
  const debugJson = ref('{}');
  const previewIframe = ref<HTMLIFrameElement | null>(null);

  const {
    isLocalCDNRunning,
    isLocalCDNError,
    isLocalCDNStarting,
    isLocalCDNStopping,
    currentLCDNSlug,
    startLocalCDN,
    stopLocalCDN,
  } = useLocalCDNControls(initSlug, async () => {
    if (previewIframe.value) {
      isLocalCDNStarting.value = true;
      previewIframe.value.src = previewIframe.value.src;
      // TODO: When we have real servers, race with a setTimeout to fail upon timeout
      await new Promise(resolve => previewIframe.value?.addEventListener('load', resolve, { once: true }));
      isLocalCDNStarting.value = false;
      currentLCDNSlug.value = debugUrlSlug.value;
    }
  });

  const isSlugDirty = computed(() => debugUrlSlug.value !== currentLCDNSlug.value);
</script>

<template>
  <ion-page>
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
      <div class="w-full flex flex-col px-4 py-6 gap-4">
        <ion-card class="w-full mx-auto max-w-200">
          <div class="relative h-50 rounded-t-sm overflow-hidden">
            <iframe ref="previewIframe" data-testid="preview-iframe" class="absolute left-0 top-0 w-full object-cover max-w-none h-full -z-10" src="https://picsum.photos/600/400" alt="Random image" />
          </div>
          <ion-card-content class="-mb-2" data-testid="home-status">
            Test: {{ debugUrlSlug }} {{ isLocalCDNRunning ? '(Running)' : '' }} {{ isLocalCDNError ? '(Error)' : '' }}
          </ion-card-content>
          <div class="flex justify-end gap-2">
            <ion-button size="small" fill="clear" data-testid="start-cdn-button" @click="startLocalCDN" v-if="!isLocalCDNRunning">
              <ion-spinner class="w-4 h-4 mr-2" v-if="isLocalCDNStarting"></ion-spinner>
              <ion-icon class="w-4 h-4 mr-1 fill-red-600" :icon="alertCircle" v-if="isLocalCDNError"></ion-icon>
              Start
            </ion-button>
            <ion-button size="small" fill="clear" data-testid="stop-cdn-button" @click="stopLocalCDN" v-else>
              <ion-spinner class="w-4 h-4 mr-2" v-if="isLocalCDNStopping"></ion-spinner>
              Stop
            </ion-button>
            <ion-button size="small" fill="clear" data-testid="edit-button">Edit</ion-button>
            <ion-button size="small" fill="clear" data-testid="share-button">Share</ion-button>
          </div>
        </ion-card>
        <ion-card class="w-full mx-auto max-w-200">
          <ion-card-content class="" data-testid="debug-tools-heading">
            Debug Tools
          </ion-card-content>
          <ion-list>
            <ion-item>
              <ion-input type="text" label="URL Slug" data-testid="url-slug-input" v-model="debugUrlSlug" :helper-text="isSlugDirty && isLocalCDNRunning ? 'Please restart the server to apply the new slug' : ''"></ion-input>
            </ion-item>
            <ion-item>
              <ion-textarea label="JSON Data" data-testid="json-data-textarea" v-model="debugJson"></ion-textarea>
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