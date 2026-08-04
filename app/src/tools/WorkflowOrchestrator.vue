<template>
  <div v-if="!errorMessage && isLoadingTool" class="flex flex-col items-center justify-center h-full" data-testid="loading-workflow">
    {{ loadingMessage }}
  </div>
  <component v-if="!errorMessage" :is="currentComponent" :input="props.input" :onAction="onAction" :errorMessage="errorMessageForErrorComponent" />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onErrorCaptured, ref } from 'vue';
import { findFirstToolInWorkflow, useWorkflowOrchestratorErrorAlert, validateWorkflowInput, workflowOrchestratorErrorComponent } from './WorkflowOrchestratorUtils';
import { ToolAction, ToolProps, ToolRegistry } from './toolTypes';
import { useAppLanguageLocale } from '../utils/i18n';
import { WorkflowRegistry } from './workflowTypes';
import { useToolsContent } from './content';
import * as Keys from './contentKeys';
import IntlMessageFormat from 'intl-messageformat';

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
const errorMessageForErrorComponent = ref<string | null>(null);
useWorkflowOrchestratorErrorAlert(errorMessage, props.onAction);

const locale = useAppLanguageLocale();
const [loadingMessageWrapper] = useToolsContent([Keys.WorkflowOrchestratorLoadingMessageWrapper]);
const loadingMessage = computed(() => new IntlMessageFormat(loadingMessageWrapper.value, locale.value).format({workflowId: props.workflowId}));

onErrorCaptured((error) => {
  errorMessage.value = error instanceof Error ? error.message : String(error);
  return false;
});

const onAction = async (action: ToolAction) => {
  switch (action.type) {
    case "closeWorkflow":
    case "chooseMedia":
    case "openTool":
    case "reloadLcdnConfigs":
    case "startWorkflow":
    case "saveText":
      await props.onAction(action);
      break;
    default:
      // @ts-expect-error - If this isn't an error, then we are missing a switch-case above.
      console.error(`Unknown action: ${action.type}`);
      // @ts-expect-error - In that case, please hover over `action.type` to see the possible values.
      errorMessage.value = `Unknown action: ${action.type}`;
  }
}


const isLoadingTool = ref(true);

const logAndExit = (message: string) => {
  isLoadingTool.value = false;
  console.error(message);
  errorMessageForErrorComponent.value = message;
  return workflowOrchestratorErrorComponent;
}

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
    } finally {
      isLoadingTool.value = false;
    }
  });
});
</script>