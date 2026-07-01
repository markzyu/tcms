import { contactCardSchemaName, contactCardSchemaPathPromise } from "./contactCard";
import { defineRootManifest } from "@pcms/mini-app-common";

defineRootManifest({
  id: "contact-card",
  title: "Contact Card",
  version: "1.0.0",
  pages: {
    [contactCardSchemaName]: {
      schema: await contactCardSchemaPathPromise,
    },
  },
});