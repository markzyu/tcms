<script setup lang="ts">
  import { IonToolbar, IonTitle, IonButtons, IonHeader, IonContent, IonPage } from '@ionic/vue';
  defineSlots<{
    default(props: {}): any;
    title?(props: {}): any;
    button1?(props: {}): any;
    button2?(props: {}): any;
  }>();
</script>

<template>
  <div class="custom-scrollbar">
    <ion-page>
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <slot name="button1" />
          </ion-buttons>
          <ion-title class="page-title">
            <slot name="title" />
          </ion-title>
          <ion-buttons slot="end">
            <slot name="button2" />
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content :fullscreen="true">
        <slot name="default" />
      </ion-content>
    </ion-page>
  </div>
</template>