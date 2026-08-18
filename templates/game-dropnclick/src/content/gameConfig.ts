import { defineEditorUiField, defineEditorUiStringEnumField, definePageContentSchema, relativeFieldGroup } from "../../../../packages/mini-app-common/src/schemas";
import { effectTypeSchema, mediaEditorField, mediaSchema, textStyleEditorField, textStyleSchema } from "./basicTypes";
import { z } from "zod";
import { dropEditorField, dropSchema } from "./drop";

export const scoreFunctionSchema = z.enum([
  "A * rarity * tier ^ B",
  "A * rarity * B ^ tier"
]);
const scoreFunctionEditorField = defineEditorUiStringEnumField(scoreFunctionSchema, {
  en: "Score Function",
  ja: "スコア関数",
}, {
  en: {
    "A * rarity * tier ^ B": "Multiply rarity by power of tier",
    "A * rarity * B ^ tier": "Multiply rarity by exponential of tier",
  },
  ja: {
    "A * rarity * tier ^ B": "レアリティを階層の累乗で乗算",
    "A * rarity * B ^ tier": "レアリティを階層の指数で乗算",
  },
});

export const tierSchema = z.strictObject({
  name: z.string().optional(),
  weight: z.number(),
  backgroundMedia: mediaSchema.optional(),
  /**
   * Quantity per second
   */
  baseDropRate: z.number().default(2),
  /**
   * Probability of a new drop having a global effect
   */
  pGlobalEffect: z.number().default(0.1),
});
const tierEditorField = defineEditorUiField(tierSchema, {
  en: "Tier",
  ja: "階層",
}, {
  name: {
    label: {
      en: "Name",
      ja: "名前",
    }
  },
  weight: {
    label: {
      en: "Weight",
      ja: "確率",
    }
  },
  backgroundMedia: mediaEditorField,
  baseDropRate: {
    label: {
      en: "Base Drop Rate",
      ja: "基礎ドロップ率",
    }
  },
  pGlobalEffect: {
    label: {
      en: "Global Effect Chance",
      ja: "グローバル効果の確率",
    }
  },
});

export const raritySchema = z.strictObject({
  name: z.string(),
  weight: z.number(),
  textStyle: textStyleSchema,
});
const rarityEditorField = defineEditorUiField(raritySchema, {
  en: "Rarity",
  ja: "レアリティ",
}, {
  name: {
    label: {
      en: "Name",
      ja: "名前",
    }
  },
  weight: {
    label: {
      en: "Weight",
      ja: "確率",
    }
  },
  textStyle: textStyleEditorField,
});

export const effectConfigSchema = z.strictObject({
  type: effectTypeSchema,
  baseValue: z.number(),
  maxValue: z.number(),
});
const effectConfigEditorField = defineEditorUiField(effectConfigSchema, {
  en: "Effect",
  ja: "効果",
}, {
  type: {
    label: {
      en: "Effect Type",
      ja: "効果タイプ",
    }
  },
  baseValue: {
    label: {
      en: "Base Value",
      ja: "基礎値",
    }
  },
  maxValue: {
    label: {
      en: "Max Value",
      ja: "最大値",
    }
  },
});

export const playerConfigSchema = z.strictObject({
  /**
   * Unit: seconds, fractional numbers are allowed.
   * 
   * This will be renormalized to match the game's internal tick interval.
   */
  directionChangeInterval: z.number(),
  /**
   * Unit: degrees, fractional numbers are allowed.
   */
  directionChangeMaxAngle: z.number(),
});
const playerConfigEditorField = defineEditorUiField(playerConfigSchema, {
  en: "Player",
  ja: "プレイヤー",
}, {
  directionChangeInterval: {
    label: {
      en: "Movement Direction Change Interval",
      ja: "移動方向変更間隔",
    }
  },
  directionChangeMaxAngle: {
    label: {
      en: "Movement Direction Change Max Angle",
      ja: "移動方向変更最大角度",
    }
  },
});

export const gameConfigSchemaName = "gameConfig";
export const gameConfigSchemaVersion = "0.1.0";
export const gameConfigSchema = z.strictObject({
  tiers: z.array(tierSchema),
  rarities: z.array(raritySchema),
  effects: z.array(effectConfigSchema),
  player: playerConfigSchema,
  drops: z.array(dropSchema),
  scoreFunction: scoreFunctionSchema,
  scoreFunctionParamA: z.number(),
  scoreFunctionParamB: z.number(),
});
const gameConfigEditorField = defineEditorUiField(gameConfigSchema, {
  en: "Game Config",
  ja: "ゲーム設定",
}, {
  tiers: [tierEditorField],
  rarities: [rarityEditorField],
  effects: [effectConfigEditorField],
  player: playerConfigEditorField,
  drops: [dropEditorField],
  scoreFunction: scoreFunctionEditorField,
  scoreFunctionParamA: {
    label: {
      en: "Score Function Param A",
      ja: "スコア関数パラメータA",
    }
  },
  scoreFunctionParamB: {
    label: {
      en: "Score Function Param B",
      ja: "スコア関数パラメータB",
    }
  },
});

export type GameConfig = z.infer<typeof gameConfigSchema>;

export const gameConfigSchemaPathPromise = definePageContentSchema({
  schemaName: gameConfigSchemaName,
  schemaVersion: gameConfigSchemaVersion,
  editorUiSchema: {
    fieldLabels: gameConfigEditorField.fieldLabels,
    fieldGroups: [],
  },
  schema: gameConfigSchema,
});