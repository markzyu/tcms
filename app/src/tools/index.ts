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
  "preview-instance": {
    id: "preview-instance",
    inputType: "miniAppInstance",
  },
  "floating-json-field-editor": {
    // In Phase 2, we don't implement the this feature yet.
    id: "floating-json-field-editor",
    inputType: "jsonWithSchema",
  }
};

export const workflowRegistry: WorkflowRegistry = {
  "template-editor": {
    id: "template-editor",
    toolIds: ["json-objects-editor", "json-arrays-editor"],
    inputType: "jsonWithSchema",
  },
  "preview-instance": {
    id: "preview-instance",
    // In Phase 2, we don't implement the floating json field editor feature yet.
    toolIds: ["preview-instance", "floating-json-field-editor"],
    inputType: "miniAppInstance",
  }
};

export type TestToolProps1 = ToolProps<"jsonWithSchema">["input"]["editorUiSchema"];
export type TestToolProps2 = ToolProps<"miniAppInstance">["input"]["instanceId"];
export type TestToolProps3 = ToolProps;