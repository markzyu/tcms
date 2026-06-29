export type { CDNRouter, CDNType } from "./cdn-router";

import type { CDNRouter } from "./cdn-router";

declare global {
  interface Window {
    pcms: {
      cdnRouter: CDNRouter;
    };
  }
}

export {};
