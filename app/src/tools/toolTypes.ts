import { EditorUiSchemaJsonSchema } from "@tcms/mini-app-common";
import type { Component } from "vue";
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
  json: z.any(),
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

/**
 * Open another tool, from this tool. But both tools must be within the same workflow.
 * 
 * **Note:** The main difference between `openTool` and `startWorkflow` is that,
 * `openTool` will not manage the navigation history between tools, while `startWorkflow` will.
 * (Back buttons navigation, browser history, etc will preserve workflows only, not individual tools.)
 */
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
  /** If the workflow encountered an error, this will be set. */
  errorMessage: z.string().optional(),
});

/**
 * Start a new tooling workflow from an existing one.
 * 
 * **Note:** The main difference between `startWorkflow` and `openTool` is that,
 * `startWorkflow` will manage the navigation history between tools, while `openTool` will not.
 * (Back buttons navigation, browser history, etc will preserve workflows only, not individual tools.)
 */
export const ToolStartWorkflowActionSchema = z.object({
  type: z.literal("startWorkflow"),
  workflowId: z.string(),
  inputJson: ToolInputSchema,
  /** Using a proxy to update some of the inputJson fields using data from admin shell */
  inputByProxy: ToolInputProxySchema.optional(),
});

export const ToolChooseMediaActionSchema = z.object({
  type: z.literal("chooseMedia"),
  onMediaUrl: z.function({
    input: [z.string()],
    output: z.void(),
  })
});

export const ToolActionSchema = z.union([
  ToolCloseWorkflowActionSchema,
  ToolOpenToolActionSchema,
  ToolReloadLcdnConfigsActionSchema,
  ToolStartWorkflowActionSchema,
  ToolSaveTextActionSchema,
  ToolChooseMediaActionSchema,
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

export type ToolOnLoadContext<TInput extends ToolInputTypes = any> = {
  /** The list of all tool ids that we will try to load. */
  toolIds: string[];

  /** The index of the current tool that we are trying to load. */
  toolIndex: number;

  /** The action that caused this tool to be loaded. If not set, then this is the manual start of a new workflow. */
  invokedByAction?: ToolAction;

  /** Some tools care about whether they are invoked internally (in the same workflow) by another tool. */
  invokedInternallyByToolId?: string;

  /**
   * The props that we are trying to load this tool with.
   * 
   * Please note that this is provided for the sake of determine loading order only.
   * The actual component should read props through standard Vue props.
   */
  props: ToolProps<TInput>;
}

export type ToolOnLoadResult<TInput extends ToolInputTypes = any> = {
  /** If set, the current tool will be skipped and the next tool will be tried. */
  skipReason?: string;
  /** If set, and if skipReason is not set, the workflow must use this loader */
  loader?: Promise<Component<ToolProps<TInput>>>;
}

export const ToolSchema = z.object({
  id: z.string(),
  inputType: ToolInputTypesSchema,
});
export interface Tool<TInput extends ToolInputTypes = any> extends z.infer<typeof ToolSchema> {
  inputType: TInput;
  /**
   * This is the implementation of the tool. It must return a Vue component upon successful loading.
   * 
   * This function is asynchronous to allow potential dynamic loading of tools, in later TCMS versions.
   * 
   * **Caveat:** Asynchronous rejection of the `ToolOnLoadResult.loader` promise will be
   * **treated as a failure to load the whole workflow.** To skip loading a tool, use the
   * `ToolOnLoadResult.skipReason` field instead of returning a promise.
   * 
   * The onLoad logic is also used to determine whether the current tool in the workflow is suitable
   * for the input props. If unsuitable, the implementaton must throw an error, instead of returning a promise.
   * And TCMS will try the next tool in the workflow until it exhausts all available tools.
   * 
   * However, the loading suitability determination is not asynchronous: This must be implemented
   * as a synchronous function which returns a promise so that unsuitable tools throw an error immediately.
   */
  onLoad: (context: ToolOnLoadContext<TInput>) => ToolOnLoadResult<TInput>;
}
export type ToolRegistry = Record<string, Tool>;