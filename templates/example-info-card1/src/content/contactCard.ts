import { definePageContentSchema } from "@tcms/mini-app-common";
import { z } from "zod";

export const contactCardSchemaName = "main";
export const contactCardSchemaVersion = "0.1.0";
export const contactCardSchema = z.strictObject({
  name: z.string(),
  headline: z.string().optional(),
  bio: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  heroImage: z.string(),
  heroAltText: z.string().optional(),
  heroAlignment: z.enum(["left", "right"]).default("left"),
});

export type ContactCardContent = z.infer<typeof contactCardSchema>;

export const contactCardSchemaPathPromise = definePageContentSchema({
  schemaName: contactCardSchemaName,
  schemaVersion: contactCardSchemaVersion,
  editorUiSchema: {
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
  },
  schema: contactCardSchema,
});