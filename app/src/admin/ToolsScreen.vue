<!--
  This is a wrapper of WorkflowOrchestrator, integrated into the admin shell, including the actual 
  implementation of onAction handlers, and Ionic routing logics.
-->
<script setup lang="ts">
import WorkflowOrchestrator from '../tools/WorkflowOrchestrator.vue';
import { useRoute, useRouter } from 'vue-router';
import { WorkflowRegistry } from '../tools/workflowTypes';
import { GenericFilePath, ToolAction, ToolInput, ToolRegistry } from '../tools/toolTypes';
import { JsonObjectsEditorTool } from '../tools/JsonObjectsEditor.tool';
import { onMounted, ref } from 'vue';
import { IonPage, IonRouterOutlet, onIonViewWillEnter } from '@ionic/vue';
import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { invokeWithType, WorkflowFinishedEvent, WorkflowFinishedEventData, WorkflowFinishedPromise } from './types.ts';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const route = useRoute();
const workflowId = route.params.workflowId as string;
const inputId = route.params.inputId as string;
const origInputJson = sessionStorage.getItem(inputId);
const origInput = origInputJson && JSON.parse(origInputJson);
const input = ref<ToolInput | null>(null);

onMounted(() => {
  if (!origInput) {
    history.back();
  }

  // clean up session storage for privacy reasons
  sessionStorage.removeItem(inputId);
});

onIonViewWillEnter(() => {
  if (!origInput) {
    history.back();
    return;
  }

  refreshToolInput(origInput).then(result => {
    input.value = result;
  }).catch(error => {
    console.error("Failed to load JSON data for tool input:", error);
    history.back();
  });
})

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

const { startWorkflow } = useWorkflow();

const onAction = async (action: ToolAction) => {
  switch (action.type) {
    case "closeWorkflow":
      const data: WorkflowFinishedEventData = {
        ...action,
        workflowId,
        inputId,
      };
      window.dispatchEvent(new WorkflowFinishedEvent(data));
      history.back();
      return;
    case "startWorkflow":
      await startWorkflow(action.workflowId, action.inputJson);
      return;
    case "saveText":
      const path = await convertPath(action.filePath);
      await writeTextFile(path, action.text);
      return;
  }
  console.log(action);
};
</script>

<script lang="ts">
const refreshToolInput = async (toolInput: ToolInput) => {
  if (toolInput.type !== "jsonWithSchema" || toolInput.filePath.type !== "miniAppContent") return toolInput;

  const { filePath: { instanceId, _pathAsUrl } } = toolInput;
  const osDataDir = await invokeWithType(z.string(), "ensure_os_data_dir");
  const urlParts = _pathAsUrl.split("/").filter(part => part);
  const conetntJsonPath = await join(osDataDir, "public", "instances", instanceId, ...urlParts);
  const contentJson = await readTextFile(conetntJsonPath);
  const result: ToolInput = {
    ...toolInput,
    json: JSON.parse(contentJson),
  };
  return result;
};

export const useWorkflow = () => {
  const router = useRouter();
  const startWorkflow = async (workflowId: string, input: ToolInput): WorkflowFinishedPromise => {
    // Sanity check: input shouldn't contain actual json data. (Downstream will fetch it from admin shell)
    if (input && "json" in input && input.json) {
      input.json = null;
    }

    // Passing the input
    const inputString = JSON.stringify(input);
    const uuid = uuidv4();
    const inputId = `workflow-${uuid}`;
    sessionStorage.setItem(inputId, inputString);
    router.push(`/tools/${workflowId}/${inputId}`);

    return new Promise((resolve) => {
      window.addEventListener("workflow-finished", (event: CustomEvent) => {
        if (!(event instanceof WorkflowFinishedEvent)) {
          return;
        }
        const {
          workflowId: eventWorkflowId,
          inputId: eventInputId,
          ...result
        } = event.detail;
        if (workflowId !== eventWorkflowId) {
          return;
        }
        if (eventInputId !== inputId) {
          return;
        }
        resolve(result);
      });
    });
  };
  return { startWorkflow };
}
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