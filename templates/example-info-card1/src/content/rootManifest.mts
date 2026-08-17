import { cleanUpSchemaDirectory, defineRootManifest } from "@tcms/mini-app-common";
await cleanUpSchemaDirectory();

// Do not import any schema until cleanup is done.
const { contactCardSchemaName, contactCardSchemaPathPromise } = await import("./contactCard");
defineRootManifest({
  id: "example-info-card1",
  title: "[Example] Contact Card",
  version: "1.0.0",
  pages: {
    [contactCardSchemaName]: {
      schema: await contactCardSchemaPathPromise,
    },
  },
});