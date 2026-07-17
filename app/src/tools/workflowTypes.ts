import { z } from "zod";
import { ToolInputTypesSchema } from "./toolTypes";

/**
 * A workflow is just a collection of tools that TCMS checks upon starting this workflow.
 * 
 * A workflow is not a static DAG of all tools it uses. But a conceptual DAG exists. It
 * can be constructed by using the `toolIds` array as starting points, and then by using
 * each tool's Actions as transitions, to explore all downstream tools/workflows. But no
 * such DAG is ever stored in memory.
 */
export const WorkflowSchema = z.object({
  id: z.string(),
  /**
   * Specify the tools that we are allowed to use in this workflow.
   * 
   * This same list also specifies the loading order of the tools. If all tools fail to `onLoad()`,
   * then the workflow will fail to start.
   * 
   * Note for v1: We might also provide override options like `allowAllTools` and
   * `overrideLoadingOrder` to allow using arbitrary tools while overriding the loading order.
   */
  toolIds: z.array(z.string()),
  inputType: ToolInputTypesSchema,
});

export const WorkflowRegistrySchema = z.record(z.string(), WorkflowSchema);
export type WorkflowRegistry = z.infer<typeof WorkflowRegistrySchema>;