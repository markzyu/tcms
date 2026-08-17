import { z } from "zod";
import { defineEditorUiField, defineEditorUiStringEnumField, defineEditorUiUnionField } from "../../../../packages/mini-app-common/src/schemas";

export const effectTypeSchema = z.enum([
  "movementSpeed",
  "itemVisibility",
  "screenZoom"
]);
export type EffectType = z.infer<typeof effectTypeSchema>;
export const effectTypeEditorField = defineEditorUiStringEnumField(effectTypeSchema, {
  en: {
    movementSpeed: "Movement Speed",
    itemVisibility: "Item Visibility",
    screenZoom: "Screen Zoom",
  },
  ja: {
    movementSpeed: "移動速度",
    itemVisibility: "アイテムの表示",
    screenZoom: "画面ズーム",
  },
});

/**
 * Multiple styles can be applied to the same text.
 */
export const textStyleSchema = z.strictObject({
  backgroundColor: z.string().optional(),
  fontColor: z.string().optional(),
  fontSize: z.number().optional(),
  glowColor: z.string().optional(),
  glowStrength: z.number().optional(),
  outlineColor: z.string().optional(),
  outlineWidth: z.number().optional(),
});
export type TextStyle = z.infer<typeof textStyleSchema>;
export const textStyleEditorField = defineEditorUiField(textStyleSchema, {
  en: "Text Style",
  ja: "テキストスタイル",
}, {
  backgroundColor: {
    label: {
      en: "Background Color",
      ja: "背景色",
    }
  },
  fontColor: {
    label: {
      en: "Font Color",
      ja: "フォント色",
    }
  },
  fontSize: {
    label: {
      en: "Font Size",
      ja: "フォントサイズ",
    }
  },
  glowColor: {
    label: {
      en: "Glow Color",
      ja: "グロー色",
    }
  },
  glowStrength: {
    label: {
      en: "Glow Strength",
      ja: "グロー強度",
    }
  },
  outlineColor: {
    label: {
      en: "Outline Color",
      ja: "輪郭線の色",
    }
  },
  outlineWidth: {
    label: {
      en: "Outline Width",
      ja: "輪郭線の幅",
    }
  },
});

export const pngMediaSchema = z.strictObject({
  type: z.literal("png"),
  url: z.string(),
});
export type PngMedia = z.infer<typeof pngMediaSchema>;
export const pngMediaEditorField = defineEditorUiField(pngMediaSchema, {
  en: "Png Image",
  ja: "PNG画像",
}, {
  type: {
    label: {
      en: "PNG Image",
      ja: "PNG画像",
    }
  },
  url: {
    label: {
      en: "URL",
      ja: "URL",
    }
  }
});

export const basicShapeMediaSchema = z.strictObject({
  type: z.literal("basicShape"),
  shape: z.enum(["circle", "square", "triangle", "diamond"]),
  color: z.string(),
});
export type BasicShapeMedia = z.infer<typeof basicShapeMediaSchema>;
export const basicShapeMediaEditorField = defineEditorUiField(basicShapeMediaSchema, {
  en: "Basic Shape",
  ja: "基本形状",
}, {
  type: {
    label: {
      en: "Basic Shape",
      ja: "基本形状",
    }
  },
  shape: {
    label: {
      en: "Shape",
      ja: "形状",
    }
  },
  color: {
    label: {
      en: "Color",
      ja: "色",
    }
  }
});

export const mediaSchema = z.union([pngMediaSchema, basicShapeMediaSchema]);
export type Media = z.infer<typeof mediaSchema>;
export const mediaEditorField = defineEditorUiUnionField(
  mediaSchema, 
  {
    png: pngMediaEditorField,
    basicShape: basicShapeMediaEditorField,
  },
  {
    en: "Media",
    ja: "メディア",
  },
  "type"
);