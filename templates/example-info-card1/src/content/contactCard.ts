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
    fieldLabels: {
      en: {
        name: "Name",
        headline: "Headline",
        bio: "Bio",
        email: "Email",
        phone: "Phone",
        heroImage: "Hero Image",
        heroAltText: "Hero Alt Text",
        heroAlignment: "Hero Alignment",
      },
      ja: {
        name: "名前",
        headline: "職業",
        bio: "自己紹介",
        email: "メールアドレス",
        phone: "電話番号",
        heroImage: "写真",
        heroAltText: "写真の代替テキスト",
        heroAlignment: "写真の配置",
      },
    },
    fieldGroups: [
      {
        labelByLanguage: {
          en: "Basic Information",
          ja: "基本情報",
        },
        paths: ["name", "headline", "bio"],
        isSingleton: true,
      },
      {
        labelByLanguage: {
          en: "Contact Information",
          ja: "連絡先",
        },
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