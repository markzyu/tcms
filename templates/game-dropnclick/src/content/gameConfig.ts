import { definePageContentSchema } from "../../../../packages/mini-app-common/src/schemas";
import { effectTypeSchema, mediaSchema, textStyleSchema } from "./basicTypes";
import { z } from "zod";
import { dropSchema } from "./drop";

export const scoreFunctionSchema = z.enum([
  "A * rarity * tier ^ B",
  "A * rarity * B ^ tier"
]);

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

export const raritySchema = z.strictObject({
  name: z.string(),
  weight: z.number(),
  textStyle: textStyleSchema,
});

export const effectConfigSchema = z.strictObject({
  type: effectTypeSchema,
  baseValue: z.number(),
  maxValue: z.number(),
});

export const playerConfigSchema = z.strictObject({
  directionChangeInterval: z.number(),
  directionChangeMaxAngle: z.number(),
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

export type GameConfig = z.infer<typeof gameConfigSchema>;

export const gameConfigSchemaPathPromise = definePageContentSchema({
  schemaName: gameConfigSchemaName,
  schemaVersion: gameConfigSchemaVersion,
  editorUiSchema: {
    fieldLabels: {
      en: {
      },
      ja: {
      }
    },
    fieldGroups: [],
  },
  schema: gameConfigSchema,
});