import { z } from "zod";
import { effectTypeEditorField, effectTypeSchema, mediaEditorField, mediaSchema, textStyleEditorField, textStyleSchema } from "./basicTypes";
import { defineEditorUiField } from "../../../../packages/mini-app-common/src/schemas";

export const variantSchemaName = "variant";
export const variantSchemaVersion = "0.1.0";
export const variantSchema = z.strictObject({
  name: z.string(),
  rarity: z.number(),
  weight: z.number().default(100),
  textStyle: textStyleSchema,
  /**
   * This array doesn't mean "roll a random media". 
   * It's meant to provide backwards compatibility with different visual formats
   */
  media: z.array(mediaSchema),
  /**
   * Optional override of base animation
   */
  animationOnPickup: z.string().optional(),
  animationOnDrop: z.string().optional(),
});
export type Variant = z.infer<typeof variantSchema>;
export const variantEditorField = defineEditorUiField(variantSchema, {
  en: "Variant",
  ja: "バリアント",
}, {
  name: {
    label: {
      en: "Name",
      ja: "名前",
    }
  },
  rarity: {
    label: {
      en: "Rarity",
      ja: "レアリティ",
    }
  },
  weight: {
    label: {
      en: "Probability",
      ja: "確率",
    }
  },
  textStyle: textStyleEditorField,
  media: mediaEditorField,
  animationOnPickup: {
    label: {
      en: "Animation on Pickup",
      ja: "拾得時のアニメーション",
    }
  },
  animationOnDrop: {
    label: {
      en: "Animation on Drop",
      ja: "ドロップ時のアニメーション",
    }
  }
});

export const effectSchemaName = "effect";
export const effectSchemaVersion = "0.1.0";
export const effectSchema = z.strictObject({
  type: effectTypeSchema,
  duration: z.number(),
  weight: z.number(),
  isHidden: z.boolean(),
});
export type Effect = z.infer<typeof effectSchema>;
export const effectEditorField = defineEditorUiField(effectSchema, {
  en: "Effect",
  ja: "効果",
}, {
  type: effectTypeEditorField,
  duration: {
    label: {
      en: "Duration",
      ja: "持続時間",
    }
  },
  weight: {
    label: {
      en: "Probability",
      ja: "確率",
    }
  },
  isHidden: {
    label: {
      en: "Is Hidden",
      ja: "非表示",
    }
  }
});

export const dropSchemaName = "drop";
export const dropSchemaVersion = "0.1.0";
export const dropSchema = z.strictObject({
  baseName: z.string(),
  baseRarity: z.number(),
  baseTier: z.number().default(0),
  baseWeight: z.number().default(100),
  baseTextStyle: textStyleSchema,
  /**
   * This array doesn't mean "roll a random media". 
   * It's meant to provide backwards compatibility with different visual formats
   */
  baseMedia: z.array(mediaSchema),
  animationOnPickup: z.string().optional(),
  animationOnDrop: z.string().optional(),

  effects: z.array(effectSchema),
  variants: z.array(variantSchema),
});
export type Drop = z.infer<typeof dropSchema>;
export const dropEditorField = defineEditorUiField(dropSchema, {
  en: "Drop",
  ja: "ドロップ",
}, {
  baseName: {
    label: {
      en: "Name",
      ja: "名前",
    }
  },
  baseRarity: {
    label: {
      en: "Rarity",
      ja: "レアリティ",
    }
  },
  baseTier: {
    label: {
      en: "Tier",
      ja: "階層",
    }
  },
  baseWeight: {
    label: {
      en: "Probability",
      ja: "確率",
    }
  },
  baseTextStyle: textStyleEditorField,
  baseMedia: mediaEditorField,
  animationOnPickup: {
    label: {
      en: "Animation on Pickup",
      ja: "拾得時のアニメーション",
    }
  },
  animationOnDrop: {
    label: {
      en: "Animation on Drop",
      ja: "ドロップ時のアニメーション",
    }
  },
  effects: effectEditorField,
  variants: variantEditorField,
});