import { createApp } from "vue";
import { IonicVue } from '@ionic/vue';
import App from "./App.vue";
import "./main.css";

// For additional CSS: https://ionicframework.com/docs/vue/add-to-existing

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

createApp(App).use(IonicVue).mount("#app");
