import { EditorUiSchemaJsonSchema } from "@tcms/mini-app-common";
import { z } from "zod";

// Definitions:
//   - Json Path: (Experimental) This refers to an abstract path within a json or a js object. For now, this is just lodash JSON path.
//   - File Path: (Backwards compatible) This refers to a URL / soft reference to a file on disk. But it's not guaranteed to be an OS Path.
//   - Tool Input: (Semi-Experimental) This refers to a union of known schemas regulating tool input types.
//   - Tool Input Proxy: (Semi-Experimental) This is a method to bring JSON data from admin shell to a tool without allowing tools to directly access OS.
//   - Tool Action: (Experimental) This refers to any admin shell action that can be taken by a tool.

// Naming rules:
//   - Do not use "path" in variable names without qualifiers. Doc strings are fine.
//       - Specify as /^filePath$/, /^jsonPath$/, or /.*FilePath$/ or /.*JsonPath$/.
//       - The last suffix determines the type of the path. For example, "jsonFilePath" is a file's path (related to a json).
//       - Or, for internal implementation of Paths themselves, use underscores + data type: /^_pathAs.*$/
//   - Implicit Generic naming:
//       For a generic schema union object named `PrefixKeywordSchema` where Prefix can be multiple words,
//       its union member "option one" should be named `PrefixOptionOneKeywordSchema`.
//   - Explicit Generic naming:
//       For a generic schema union object named `GenericSomethingSchema`,
//       its union member "option one" should be named `OptionOneSomethingSchema`.
//   - Explicit naming takes precedence over implicit naming.
//   - Lastly but optionally, Typescript types like `FooBar` should have a `FooBarSchema` which is a Zod schema object.

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
  /**
   * This will be specified as a LCDN URL /path/to/file, to be resolved to a file on disk,
   *   in the same way as how LCDN resolves URLs with instance_url_sanitization_layer
   * 
   * Examples:
   * 
   * /content/main.en.json -> {dataDir}/public/instances/{instanceId}/content/main.en.json
   * /assets/some-image.png -> {dataDir}/public/instances/{instanceId}/assets/some-image.png
   */
  _pathAsUrl: z.string(),
});

/**
 * GenericFilePath variants provide different ways to describe a file path.
 * 
 * This data alone does not guarantee file formats or content schemas. Type checking of file data is always required.
 */
export const GenericFilePathSchema = z.union([
  MiniAppContentFilePathSchema,
]);
export type GenericFilePath = z.infer<typeof GenericFilePathSchema>;

// ------- Tool Input Proxies -------

/**
 * This would allow us to fetch the input data needed to invoke one tool from another tool,
 * without having access to arbitrary data on disk.
 */
export const ToolInputByJsonFileProxySchema = z.object({
  type: z.literal("byJsonFile"),
  jsonFilePath: GenericFilePathSchema,
  transformV0: z.array(z.object({
    /** The path within the json object that is being referenced */
    fromJsonPath: z.string(),
    /** The path within an `inputJson` object, as a whole `ToolInput` meta type, that is being updated */
    toJsonPath: z.string(),
  })),
});

export const ToolInputProxySchema = z.union([
  ToolInputByJsonFileProxySchema,
]);
export type ToolInputProxy = z.infer<typeof ToolInputProxySchema>;

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
  /** This ID must be within the scope of the workflow / in the toolIds array */
  toolId: z.string(),
  presentation: z.union([
    // Drawer is good for opening editor while keeping the preview tool visible
    z.literal("drawer"),
    // Full screen is good for opening a full screen editor to replace the current tool
    z.literal("fullScreen"),
  ]),
  /** Using json data as input. This is always required. */
  inputJson: ToolInputSchema,
  /** Using a proxy to update some of the inputJson fields using data from admin shell */
  inputByProxy: ToolInputProxySchema.optional(),
});

/** Close the entire tooling workflow */
export const ToolCloseWorkflowActionSchema = z.object({
  type: z.literal("closeWorkflow"),
});

/** Replace the current tooling workflow with another */
export const ToolReplaceWorkflowActionSchema = z.object({
  type: z.literal("replaceWorkflow"),
  workflowId: z.string(),
  inputJson: ToolInputSchema,
  /** Using a proxy to update some of the inputJson fields using data from admin shell */
  inputByProxy: ToolInputProxySchema.optional(),
});

export const ToolActionSchema = z.union([
  ToolCloseWorkflowActionSchema,
  ToolOpenToolActionSchema,
  ToolReloadLcdnConfigsActionSchema,
  ToolReplaceWorkflowActionSchema,
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