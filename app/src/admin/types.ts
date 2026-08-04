import { invoke, InvokeArgs } from "@tauri-apps/api/core";
import { z } from "zod";
import { ToolCloseWorkflowActionSchema } from "../tools/toolTypes";

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

export const LcdnInstanceConfigSchema = z.object({
  instanceId: z.string(),
  slug: z.string(),
  name: z.string(),
  templateScope: z.string(),
  templateId: z.string(),
  templateVersion: z.string(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  currentVariant: z.string(),
  variants: z.array(z.string()),
});

export type LcdnInstanceConfig = z.infer<typeof LcdnInstanceConfigSchema>;

export const InstallStatusSchema = z.object({
  // The version of the ThorCMS app. (Same as app/package.json)
  appVersion: z.string()
});

export type InstallStatus = z.infer<typeof InstallStatusSchema>;

export const invokeWithType = async <T>(resultSchema: z.ZodSchema<T>, command: string, args?: InvokeArgs) => {
  const result = await invoke<T>(command, args);
  return resultSchema.parse(result);
};

export const invokeWithTypeAsMaybe = async <T>(resultSchema: z.ZodSchema<T>, command: string, args?: InvokeArgs) => {
  let result: T | null = null;
  try {
    result = await invoke<T>(command, args);
    return resultSchema.parse(result);
  } catch (error) {
    console.error("Error parsing Tauri command result", error, ". Result:", result);
    return null;
  }
};

export type WorkflowFinishedEventData = z.infer<typeof ToolCloseWorkflowActionSchema> & {
  workflowId: string;
  inputId: string;
};

export class WorkflowFinishedEvent extends CustomEvent<WorkflowFinishedEventData> {
  constructor(data: WorkflowFinishedEventData) {
    super("workflow-finished", { detail: data });
  }
}

declare global {
  interface WindowEventMap {
    "workflow-finished": WorkflowFinishedEvent;
  }
}