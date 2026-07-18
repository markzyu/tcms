import { Component, defineComponent } from 'vue';
import { convertJsonSchemaToZod } from 'zod-from-json-schema';
import { ToolInput, ToolInputTypes, ToolProps, ToolRegistry } from './toolTypes';

export const workflowOrchestratorErrorComponent = defineComponent({
  name: 'WorkflowOrchestratorErrorComponent',
  props: {
    errorMessage: {
      type: String,
      required: true,
    },
  },
  template: `
    <div data-testid="workflow-orchestrator-error-component" class="hidden">
      {{ errorMessage }}
    </div>
  `,
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