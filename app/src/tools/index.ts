import { ToolProps, ToolRegistry } from "./toolTypes";
import { WorkflowRegistry } from "./workflowTypes";

export const toolRegistry: ToolRegistry = {
  "json-objects-editor": {
    id: "json-objects-editor",
    inputType: "jsonWithSchema",
  },
  "json-arrays-editor": {
    id: "json-arrays-editor",
    inputType: "jsonWithSchema",
  },
};

export const workflowRegistry: WorkflowRegistry = {
  "template-editor": {
    id: "template-editor",
    toolsIds: ["json-objects-editor", "json-arrays-editor"],
    inputType: "jsonWithSchema",
  },
};

export type TestToolProps1 = ToolProps<"jsonWithSchema">["input"]["editorUiSchema"];
export type TestToolProps2 = ToolProps<"miniAppInstance">["input"]["instanceId"];
export type TestToolProps3 = ToolProps;