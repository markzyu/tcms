<script setup lang="ts">
  import { IonButton, IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, IonButtons, IonIcon, IonSpinner, IonList, IonItem, IonInput, IonTextarea } from '@ionic/vue';
  import { alertCircle, moon, shareSocial } from 'ionicons/icons';
  import { computed, ref, watch } from 'vue';
  import { useEditableInstanceConfigs, useLocalCDNControls } from './hooks';
  import { useAdminHomePageContent } from './content';
  import { adminHomePageContentKeys } from './contentKeys';
  import { useRouter } from 'vue-router';
  import { ToolInput } from '../../tools/toolTypes';
  import { invokeWithType } from '../types';
  import { z } from 'zod';
  import { PageContentSchemaJson } from '@tcms/mini-app-common';
  import { v4 as uuidv4 } from 'uuid';

  const [
    instanceStartBtnLabel, instanceStopBtnLabel, instanceEditBtnLabel, instanceShareBtnLabel,
    debugToolsHeading, debugToolsSlugLabel, debugToolsJsonDataLabel,
  ] = useAdminHomePageContent(adminHomePageContentKeys);

  const showErrorTooltip = ref(false);
  const urlToVisit = ref<string | null>(null);

  const {
    isLocalCDNRunning,
    isLocalCDNStarting,
    isLocalCDNStopping,
    localCDNError,
    startLocalCDN,
    stopLocalCDN,
  } = useLocalCDNControls((url) => {
    urlToVisit.value = url;
  });

  const cardInstanceId = '6fa27a2f-2f1e-413d-a842-424242424242';
  const {
    isLoadingInstanceConfig,
    contentJson,
    urlSlug,
  } = useEditableInstanceConfigs(cardInstanceId, (url) => {
    urlToVisit.value = url;
  });

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

  const router = useRouter();
  const openEditWorkflow = async () => {
    const schemaString = await invokeWithType(z.string(), 'read_template_schema', {
      templateScope: '@tcms',
      templateName: 'template-example-info-card1',
    });
    const schema: PageContentSchemaJson = JSON.parse(schemaString);
    const input: ToolInput = {
      type: "jsonWithSchema",
      json: JSON.parse(contentJson.value ?? "{}"),
      filePath: {
        type: "miniAppContent",
        instanceId: cardInstanceId,
        _pathAsUrl: '/content/main.en.json',
      },
      jsonSchema: schema.jsonSchema,
      editorUiSchema: schema.editorUiSchema,
    };
    const inputString = JSON.stringify(input);
    const uuid = uuidv4();
    sessionStorage.setItem(`workflow-${uuid}`, inputString);
    router.push(`/tools/template-editor/workflow-${uuid}`);
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
            <ion-icon :icon="shareSocial" />
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
              {{ instanceStartBtnLabel }}
            </ion-button>
            <ion-button size="small" fill="clear" data-testid="stop-cdn-button" @click="stopLocalCDN" v-else>
              <ion-spinner class="w-4 h-4 mr-2" v-if="isLocalCDNStopping"></ion-spinner>
              {{ instanceStopBtnLabel }}
            </ion-button>
            <div class="pointer-events-none absolute bottom-10 left-20 right-20 bg-white p-2 rounded-md shadow-md" v-if="localCDNError && showErrorTooltip">
              {{ localCDNError }}
            </div>
            <ion-button size="small" fill="clear" data-testid="edit-button" @click="openEditWorkflow">{{ instanceEditBtnLabel }}</ion-button>
            <ion-button size="small" fill="clear" data-testid="share-button">{{ instanceShareBtnLabel }}</ion-button>
          </div>
        </ion-card>
        <ion-card class="w-full mx-auto max-w-[500px] lg:max-w-none pr-2">
          <ion-card-content class="" data-testid="debug-tools-heading">
            {{ debugToolsHeading }}
          </ion-card-content>
          <ion-list>
            <ion-item>
              <ion-input type="text" :label="debugToolsSlugLabel" data-testid="url-slug-input" v-model="urlSlug"></ion-input>
            </ion-item>
            <ion-item>
              <ion-textarea :label="debugToolsJsonDataLabel" data-testid="json-data-textarea" v-model="contentJson"></ion-textarea>
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