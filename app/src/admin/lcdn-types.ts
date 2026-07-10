import { invoke, InvokeArgs } from "@tauri-apps/api/core";
import { z } from "zod";

export const LcdnStatusSchema = z.object({
  port: z.number().int().positive().nullable(),
  running: z.boolean(),
});

export type LcdnStatus = z.infer<typeof LcdnStatusSchema>;

export const LcdnConfigSchema = z.object({
  port: z.number().int().positive(),
  startupTimeout: z.number().int().positive(),
  instanceIds: z.array(z.string()),
  // A list of domains and ports only, without protocol or path.
  sameOriginDomains: z.array(z.string()),
});

export type LcdnConfig = z.infer<typeof LcdnConfigSchema>;

export const invokeWithType = async <T>(schema: z.ZodSchema<T>, command: string, args?: InvokeArgs) => {
  const result = await invoke<T>(command, args);
  return schema.parse(result);
};

export const invokeWithTypeAsMaybe = async <T>(schema: z.ZodSchema<T>, command: string, args?: InvokeArgs) => {
  let result: T | null = null;
  try {
    result = await invoke<T>(command, args);
    return schema.parse(result);
  } catch (error) {
    console.error("Error parsing Tauri command result", error, ". Result:", result);
    return null;
  }
};