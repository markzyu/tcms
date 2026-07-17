import { z } from "zod";
import { ToolInputTypes, ToolInputTypesSchema } from "./toolTypes";

export const WorkflowSchema = z.object({
  id: z.string(),
  toolIds: z.array(z.string()),
  inputType: ToolInputTypesSchema,
});

export interface Workflow<TInput extends ToolInputTypes = any> extends z.infer<typeof WorkflowSchema> {
  inputType: TInput;
  /**
   * This is a custom function to determine the tool id that the workflow should start with.
   * 
   * This is a short term solution for resolving the workflow DAG. In the future, tools should have
   * their own DAG lifecycle functions like onStart, to report their readiness. And workflows should
   * specify an actual DAG showing tool dependencies, as well as transitions through actions
   * 
   * Or, at the very least, if we don't need DAG transitions because they are encoded in actions,
   * then we should still need a Tool.onStart() function and a Workflow.startOrder array. And that
   * implementation will be delayed to TCMS v2 at least (if we have dynamic tool loading).
   */
  getStartingToolId: (input: TInput) => Promise<string>;
}

export const WorkflowRegistrySchema = z.record(z.string(), WorkflowSchema);
export type WorkflowRegistry = z.infer<typeof WorkflowRegistrySchema>;