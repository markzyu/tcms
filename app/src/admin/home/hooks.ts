import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";

export const useLocalCDNControls = (initSlug: string, onStarted: () => Promise<void>) => {
  const isLocalCDNRunning = ref(false);
  const isLocalCDNError = ref(false);
  const isLocalCDNStarting = ref(false);
  const isLocalCDNStopping = ref(false);
  const currentLCDNSlug = ref(initSlug);
  const startLocalCDN = async () => {
    try {
      await invoke("lcdn_start");
      await onStarted();
      // Randomly decide if the local CDN will error, for testing purposes
      if (_decideLocalCDNError()) {
        isLocalCDNError.value = true;
        isLocalCDNRunning.value = false;
      } else {
        isLocalCDNError.value = false;
        isLocalCDNRunning.value = true;
      }
    } catch (error) {
      console.error("TESTT", error);
    }
  };
  const stopLocalCDN = () => {
    isLocalCDNStopping.value = true;
    setTimeout(() => {
      isLocalCDNStopping.value = false;
      isLocalCDNRunning.value = false;
      isLocalCDNError.value = false;
    }, 1000);
  };
  return {
    isLocalCDNRunning,
    isLocalCDNError,
    isLocalCDNStarting,
    isLocalCDNStopping,
    currentLCDNSlug,
    startLocalCDN,
    stopLocalCDN,
  };
};

// This is meant to be a test harness to override the random decision for local CDN error
export const _decideLocalCDNError = () => {
  return Math.random() > 0.7;
};