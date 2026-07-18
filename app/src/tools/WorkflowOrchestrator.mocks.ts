import { defineComponent, PropType } from "vue";
import { ToolAction, ToolInput, ToolInputTypes, ToolRegistry } from "./toolTypes";
import { WorkflowRegistry } from "./workflowTypes";
import { EditorUiSchemaJson } from "@tcms/mini-app-common";
import WorkflowOrchestrator from "./WorkflowOrchestrator.vue";

// Mock Tool components and registry for testing
export const mockToolRegistry: ToolRegistry = {
  "json-objects-editor": {
    id: "json-objects-editor",
    inputType: "jsonWithSchema",
    onLoad: async ({ props }) => {
      if (props.input.type === "jsonWithSchema") {
        if (typeof props.input.json !== "object" || Array.isArray(props.input.json)) {
          throw new Error("Skipping json-objects-editor because input is not an object");
        }
      }
      return defineComponent({
        name: 'JsonObjectsEditor',
        setup() {
          console.log("TESTT JsonObjectsEditor");
        },
        template: `
          <div data-testid="json-objects-editor">
            JSON Objects Editor
          </div>
        `,
      });
    },
  },
  "json-arrays-editor": {
    id: "json-arrays-editor",
    inputType: "jsonWithSchema",
    onLoad: async ({ props }) => {
      if (props.input.type === "jsonWithSchema") {
        if (!Array.isArray(props.input.json)) {
          throw new Error("Skipping json-arrays-editor because input is not an array");
        }
      }
      return defineComponent({
          name: 'JsonArraysEditor',
          setup() {
            console.log("TESTT JsonArraysEditor");
          },
          template: `
            <div data-testid="json-arrays-editor">
              JSON Arrays Editor
            </div>
          `,
      });
    },
  },
};

export const MockOrchestratorWrapper = defineComponent({
  name: 'MockOrchestratorWrapper',
  components: {
    WorkflowOrchestrator,
  },
  props: {
    workflowToolIds: {
      type: String,
      required: true,
    },
    inputType: {
      type: String as PropType<ToolInputTypes>,
      required: true,
    },
    inputJson: {
      type: Object,
      required: true,
    },
    inputJsonSchema: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const toolIds = props.workflowToolIds.split(',');
    const workflowRegistry: WorkflowRegistry = {
      "mock-workflow": {
        id: "mock-workflow",
        toolIds,
        inputType: props.inputType,
      },
    };
    const editorUiSchema: EditorUiSchemaJson = {
      fieldGroups: [
      ],
    };
    const input: ToolInput = props.inputType === "jsonWithSchema" ? {
      type: "jsonWithSchema",
      json: props.inputJson,
      jsonSchema: props.inputJsonSchema,
      editorUiSchema,
    } : {
      type: "miniAppInstance",
      instanceId: props.inputJson.instanceId,
      instanceUrl: `https://mock.instance.url/${props.inputJson.instanceId}`,
    };
    return {
      workflowId: "mock-workflow",
      workflowRegistry,
      toolRegistry: mockToolRegistry,
      input,
      onAction: async (action: ToolAction) => {
        console.log(action);
      }
    };
  },
  template: `
    <WorkflowOrchestrator
      :workflow-id="workflowId"
      :workflow-registry="workflowRegistry"
      :tool-registry="toolRegistry"
      :input="input"
      :on-action="onAction"
    />
  `,
});