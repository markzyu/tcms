export type { CDNBridge, CDNType } from "./cdn-bridge";
export type {
  ContentSchemaDocument,
  EditorUiFieldGroup,
  EditorUiSchema,
} from "./editor-ui-schema";

import type { CDNBridge } from "./cdn-bridge";

declare global {
  interface Window {
    pcms: {
      cdnBridge: CDNBridge;
    };
  }
}

export {};
