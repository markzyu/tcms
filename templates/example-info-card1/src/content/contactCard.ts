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
  editorDefaultValue: {
    name: "",
    headline: "",
    bio: "",
    email: "email@example.com",
    phone: "(123) 456-7890",
    heroImage: "",
    heroAltText: "",
    heroAlignment: "left",
  },
  editorUiSchema: {
    fieldLabels: {
      en: {
        "name": "Name",
        "headline": "Headline",
        "bio": "Bio",
        "email": "Email",
        "phone": "Phone",
        "heroImage": "Hero Image",
        "heroAltText": "Hero Alt Text",
        "heroAlignment": "Hero Alignment",
        "heroAlignment.left": "Left",
        "heroAlignment.right": "Right",
      },
      ja: {
        "name": "名前",
        "headline": "職業",
        "bio": "自己紹介",
        "email": "メールアドレス",
        "phone": "電話番号",
        "heroImage": "写真",
        "heroAltText": "写真の代替テキスト",
        "heroAlignment": "写真の配置",
        "heroAlignment.left": "左",
        "heroAlignment.right": "右",
      },
    },
    fieldGroups: [
      {
        labelByLanguage: {
          en: "Basic Information",
          ja: "基本情報",
        },
        fields: [
          { path: "name" },
          { path: "headline" },
          { path: "bio", type: "textarea" },
        ],
      },
      {
        labelByLanguage: {
          en: "Contact Information",
          ja: "連絡先",
        },
        fields: [
          { path: "email", type: "input", inputType: "email" },
          { path: "phone", type: "input", inputType: "tel" },
        ],
      },
      {
        fields: [
          { path: "heroImage", type: "media" },
        ],
      },
    ],
  },
  schema: contactCardSchema,
});