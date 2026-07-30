import { type Preview, setup } from '@storybook/vue3-vite'; // or @storybook/vue3-webpack5
import { provide, watch } from 'vue';
import { IonicVue } from '@ionic/vue';
import { AppLanguageKey, createAppLanguageContext } from "../src/utils/i18n.ts";
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

let initIonicMode: "md" | "ios" | undefined;

setup((app, context) => {
  const ionicMode = context.globals.ionicMode as "md" | "ios";
  initIonicMode = ionicMode;
  app.use(IonicVue, { mode: ionicMode });
});

const appLanguageContext = createAppLanguageContext("en");

const preview: Preview = {
  decorators: [
    (story, context) => {
      const ionicMode = context.globals.ionicMode as "md" | "ios";
      const locale = context.globals.locale as AppLanguages;
      appLanguageContext.setLocale(locale);

      if (ionicMode !== initIonicMode) {
        window.location.reload();
      }

      return {
        components: { story: story() },
        setup() {
          provide(AppLanguageKey, appLanguageContext);
        },
        template: `<story />`,
      };
    }
  ],
  globalTypes: {
    ionicMode: {
      name: "Ionic Mode",
      defaultValue: "md",
      toolbar: {
        dynamicTitle: true,
        icon: "mobile",
        items: [
          { value: "md", title: "Desktop" },
          { value: "ios", title: "Mobile" },
        ],
      }
    },
    locale: {
      name: "Locale",
      defaultValue: "en",
      toolbar: {
        icon: "globe",
        items: [
          { value: "en", title: "English" },
          { value: "ja", title: "Japanese" },
        ],
      }
    }
  },
  parameters: {
    layout: 'fullscreen',
  },
};
export default preview;