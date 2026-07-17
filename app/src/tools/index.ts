import { ToolRegistry } from "./toolTypes";
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