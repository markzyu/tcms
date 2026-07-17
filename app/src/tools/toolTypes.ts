import { EditorUiSchemaJsonSchema } from "@tcms/mini-app-common";
import { z } from "zod";

// Definitions:
//   - Json Path: (Experimental) This refers to an abstract path within a json object. There is no generic, stable schema for this.
//   - File Path: (Backwards compatible) This refers to a path to a file on disk.
//   - Input Proxy: (Semi-Experimental) This is a method to bring data from admin shell to a tool without breaking the modularity of the tooling system.
//   - Tool Input: (Semi-Experimental) This refers to any valid input to a tool.
//   - Tool Action: (Experimental) This refers to any admin shell action that can be taken by a tool.

// Naming rules:
//   - Outside of the FilePath types, please always differentiate between "filePath" and "jsonPath". Never use the unspecific "path" name.
//   - Implicit Generic naming: For a generic schema union object named `FooBarSchema`, its union member "option one" should be named `FooOptionOneBarSchema`.
//   - Explicit Generic naming: For a generic schema union object named `GenericFooBarSchema`, its union member "option one" should be named `OptionOneFooBarSchema`.

// ------- Tool Input Types -------

/** Input as a JSON object with a corresponding schema. */
export const ToolJsonWithSchemaInputSchema = z.object({
  type: z.literal("jsonWithSchema"),
  json: z.object({}),
  /** The path within the json object that is being edited */
  jsonPath: z.string().optional(),
  jsonSchema: z.object<Record<string, unknown>>(),
  editorUiSchema: EditorUiSchemaJsonSchema,
});

/** Input as a mini app instance (id and url) */
export const ToolMiniAppInstanceInputSchema = z.object({
  type: z.literal("miniAppInstance"),
  instanceId: z.string(),
  instanceUrl: z.string(),
});

export const ToolInputSchema = z.union([
  ToolJsonWithSchemaInputSchema, 
  ToolMiniAppInstanceInputSchema,
]);
export type ToolInput = z.infer<typeof ToolInputSchema>;

export const ToolInputTypesSchema = z.union(ToolInputSchema.options.map((option) => option.shape.type));
export type ToolInputTypes = z.infer<typeof ToolInputTypesSchema>;

// ------- Generic File Path Types -------

export const MiniAppContentFilePathSchema = z.object({
  type: z.literal("miniAppContent"),
  instanceId: z.string(),
  /** This will be a URL /path/to/file, resolved in the same way as LCDN instance_url_sanitization_layer */
  path: z.string(),
});

export const GenericFilePathSchema = z.union([
  MiniAppContentFilePathSchema,
]);
export type GenericFilePath = z.infer<typeof GenericFilePathSchema>;

// ------- Tool Input Proxies -------

/**
 * This would allow us to fetch the input data needed to invoke one tool from another tool,
 * without having access to arbitrary data on disk.
 */
export const InputProxyByJsonFilePathSchema = z.object({
  type: z.literal("fromInstanceId"),
  jsonFilePath: GenericFilePathSchema,
  transformV0: z.array(z.object({
    /** The path within the json object that is being referenced */
    fromJsonPath: z.string(),
    /** The path within the ToolInput json that is being updated */
    toJsonPath: z.string(),
  })),
});

export const InputProxySchema = z.union([
  InputProxyByJsonFilePathSchema,
]);
export type InputProxy = z.infer<typeof InputProxySchema>;

// ------- Tool Action Types -------

/** Save the result to a text file on disk */
export const ToolSaveTextActionSchema = z.object({
  type: z.literal("saveText"),
  filePath: GenericFilePathSchema,
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
  presentation: z.union([
    // Drawer is good for opening editor while keeping the preview tool visible
    z.literal("drawer"),
    // Full screen is good for opening a full screen editor to replace the current tool
    z.literal("fullScreen"),
  ]),
  /** Using raw json data as input. This is always required. */
  inputRaw: ToolInputSchema,
  /** Using a proxy to update some of the inputRaw fields using data from admin shell */
  inputByProxy: InputProxySchema.optional(),
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
export type ToolProps<TInput extends ToolInputTypes = any> = {
  input: Extract<ToolInput, { type: TInput }>;
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