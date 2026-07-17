import { z } from "zod";
import { ToolInputTypesSchema } from "./toolTypes";

export const WorkflowSchema = z.object({
  id: z.string(),
  toolsIds: z.array(z.string()),
  inputType: ToolInputTypesSchema,
});

export const WorkflowRegistrySchema = z.record(z.string(), WorkflowSchema);
export type WorkflowRegistry = z.infer<typeof WorkflowRegistrySchema>;