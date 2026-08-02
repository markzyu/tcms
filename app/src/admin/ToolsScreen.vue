<script setup lang="ts">
import WorkflowOrchestrator from '../tools/WorkflowOrchestrator.vue';
import { useRoute } from 'vue-router';
import { WorkflowRegistry } from '../tools/workflowTypes';
import { GenericFilePath, ToolAction, ToolRegistry } from '../tools/toolTypes';
import { JsonObjectsEditorTool } from '../tools/JsonObjectsEditor.tool';
import { onMounted } from 'vue';
import { IonPage, IonRouterOutlet } from '@ionic/vue';
import { exists, writeTextFile } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { invokeWithType } from './types.ts';
import { z } from 'zod';

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

// -------------------------- OnAction Handler --------------------------

// Note: All errors thrown here will be caught by the WorkflowOrchestrator and displayed to the user.
const convertPath = async (path: GenericFilePath): Promise<string> => {
  if (path.type === "miniAppContent") {
    const osDataDir = await invokeWithType(z.string(), "ensure_os_data_dir");
    const publicContentPath = await join(osDataDir, "public");
    const instancePath = await join(publicContentPath, "instances", path.instanceId);
    const filePath = await join(
      instancePath,
      path._pathAsUrl
    );
    if (!(await exists(instancePath))) {
      throw new Error(`Instance path does not exist: ${instancePath}`);
    }
    if (!(await exists(filePath))) {
      throw new Error(`File path does not exist: ${filePath}`);
    }
    return filePath;
  }
  throw new Error(`Unsupported path type: ${path.type}`);
};

const onAction = async (action: ToolAction) => {
  switch (action.type) {
    case "saveText":
      const path = await convertPath(action.filePath);
      await writeTextFile(path, action.text);
      return;
  }
  console.log(action);
};
</script>

<template>
  <ion-page>
    <ion-router-outlet />
    <WorkflowOrchestrator
      v-if="input"
      :workflow-id="workflowId"
      :workflow-registry="workflowRegistry"
      :tool-registry="toolRegistry"
      :input="input"
      :on-action="onAction"
    />
  </ion-page>
</template>