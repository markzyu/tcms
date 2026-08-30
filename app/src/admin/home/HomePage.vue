<script setup lang="ts">
  import { IonButton, IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonIcon, onIonViewDidEnter } from '@ionic/vue';
  import { invokeWithType } from '../types.ts';
  import { moon, shareSocial } from 'ionicons/icons';
  import { ref } from 'vue';
  import { z } from 'zod';
  import InstanceCard from './InstanceCard.vue';

  const instanceIds = ref<string[]>([]);

  onIonViewDidEnter(async () => {
    instanceIds.value = await invokeWithType(z.array(z.string()), "list_instances");
  });
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
            <ion-icon :icon="shareSocial" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="w-full -lg:flex flex-col px-4 py-6 gap-4 lg:grid lg:grid-cols-[500px_1fr] lg:px-[60px]">
        <instance-card v-for="instanceId in instanceIds" :key="instanceId" :instance-id="instanceId" />
      </div>
    </ion-content>
  </ion-page>
</template>