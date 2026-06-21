<script setup lang="ts">
import type { MenuCmsData } from "./cmsData";

defineProps<{
  cms: MenuCmsData;
}>();
</script>

<template>
  <article class="menu">
    <header>
      <h1>{{ cms.restaurantName }}</h1>
      <p class="tagline">{{ cms.tagline }}</p>
    </header>
    <ul>
      <li v-for="item in cms.items" :key="item.name">
        <strong>{{ item.name }}</strong>
        <span class="price">{{ item.price }}</span>
        <p>{{ item.description }}</p>
      </li>
    </ul>
  </article>
</template>

<style scoped>
.menu {
  max-width: 36rem;
  margin: 0 auto;
  font-family: system-ui, sans-serif;
}

.tagline {
  color: #555;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  border-bottom: 1px solid #ddd;
  padding: 0.75rem 0;
}

.price {
  float: right;
  font-weight: 600;
}
</style>
