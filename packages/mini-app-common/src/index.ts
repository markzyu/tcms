export type { CDNBridge, CDNType } from "./cdn-bridge";

import type { CDNBridge } from "./cdn-bridge";

declare global {
  interface Window {
    pcms: {
      cdnBridge: CDNBridge;
    };
  }
}

export * from "./schemas";
