import { cleanUpSchemaDirectory, defineRootManifest } from "@tcms/mini-app-common";
await cleanUpSchemaDirectory();

// Do not import any schema until cleanup is done.
const { contactCardSchemaName, contactCardSchemaPathPromise } = await import("./contactCard");
defineRootManifest({
  namespace: "@tcms",
  id: "template-example-info-card1",
  title: {
    en: "[Example] Contact Card",
    ja: "[例] 連絡先カード",
  },
  version: "0.1.0",
  pages: {
    [contactCardSchemaName]: {
      schema: await contactCardSchemaPathPromise,
    },
  },
});