<script setup lang="ts">
  import { IonButton, IonCard, IonCardContent, IonIcon, IonSpinner, IonList, IonItem, IonInput, IonTextarea } from '@ionic/vue';
  import { alertCircle, createOutline } from 'ionicons/icons';
  import { computed, onUnmounted, ref, watch } from 'vue';
  import { useEditableInstanceConfigs, useLocalCDNControls } from './hooks.ts';
  import { useAdminHomePageContent } from './content.ts';
  import { useWorkflow } from '../ToolsScreen.vue';
  import { adminHomePageContentKeys } from './contentKeys.ts';
  import { ToolInput } from '../../tools/toolTypes.ts';
  import { invokeWithType } from '../types.ts';
  import { z } from 'zod';
  import { PageContentSchemaJson } from '@tcms/mini-app-common';

  type Props = {
    instanceId: string;
  };

  const props = defineProps<Props>();

  const [
    instanceStartBtnLabel, instanceStopBtnLabel, instanceEditBtnLabel, instanceEditPageContentBtnAriaLabel, instanceShareBtnLabel,
    statusRunningLabel, statusErrorLabel,
    debugToolsHeading, debugToolsSlugLabel, debugToolsJsonDataLabel,
  ] = useAdminHomePageContent(adminHomePageContentKeys);

  const showErrorTooltip = ref(false);
  const urlToVisit = ref<string | null>(null);
  const editStarted = ref(false);

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

  const {
    contentJson,
    isLoadingInstanceConfig,
    updateConfigsFromDisk,
    urlSlug,
  } = useEditableInstanceConfigs(props.instanceId, (url) => {
    urlToVisit.value = url;
  });

  const dismissErrorListener = () => {
    localCDNError.value = null;
    showErrorTooltip.value = false;
  };
  document.body.addEventListener('click', dismissErrorListener);
  onUnmounted(() => {
    document.body.removeEventListener('click', dismissErrorListener);
  });

  const iframeSrc = computed(() => urlToVisit.value ?? 'https://picsum.photos/600/400');
  watch(localCDNError, (newVal) => {
    if (newVal) {
      setTimeout(() => {
        showErrorTooltip.value = true;
      }, 100);
    }
  });

  const { startWorkflow } = useWorkflow();
  const openEditWorkflow = async () => {
    try {
      editStarted.value = false;
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
          instanceId: props.instanceId,
          _pathAsUrl: '/content/main.en.json',
        },
        jsonSchema: schema.jsonSchema,
        editorUiSchema: schema.editorUiSchema,
      };
      await startWorkflow('template-editor', input);
      await updateConfigsFromDisk();
    } catch (error) {
      console.error(error);
    }
  };
</script>

<template>
  <ion-card class="relative w-full mx-auto max-w-[500px]" data-testid="instance-card">
    <div v-if="isLoadingInstanceConfig" class="flex h-full w-full items-center justify-center absolute left-0 top-0 z-10 bg-white" data-testid="loading-configs-spinner">
      <ion-spinner />
    </div>
    <div class="relative h-[220px] rounded-t-sm overflow-hidden">
      <div v-if="editStarted" class="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]">
        <ion-button fill="outline" color="light" @click="openEditWorkflow" :aria-label="instanceEditPageContentBtnAriaLabel">
          <ion-icon slow="icon-only" :icon="createOutline" aria-hidden="true" />
        </ion-button>
      </div>
      <iframe
        data-testid="preview-iframe"
        :class="{
          'absolute left-0 top-0 w-full object-cover max-w-none h-full -z-10': true,
          'brightness-50': editStarted,
        }"
        :src="iframeSrc"
        alt="Random image"
        referrerpolicy="no-referrer"
      />
    </div>
    <ion-card-content class="-mb-2" data-testid="instance-status">
      <ion-input
        v-if="editStarted"
        class="-my-2"
        fill="outline"
        type="text"
        data-testid="url-slug-input"
        v-model="urlSlug"
      />
      <div v-else class="h-[40px]">
        {{ urlSlug }} {{ isLocalCDNRunning ? statusRunningLabel : '' }} {{ localCDNError ? statusErrorLabel : '' }}
      </div>
    </ion-card-content>
    <div class="flex justify-end gap-2 mt-2">
      <ion-button size="small" fill="clear" data-testid="start-cdn-button" @click="urlSlug && startLocalCDN([props.instanceId], urlSlug)" v-if="!isLocalCDNRunning">
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
      <ion-button size="small" fill="clear" data-testid="edit-button" @click="editStarted = !editStarted">{{ instanceEditBtnLabel }}</ion-button>
      <ion-button size="small" fill="clear" data-testid="share-button">{{ instanceShareBtnLabel }}</ion-button>
    </div>
  </ion-card>
  <ion-card class="hidden w-full mx-auto max-w-[500px] lg:max-w-none pr-2" data-testid="instance-debug-card">
    <ion-card-content data-testid="debug-tools-heading">
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
</template>

<style scoped>
.content {
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 20px;
  --padding-bottom: 20px;
}
</style>