import { EditorUiSchemaJsonSchema } from "@tcms/mini-app-common";
import { z } from "zod";

/** Input as a JSON object with a corresponding schema. */
export const ToolJsonWithSchemaInputSchema = z.object({
  type: z.literal("jsonWithSchema"),
  json: z.object({}),
  /** The Path relative to the json that is being edited */
  jsonPath: z.string().optional(),
  jsonSchema: z.object<Record<string, unknown>>(),
  editorUiSchema: EditorUiSchemaJsonSchema,
});

export const ToolInputSchema = z.union([ToolJsonWithSchemaInputSchema]);
export type ToolInput = z.infer<typeof ToolInputSchema>;

export const ToolInputTypesSchema = z.union(ToolInputSchema.options.map((option) => option.shape.type));
export type ToolInputTypes = z.infer<typeof ToolInputTypesSchema>;

/** Save the result to a text file on disk */
export const ToolSaveTextActionSchema = z.object({
  type: z.literal("saveText"),
  path: z.string(),
  text: z.string(),
});

/** Ask Admin Shell to reload the LCDN configs */
export const ToolReloadLcdnConfigsActionSchema = z.object({
  type: z.literal("reloadLcdnConfigs"),
});

/** Open another tool, from this tool */
export const ToolOpenToolActionSchema = z.object({
  type: z.literal("openTool"),
  /** This ID must be within the scope of the workflow / in the toolsIds array */
  toolId: z.string(),
  input: ToolInputSchema,
});

/** Close the entire tooling workflow */
export const ToolCloseWorkflowActionSchema = z.object({
  type: z.literal("closeWorkflow"),
});

export const ToolActionSchema = z.union([
  ToolCloseWorkflowActionSchema,
  ToolOpenToolActionSchema,
  ToolReloadLcdnConfigsActionSchema,
  ToolSaveTextActionSchema,
]);
export type ToolAction = z.infer<typeof ToolActionSchema>;

export const ToolActionTypesSchema = z.union(ToolActionSchema.options.map((option) => option.shape.type));
export type ToolActionTypes = z.infer<typeof ToolActionTypesSchema>;

/** All individual tools must receive at least these props. */
export type ToolProps = {
  input: ToolInput;
  /**
   * Tools can send multiple actions to the admin shell, through the parent workflow.
   * 
   * The actions themselves can be asynchronous. And actions do not mark the end of the
   * workflow, except for the "closeWorkflow" action.
   */
  onAction: (action: ToolAction) => Promise<void>;
}

export const ToolSchema = z.object({
  id: z.string(),
  inputType: ToolInputTypesSchema,
});
export const ToolRegistrySchema = z.record(z.string(), ToolSchema);
export type ToolRegistry = z.infer<typeof ToolRegistrySchema>;