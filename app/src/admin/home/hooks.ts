import { onMounted, ref, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { invokeWithType, LcdnConfig, LcdnInstanceConfig, LcdnInstanceConfigSchema, LcdnStatusSchema } from "../tauri-types";
import { z } from "zod";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { toastController } from "@ionic/vue";
import { debounce } from "lodash";

/**
 * @param onUrlUpdate Callback to update the URL to visit. url is null when the local CDN is stopped.
 * @returns 
 */
export const useLocalCDNControls = (onUrlUpdate: (url: string | null) => void) => {
  const isLocalCDNRunning = ref(false);
  const isLocalCDNStarting = ref(false);
  const isLocalCDNStopping = ref(false);
  const localCDNHost = ref<string | null>(null);
  const localCDNError = ref<string | null>(null);
  const updateLocalCDNStatus = async () => {
    try {
      const status = await invokeWithType(LcdnStatusSchema, "lcdn_status");
      localCDNHost.value = status.port ? `http://localhost:${status.port}` : null;
      isLocalCDNRunning.value = status.running;

      if (status.running) {
        isLocalCDNStarting.value = false;
      } else {
        isLocalCDNStopping.value = false;
      }
    } catch (error) {
      localCDNHost.value = null;
      localCDNError.value = "Failed to get local CDN status: " + error;
      isLocalCDNRunning.value = false;
    }
  }
  const startLocalCDN = async (slugToVisit: string) => {
    try {
      const lcdnConfig: LcdnConfig = {
        port: 8088,
        startupTimeout: 3000,
        instanceIds: ["6fa27a2f-2f1e-413d-a842-424242424242"],
        sameOriginDomains: ["localhost:8088", "127.0.0.1:8088"],
      };

      const osDataDir = await invokeWithType(z.string(), "ensure_os_data_dir");
      const publicContentPath = osDataDir + "/public";
      console.log("publicContentPath", publicContentPath);

      const args = {
        lcdnConfig,
        publicContentPath,
      }
      await invoke("lcdn_start", args);

      onUrlUpdate(`http://localhost:${lcdnConfig.port}/${slugToVisit}`);
    } catch (error) {
      localCDNError.value = String(error);
    }
    await updateLocalCDNStatus();
  };
  const stopLocalCDN = async () => {
    isLocalCDNStopping.value = true;
    onUrlUpdate(null);
    try {
      await invoke("lcdn_stop");
    } catch (error) {
      localCDNError.value = String(error);
    }
    await updateLocalCDNStatus();
  };
  return {
    isLocalCDNRunning,
    isLocalCDNStarting,
    isLocalCDNStopping,
    localCDNHost,
    localCDNError,
    startLocalCDN,
    stopLocalCDN,
  };
};

export const useEditableInstanceConfigs = (instanceId: string, onUrlUpdate: (url: string) => void) => {
  const isLoadingInstanceConfig = ref(true);
  const instanceConfig = ref<LcdnInstanceConfig | null>(null);
  const contentJson = ref<string | null>(null);
  const urlSlug = ref<string>("");

  onMounted(async () => {
    try {
      const osDataDir = await invokeWithType(z.string(), 'ensure_os_data_dir');
      const instanceConfigStr = await readTextFile(osDataDir + '/public/instances/' + instanceId + '/instance.json');
      const config = LcdnInstanceConfigSchema.parse(JSON.parse(instanceConfigStr));
      instanceConfig.value = config;
      urlSlug.value = config.slug;

      const contentJsonStr = await readTextFile(osDataDir + '/public/instances/' + instanceId + '/content/main.en.json');
      contentJson.value = contentJsonStr;
      isLoadingInstanceConfig.value = false;
    } catch (error) {
      const toast = await toastController.create({
        message: 'Error loading configs: ' + String(error),
        duration: 5000,
      });
      await toast.present();
    }
  });

  const updateConfigsOnDisk = debounce(async (slug: string, rawContentJson: string) => {
    if (!instanceConfig.value) return;

    const osDataDir = await invokeWithType(z.string(), 'ensure_os_data_dir');
    const newInstanceConfig: LcdnInstanceConfig = {
      ...instanceConfig.value,
      slug,
    };
    await writeTextFile(osDataDir + '/public/instances/' + instanceId + '/instance.json', JSON.stringify(newInstanceConfig));
    await writeTextFile(osDataDir + '/public/instances/' + instanceId + '/content/main.en.json', rawContentJson);
    await invokeWithType(z.null(), 'lcdn_reload_configs');
    onUrlUpdate(`http://localhost:8088/${slug}?v=${Date.now()}`);
    instanceConfig.value = newInstanceConfig;
    contentJson.value = rawContentJson;
  }, 500);

  watch(([urlSlug, contentJson]), ([newUrlSlug, newContentJson]) => {
    if (newUrlSlug && newContentJson) {
      updateConfigsOnDisk(newUrlSlug, newContentJson);
    }
  });

  return {
    isLoadingInstanceConfig,
    instanceConfig,
    contentJson,
    urlSlug,
    updateConfigsOnDisk,
  }
};