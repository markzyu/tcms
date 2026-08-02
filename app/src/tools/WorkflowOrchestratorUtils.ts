import { Component, defineComponent, watchEffect } from 'vue';
import { convertJsonSchemaToZod } from 'zod-from-json-schema';
import { ToolInput, ToolInputTypes, ToolProps, ToolRegistry } from './toolTypes';
import { alertController } from '@ionic/vue';
import * as Keys from './contentKeys';
import { useToolsContent } from './content';
import IntlMessageFormat from 'intl-messageformat';
import { useAppLanguageLocale } from '../utils/i18n';

export const workflowOrchestratorErrorComponent = defineComponent({
  name: 'WorkflowOrchestratorErrorComponent',
  props: {
    errorMessage: {
      type: String,
      required: true,
    },
  },
  setup({ errorMessage }) {
    const locale = useAppLanguageLocale();
    const [
      header,
      dismissBtn,
      errorMessageWrapper,
    ] = useToolsContent([
      Keys.WorkflowOrchestratorErrorHeader,
      Keys.WorkflowOrchestratorErrorDismissBtn,
      Keys.WorkflowOrchestratorErrorMessageWrapper,
    ]);
    watchEffect(async (onCleanup) => {
      const alert = await alertController.create({
        header: header.value,
        message: String(new IntlMessageFormat(errorMessageWrapper.value, locale.value).format({errorMessage})),
        buttons: [
          {
            text: dismissBtn.value,
            role: 'cancel',
          },
        ],
      });
      let selfDismiss = false;
      alert.onDidDismiss().finally(() => {
        if (selfDismiss) {
          return;
        }
        history.back();
      });
      await alert.present();
      onCleanup(() => {
        selfDismiss = true;
        alert.dismiss();
      });
    });
  },
  template: `<div/>`,
});

/**
 * @returns An error message if the input is invalid, or `undefined` if the input is valid.
 */
export const validateWorkflowInput = (input: ToolInput, inputType: ToolInputTypes) => {
  if (input.type !== inputType) {
    return `Workflow input type mismatch: ${input.type} !== ${inputType}.`;
  }
  if (input.type === "jsonWithSchema") {
    const schema = convertJsonSchemaToZod(input.jsonSchema);
    const result = schema.safeParse(input.json);
    if (!result.success) {
      return `jsonWithSchema is invalid: ${result.error.message}`;
    }
  }
}

type FindFirstEligibleToolOptions = {
  toolRegistry: ToolRegistry;
  toolIds: string[];
  initialToolProps: ToolProps;
}

type FindFirstEligibleToolResult = {
  toolId: string;
  loader: Promise<Component<ToolProps>>;
} | {
  toolSkipErrors: string[];
}

export const findFirstToolInWorkflow = (options: FindFirstEligibleToolOptions): FindFirstEligibleToolResult => {
  const { toolRegistry, toolIds, initialToolProps } = options;
  const initialInput = initialToolProps.input;
  const toolSkipErrors: string[] = [];

  for (const toolId of toolIds) {
    try {
      const tool = toolRegistry[toolId];
      if (!tool) {
        toolSkipErrors.push(`Tried ${toolId}: There is no such tool.`);
        continue;
      }
      if (tool.inputType !== initialInput.type) {
        toolSkipErrors.push(`Tried ${toolId}: Input type mismatch: ${tool.inputType} !== ${initialInput.type}.`);
        continue;
      }

      const loadResult = tool.onLoad({
        toolIds,
        toolIndex: toolIds.indexOf(toolId),
        props: initialToolProps,
      });

      // Typescript linter would complain if we assert on `loadResult.loader` directly
      const { loader, skipReason } = loadResult;
      if (skipReason || !loader) {
        toolSkipErrors.push(skipReason ? `Tried ${toolId}: ${skipReason}.` : `Tool ${toolId} did not provide a loader.`);
        continue;
      }
      
      // We found a match
      return { toolId, loader };
    } catch (error: unknown) {
      toolSkipErrors.push(`Tried ${toolId}: ${error instanceof Error ? error.message : String(error)}.`);
      continue;
    }
  }
  return { toolSkipErrors };
}