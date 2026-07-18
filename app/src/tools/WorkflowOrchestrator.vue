<template>
  <div v-if="isLoadingTool" class="flex flex-col items-center justify-center h-full" data-testid="loading-workflow">
    Loading Workflow: {{ workflowId }}...
  </div>
  <component :is="currentComponent" :input="props.input" :onAction="onAction" />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, defineComponent, ref } from 'vue';
import { convertJsonSchemaToZod } from 'zod-from-json-schema';
import { ToolAction, ToolProps, ToolRegistry } from './toolTypes';
import { WorkflowRegistry } from './workflowTypes';

interface WorkflowOrchestratorProps extends ToolProps {
  workflowId: string;
  workflowRegistry: WorkflowRegistry;
  toolRegistry: ToolRegistry;
}

const props = defineProps<WorkflowOrchestratorProps>();

const workflow = computed(() => props.workflowRegistry[props.workflowId] ?? null);
const toolsToLoad = computed(() => workflow.value?.toolIds ?? []);
const currentToolId = ref<string | null>(null);

const onAction = async (action: ToolAction) => {
  switch (action.type) {
    case "closeWorkflow":
    case "reloadLcdnConfigs":
    case "replaceWorkflow":
    case "saveText":
      await props.onAction(action);
      break;
    default:
      console.error(`Unknown action: ${action.type}`);
      await props.onAction({
        type: "closeWorkflow",
        errorMessage: `Unknown action: ${action.type}`,
      });
  }
}

const defaultComponent = defineComponent({
  name: 'DefaultComponent',
  setup() {
  },
  template: `
    <div data-testid="default-component">
      Default Component
    </div>
  `,
});

const logAndExit = (errorMessage: string) => {
  console.error(errorMessage);
  props.onAction({
    type: "closeWorkflow",
    errorMessage,
  });
  return defaultComponent;
}

const isLoadingTool = computed(() => currentToolId.value === null);

// TODO: pull most of this stuff out of defineAsyncComponent because right now, computed doesn't know which dependencies are needed to re-run the function
const currentComponent = computed(() => {
  // Check if the input value is valid
  try {
    if (workflow.value?.inputType !== props.input.type) {
      return logAndExit(`Workflow input type mismatch: ${workflow.value?.inputType} !== ${props.input.type}`);
    }
    if (props.input.type === "jsonWithSchema") {
      const schema = convertJsonSchemaToZod(props.input.jsonSchema);
      const result = schema.safeParse(props.input.json);
      if (!result.success) {
        return logAndExit(`jsonWithSchema is invalid: ${result.error.message}`);
      }
    }
  } catch (error) {
    return logAndExit(`Failed to validate workflow input: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Start loading tools
  const toolIds = [...toolsToLoad.value];
  const toolInput = props.input;
  for (const toolId of toolIds) {
    try {
      const tool = props.toolRegistry[toolId];
      if (!tool) {
        continue;
      }
      if (tool.inputType !== toolInput.type) {
        continue;
      }
      const toolComponentPromise = tool.onLoad({
        toolIds,
        toolIndex: toolsToLoad.value.indexOf(toolId),
        props: {
          input: toolInput,
          onAction,
        }
      });
      currentToolId.value = toolId;
      return defineAsyncComponent(async () => await toolComponentPromise);
    } catch (error: unknown) {
      logAndExit(`Failed to load tool ${toolId}: ${error instanceof Error ? error.message : String(error)}`);
      break;
    }
  }

  return logAndExit("All tools in workflow failed to load");
});
</script>