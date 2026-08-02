<script setup lang="ts">
import WorkflowOrchestrator from '../tools/WorkflowOrchestrator.vue';
import { useRoute } from 'vue-router';
import { WorkflowRegistry } from '../tools/workflowTypes';
import { ToolAction, ToolRegistry } from '../tools/toolTypes';
import { JsonObjectsEditorTool } from '../tools/JsonObjectsEditor.tool';

const route = useRoute();
const workflowId = route.params.workflowId as string;
const inputJson = route.params.inputJson as string;
const input = JSON.parse(inputJson);

const workflowRegistry: WorkflowRegistry = {
  "template-editor": {
    id: "template-editor",
    toolIds: ["json-objects-editor", "json-arrays-editor"],
    inputType: "jsonWithSchema",
  }
};

const toolRegistry: ToolRegistry = {
  "json-objects-editor": JsonObjectsEditorTool,
};

const onAction = async (action: ToolAction) => {
  console.log(action);
};
</script>

<template>
  <WorkflowOrchestrator
    :workflow-id="workflowId"
    :workflow-registry="workflowRegistry"
    :tool-registry="toolRegistry"
    :input="input"
    :on-action="onAction"
  />
</template>