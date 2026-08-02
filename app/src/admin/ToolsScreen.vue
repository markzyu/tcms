<script setup lang="ts">
import WorkflowOrchestrator from '../tools/WorkflowOrchestrator.vue';
import { useRoute } from 'vue-router';
import { WorkflowRegistry } from '../tools/workflowTypes';
import { ToolAction, ToolRegistry } from '../tools/toolTypes';
import { JsonObjectsEditorTool } from '../tools/JsonObjectsEditor.tool';
import { onMounted } from 'vue';

const route = useRoute();
const workflowId = route.params.workflowId as string;
const inputKey = route.params.inputKey as string;
const inputJson = sessionStorage.getItem(inputKey);
const input = inputJson && JSON.parse(inputJson);

onMounted(() => {
  if (!input) {
    history.back();
  }

  // clean up session storage for privacy reasons
  sessionStorage.removeItem(inputKey);
});

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
    v-if="input"
    :workflow-id="workflowId"
    :workflow-registry="workflowRegistry"
    :tool-registry="toolRegistry"
    :input="input"
    :on-action="onAction"
  />
</template>