<script setup lang="ts">
  import { IonContent, IonPage, IonHeader, IonToolbar, IonTitle, toastController, IonList, IonItem } from '@ionic/vue';
  import { onMounted, ref } from 'vue';
  import { invokeWithType } from '../types';
  import { TemplateManifest, TemplateManifestSchema } from '@tcms/mini-app-common';
  import { useAppLanguageLocale } from '../../utils/i18n';
  import { useLibraryPageContent } from './content';
  import * as keys from './contentKeys';
  import z from 'zod';

  const locale = useAppLanguageLocale();
  const [libraryPageTitle, templateAddNewBtnLabel] = useLibraryPageContent([
    keys.LibraryPageTitle,
    keys.TemplateAddNewBtnLabel,
  ]);

  const templates = ref<TemplateManifest[]>([]);
  onMounted(async () => {
    try {
      const templateIds = await invokeWithType(z.array(z.array(z.string())), "list_templates");
      const manifests: TemplateManifest[] = [];
      await Promise.all(templateIds.map(async ([templateScope, templateName]) => {
        const manifestString = await invokeWithType(z.string(), "read_template_manifest", {
          templateScope,
          templateName,
        });
        const manifest: TemplateManifest = TemplateManifestSchema.parse(JSON.parse(manifestString));
        manifests.push(manifest);
      }));
      templates.value = manifests;
    } catch (error) {
      const toast = await toastController.create({
        message: error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error),
        duration: 5000,
      });
      await toast.present();
      console.error(error);
    }
  });
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title class="page-title" data-testid="library-page-title">
          {{ libraryPageTitle }}
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-item v-for="template in templates" :key="template.id">
          <ion-label>{{ template.title[locale] }}</ion-label>
          <ion-button slot="end">
            {{ templateAddNewBtnLabel }}
          </ion-button>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>