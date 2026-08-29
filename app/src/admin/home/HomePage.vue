<script setup lang="ts">
  import { IonButton, IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonIcon } from '@ionic/vue';
  import { moon, shareSocial } from 'ionicons/icons';
  import InstanceCard from './InstanceCard.vue';

  const cardInstanceId = '6fa27a2f-2f1e-413d-a842-424242424242';
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
        <instance-card :instance-id="cardInstanceId" />
      </div>
    </ion-content>
  </ion-page>
</template>