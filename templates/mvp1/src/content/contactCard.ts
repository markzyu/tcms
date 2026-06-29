import type { EditorUiSchema } from "@pcms/mini-app-common";
import { z } from "zod";

export const schemaVersion = "0.1.0";

export const contactCardContentSchema = z.object({
  name: z.string(),
  headline: z.string(),
  bio: z.string(),
  email: z.string(),
  phone: z.string(),
  heroImage: z.string(),
  heroAltText: z.string().optional(),
  heroAlignment: z.enum(["left", "right"]).optional(),
});

export type ContactCardContent = z.infer<typeof contactCardContentSchema>;

export const contactCardEditorUiSchema: EditorUiSchema = {
  fieldGroups: [
    {
      name: "Basic Information",
      paths: ["name", "headline", "bio"],
      isSingleton: true,
    },
    {
      name: "Contact Information",
      paths: ["email", "phone"],
      isSingleton: true,
    },
    {
      isSingleField: true,
      isSingleton: true,
      paths: ["heroImage"],
    },
  ],
};

export const contactCardTemplateManifest = {
  id: "contact-card",
  version: "1.0.0",
  title: "Contact Card",
  dependencies: {
    react: "/react@18.3.1/dist/react.production.min.js",
    "react-dom": "/react-dom@18.3.1/dist/react-dom.production.min.js",
  },
  pages: {
    main: {
      schema: "content.schema.json",
    },
  },
} as const;

/** @pcms/mini-app-build-utils config module exports */
export const contentSchema = contactCardContentSchema;
export const editorUiSchema = contactCardEditorUiSchema;
export const templateManifest = contactCardTemplateManifest;
