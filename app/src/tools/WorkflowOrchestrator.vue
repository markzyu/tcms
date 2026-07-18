<template>
  <div v-if="isLoadingTool" class="flex flex-col items-center justify-center h-full" data-testid="loading-workflow">
    Loading Workflow: {{ workflowId }}...
  </div>
  <component :is="currentComponent" :input="props.input" :onAction="onAction" :errorMessage="errorMessage" />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue';
import { findFirstToolInWorkflow, validateWorkflowInput, workflowOrchestratorErrorComponent } from './WorkflowOrchestratorUtils';
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
const errorMessage = ref<string | null>(null);

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

const logAndExit = (message: string) => {
  console.error(message);
  errorMessage.value = message;
  props.onAction({
    type: "closeWorkflow",
    errorMessage: message,
  });
  return workflowOrchestratorErrorComponent;
}

const isLoadingTool = computed(() => currentToolId.value === null && errorMessage.value === null);

// TODO: pull most of this stuff out of defineAsyncComponent because right now, computed doesn't know which dependencies are needed to re-run the function
const currentComponent = computed(() => {
  const validationError = validateWorkflowInput(props.input, workflow.value?.inputType);
  if (validationError) {
    return logAndExit(validationError);
  }

  const findFirstToolResult = findFirstToolInWorkflow({
    toolRegistry: props.toolRegistry,
    toolIds: toolsToLoad.value,
    initialToolProps: {
      input: props.input,
      onAction,
    },
  });
  if ('toolSkipErrors' in findFirstToolResult) {
    const errorsStr = findFirstToolResult.toolSkipErrors.join(" ");
    return logAndExit(`There was no eligible tool to load. ${errorsStr}`);
  }

  const { toolId, loader } = findFirstToolResult;
  currentToolId.value = toolId;
  return defineAsyncComponent(async () => {
    try {
      return await loader;
    } catch (error) {
      return logAndExit(`Failed to load required tool ${toolId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
});
</script>