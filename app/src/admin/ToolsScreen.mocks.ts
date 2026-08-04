import { defineComponent, onMounted, ref } from "vue";
import { IonApp, IonButton, IonContent, IonPage, IonRouterOutlet } from "@ionic/vue";
import { createRouter, createMemoryHistory } from "@ionic/vue-router";
import { flushPromises } from "@vue/test-utils";
import { waitFor } from "@testing-library/vue";
import { expect } from "vitest";

import { renderTest } from "../utils/testUtils";
import { ToolInput } from "../tools/toolTypes";
import { setWorkflowOrchestratorHasAnimation } from "../tools/WorkflowOrchestratorUtils";
import ToolsScreen, { useWorkflow } from "./ToolsScreen.vue";
import { WorkflowFinishedPromise } from "./types.ts";

export const TEST_INSTANCE_ID = "test-instance";
export const TEST_CONTENT_PATH = "/content/main.en.json";
export const TEST_JSON = { name: "John Doe" };

export const workflowPromises = ref(new Map<string, WorkflowFinishedPromise>());

export function createTemplateEditorInput(): ToolInput {
  return {
    type: "jsonWithSchema",
    json: TEST_JSON,
    jsonSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
      },
    },
    editorUiSchema: {
      fieldGroups: [],
      fieldLabels: {
        en: {},
        ja: {},
      },
    },
    filePath: {
      type: "miniAppContent",
      instanceId: TEST_INSTANCE_ID,
      _pathAsUrl: TEST_CONTENT_PATH,
    },
  };
}

let queueWorkflowFromHarness: ((runId: string, workflowId: string, input?: ToolInput) => void) | null = null;

export function queueWorkflowRun(
  runId: string,
  workflowId: string,
  input: ToolInput = createTemplateEditorInput(),
) {
  if (!queueWorkflowFromHarness) {
    throw new Error("ToolsScreen test harness is not mounted");
  }
  queueWorkflowFromHarness(runId, workflowId, input);
}

const WorkflowStarterBridge = defineComponent({
  name: "WorkflowStarterBridge",
  setup() {
    const { startWorkflow } = useWorkflow();

    onMounted(() => {
      queueWorkflowFromHarness = (runId: string, workflowId: string, input?: ToolInput) => {
        workflowPromises.value.set(
          runId,
          startWorkflow(workflowId, input ?? createTemplateEditorInput()),
        );
      };
    });

    return () => null;
  },
});

const MockWorkflowPage = defineComponent({
  name: "MockWorkflowPage",
  components: {
    IonButton,
    IonContent,
    IonPage,
  },
  setup() {
    return {
      queueWorkflowRun,
    };
  },
  template: `
    <ion-page data-testid="mock-workflow-page">
      <ion-content>
        <ion-button
          data-testid="start-template-editor"
          @click="queueWorkflowRun('template-editor-run', 'template-editor')"
        >
          Start template-editor
        </ion-button>
        <ion-button
          data-testid="start-bad-workflow"
          @click="queueWorkflowRun('bad-workflow-run', 'bad-workflow')"
        >
          Start bad-workflow
        </ion-button>
      </ion-content>
    </ion-page>
  `,
});

const ToolsScreenTestApp = defineComponent({
  name: "ToolsScreenTestApp",
  components: {
    IonApp,
    IonRouterOutlet,
    WorkflowStarterBridge,
  },
  setup() {
    setWorkflowOrchestratorHasAnimation(false);
  },
  template: `
    <ion-app>
      <workflow-starter-bridge />
      <ion-router-outlet />
    </ion-app>
  `,
});

export function createToolsScreenTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/mockpage",
        component: MockWorkflowPage,
      },
      {
        path: "/tools/:workflowId/:inputId",
        component: ToolsScreen,
      },
    ],
  });
}

export async function renderToolsScreenHarness(initialPath = "/mockpage") {
  resetToolsScreenTestState();

  const router = createToolsScreenTestRouter();
  renderTest(ToolsScreenTestApp, { router });
  await router.isReady();
  await router.push(initialPath);
  await flushPromises();
  await waitForHarnessReady();

  return { router };
}

async function waitForHarnessReady() {
  await waitFor(() => {
    expect(queueWorkflowFromHarness).not.toBeNull();
  });
}

export function resetToolsScreenTestState() {
  workflowPromises.value = new Map();
  queueWorkflowFromHarness = null;
  sessionStorage.clear();
}

export function getExpectedContentFilePath() {
  return `./public/public/instances/${TEST_INSTANCE_ID}//content/main.en.json`;
}
