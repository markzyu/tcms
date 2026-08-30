<script setup lang="ts">
  import { IonContent, IonPage, IonHeader, IonToolbar, IonTitle, toastController, IonList, IonItem } from '@ionic/vue';
  import { onMounted, ref } from 'vue';
  import { invokeWithType, LcdnInstanceConfig } from '../types';
  import { join } from '@tauri-apps/api/path';
  import { mkdir, writeTextFile } from '@tauri-apps/plugin-fs';
  import { PageContentSchemaJson, TemplateManifest, TemplateManifestSchema } from '@tcms/mini-app-common';
  import { useAppLanguageLocale } from '../../utils/i18n';
  import { useLibraryPageContent } from './content';
  import { v4 as uuidv4 } from 'uuid';
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

  const addNewTemplate = async (template: TemplateManifest) => {
    const currentLocale = locale.value;
    try {
      const osDataDir = await invokeWithType(z.string(), "ensure_os_data_dir");
      const instanceId = uuidv4();
      const instanceDir = await join(osDataDir, "public", "instances", instanceId);
      const instanceContentDir = await join(instanceDir, "content");
      const instanceConfigPath = await join(instanceDir, "instance.json");
      await mkdir(instanceDir, { recursive: true });
      await mkdir(instanceContentDir, { recursive: true });

      const instanceConfig: LcdnInstanceConfig = {
        instanceId,
        slug: instanceId,
        name: instanceId,
        templateScope: template.namespace ?? "",
        templateId: template.id,
        templateVersion: template.version,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        currentVariant: currentLocale,
        variants: [currentLocale],
      };
      await writeTextFile(instanceConfigPath, JSON.stringify(instanceConfig, null, 2));

      await Promise.all(Object.entries(template.pages).map(async ([pageName, pageProps]) => {
        const contentPath = await join(instanceContentDir, `${pageName}.${currentLocale}.json`);
        const schemaString = await invokeWithType(z.string(), "read_template_schema", {
          templateScope: template.namespace ?? "",
          templateName: template.id,
          schemaPath: pageProps.schema,
        });
        const schema: PageContentSchemaJson = JSON.parse(schemaString);
        await writeTextFile(contentPath, JSON.stringify(schema.editorDefaultValue || {}, null, 2));
      }));
    } catch (error) {
      const toast = await toastController.create({
        message: error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error),
        duration: 5000,
      });
      await toast.present();
      console.error(error);
    }
  };
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
          <ion-button slot="end" @click="addNewTemplate(template)">
            {{ templateAddNewBtnLabel }}
          </ion-button>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>