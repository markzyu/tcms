import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { invokeWithType, LcdnConfig, LcdnStatusSchema } from "../tauri-types";

export const useLocalCDNControls = (initSlug: string) => {
  const isLocalCDNRunning = ref(false);
  const isLocalCDNStarting = ref(false);
  const isLocalCDNStopping = ref(false);
  const currentLCDNSlug = ref(initSlug);
  const localCDNHost = ref<string | null>(null);
  const localCDNError = ref<string | null>(null);
  const urlToVisit = ref<string | null>(null);
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
      const args = {
        lcdnConfig,
        publicContentPath: "/Users/mark/projects/tcms/app/public",
      }
      await invoke("lcdn_start", args);
      urlToVisit.value = `http://localhost:${lcdnConfig.port}/${slugToVisit}`;
      currentLCDNSlug.value = slugToVisit;
    } catch (error) {
      localCDNError.value = String(error);
    }
    await updateLocalCDNStatus();
  };
  const stopLocalCDN = async () => {
    isLocalCDNStopping.value = true;
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
    currentLCDNSlug,
    localCDNHost,
    localCDNError,
    startLocalCDN,
    stopLocalCDN,
    urlToVisit,
  };
};