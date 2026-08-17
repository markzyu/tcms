import { z } from "zod";

export const effectTypeSchema = z.enum([
  "movementSpeed",
  "itemVisibility",
  "screenZoom"
]);
export type EffectType = z.infer<typeof effectTypeSchema>;

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

export const pngMediaSchema = z.strictObject({
  type: z.literal("png"),
  url: z.string(),
});
export type PngMedia = z.infer<typeof pngMediaSchema>;

export const basicShapeMediaSchema = z.strictObject({
  type: z.literal("basicShape"),
  shape: z.enum(["circle", "square", "triangle", "diamond"]),
  color: z.string(),
});
export type BasicShapeMedia = z.infer<typeof basicShapeMediaSchema>;

export const mediaSchema = z.union([pngMediaSchema, basicShapeMediaSchema]);
export type Media = z.infer<typeof mediaSchema>;