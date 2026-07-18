import { computed, defineComponent, PropType } from "vue";
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
        props: {
          input: {
            type: Object,
            required: true,
          }
        },
        setup(props) {
          return {
            input: props.input,
          }
        },
        template: `
          <div data-testid="json-objects-editor">
            JSON Objects Editor: {{ input.json }}
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
          props: {
            input: {
              type: Object,
              required: true,
            }
          },
          setup(props) {
            return {
              input: props.input,
            }
          },
          template: `
            <div data-testid="json-arrays-editor">
              JSON Arrays Editor: {{ input.json }}
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
    const workflowRegistry = computed<WorkflowRegistry>(() => ({
      "mock-workflow": {
        id: "mock-workflow",
        toolIds: props.workflowToolIds.split(','),
        inputType: props.inputType,
      },
    }));
    const editorUiSchema: EditorUiSchemaJson = {
      fieldGroups: [
      ],
    };
    const input = computed<ToolInput>(() => props.inputType === "jsonWithSchema" ? {
      type: "jsonWithSchema",
      json: props.inputJson,
      jsonSchema: props.inputJsonSchema,
      editorUiSchema,
    } : {
      type: "miniAppInstance",
      instanceId: props.inputJson.instanceId,
      instanceUrl: `https://mock.instance.url/${props.inputJson.instanceId}`,
    });
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