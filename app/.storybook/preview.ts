import { type Preview, setup } from '@storybook/vue3-vite'; // or @storybook/vue3-webpack5
import { IonicVue } from '@ionic/vue';
import '../src/main.css';
import './storybook.css'; // Path to your custom styles

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* For now, default to show system theme for dark/light mode */
import '@ionic/vue/css/palettes/dark.system.css';

setup((app) => {
  app.use(IonicVue);
});

const preview: Preview = {
  parameters: {},
};
export default preview;