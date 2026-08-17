import { z } from "zod";
import { effectTypeSchema, mediaSchema, textStyleSchema } from "./basicTypes";

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

export const effectSchemaName = "effect";
export const effectSchemaVersion = "0.1.0";
export const effectSchema = z.strictObject({
  type: effectTypeSchema,
  duration: z.number(),
  weight: z.number(),
  isHidden: z.boolean(),
});
export type Effect = z.infer<typeof effectSchema>;

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