import { computed, defineComponent, PropType, ref } from "vue";
import { ToolAction, ToolInput, ToolInputTypes, ToolProps, ToolRegistry } from "./toolTypes";
import { WorkflowRegistry } from "./workflowTypes";
import { EditorUiSchemaJson } from "@tcms/mini-app-common";
import WorkflowOrchestrator from "./WorkflowOrchestrator.vue";

// Mock Tool components and registry for testing
export const mockToolRegistry: ToolRegistry = {
  "json-objects-editor": {
    id: "json-objects-editor",
    inputType: "jsonWithSchema",
    onLoad: ({ props }) => {
      if (props.input.type === "jsonWithSchema") {
        if (typeof props.input.json !== "object" || Array.isArray(props.input.json)) {
          return {
            skipReason: "Skipping json-objects-editor because input is not an object",
          };
        }
      }
      const component = defineComponent<ToolProps<"jsonWithSchema">>({
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
      return {
        loader: Promise.resolve(component),
      };
    },
  },
  "json-arrays-editor": {
    id: "json-arrays-editor",
    inputType: "jsonWithSchema",
    onLoad: ({ props }) => {
      if (props.input.type === "jsonWithSchema") {
        if (!Array.isArray(props.input.json)) {
          return {
            skipReason: "Skipping json-arrays-editor because input is not an array",
          };
        }
      }
      const component = defineComponent<ToolProps<"jsonWithSchema">>({
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
      return {
        loader: Promise.resolve(component),
      };
    },
  },
  "mock-crash-during-load": {
    id: "mock-crash-during-load",
    inputType: "jsonWithSchema",
    onLoad: () => {
      return {
        loader: Promise.reject(new Error("Mock crash during load")),
      };
    },
  },
  "mock-loading-forever": {
    id: "mock-loading-forever",
    inputType: "jsonWithSchema",
    onLoad: () => {
      return {
        loader: new Promise(() => {}),
      };
    },
  },
  "mock-error-during-tool-rerender": {
    id: "mock-error-during-tool-rerender",
    inputType: "jsonWithSchema",
    onLoad: () => {
      return {
        loader: Promise.resolve(defineComponent({
          template: `<a href="#" @click.prevent="throwError">Click here to Throw Error</a>`,
          setup() {
            const throwError = () => {
              throw new Error("Mock error during tool rerender");
            };
            return {
              throwError,
            };
          },
        })),
      };
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
    onAction: {
      type: Function as PropType<(action: ToolAction) => Promise<void>>,
      required: false,
    },
  },
  setup(props) {
    const unmounted = ref(false);
    const workflowRegistry = computed<WorkflowRegistry>(() => ({
      "mock-workflow": {
        id: "mock-workflow",
        toolIds: props.workflowToolIds ? props.workflowToolIds.split(',') : [],
        inputType: props.inputType,
      },
    }));
    const editorUiSchema: EditorUiSchemaJson = {
      fieldGroups: [
      ],
      fieldLabels: {
        en: {},
        ja: {},
      },
    };
    const input = computed<ToolInput>(() => props.inputType === "jsonWithSchema" ? {
      type: "jsonWithSchema",
      json: props.inputJson,
      jsonSchema: props.inputJsonSchema,
      editorUiSchema,
      savePath: {
        type: "miniAppContent",
        instanceId: "mock-instance-id",
        _pathAsUrl: '/content/main.en.json',
      },
    } : {
      type: "miniAppInstance",
      instanceId: "mock-instance-id",
      instanceUrl: `https://mock.instance.url/mock-instance-id`,
    });
    return {
      unmounted,
      workflowId: "mock-workflow",
      workflowRegistry,
      toolRegistry: mockToolRegistry,
      input,
      onAction: props.onAction ?? (async (action: ToolAction) => {
        console.log(action);
      }),
    };
  },
  template: `
    <button class="hidden" @click="unmounted = true" data-testid="workflow-orchestrator-unmount-btn">Unmount</button>
    <WorkflowOrchestrator
      v-if="!unmounted"
      :workflow-id="workflowId"
      :workflow-registry="workflowRegistry"
      :tool-registry="toolRegistry"
      :input="input"
      :on-action="onAction"
    />
  `,
});