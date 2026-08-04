import "./mocks.ts";
import "./ToolsScreen.mocks.ts";

import { flushPromises } from "@vue/test-utils";
import { fireEvent, screen, waitFor, within } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { clickIonButton } from "../utils/testUtils";
import {
  getExpectedContentFilePath,
  queueWorkflowRun,
  renderToolsScreenHarness,
  resetToolsScreenTestState,
  workflowPromises,
} from "./ToolsScreen.mocks";
import { getAdminTestMocks } from "./mocks";
import { WorkflowFinishedPromise } from "./types.ts";

const { mockFs } = getAdminTestMocks();

async function waitForLoadingGone() {
  await waitFor(() => {
    expect(screen.queryByTestId("loading-workflow")).not.toBeInTheDocument();
  });
}

async function clickStartButton(testId: string) {
  await clickIonButton(testId);
  await flushPromises();
}

async function dismissWorkflowErrorAlert() {
  const alerts = await waitFor(() => screen.getAllByTestId("workflow-orchestrator-error-alert"));
  const alert = alerts[alerts.length - 1];
  const btn = within(alert).getByText("Go back");
  await userEvent.setup().click(btn);
  await flushPromises();
}

async function expectPromiseStillPending(promise: WorkflowFinishedPromise) {
  await expect(
    Promise.race([
      promise.then(() => "resolved"),
      new Promise((resolve) => setTimeout(() => resolve("pending"), 100)),
    ]),
  ).resolves.toBe("pending");
}

describe("ToolsScreen", () => {
  let historyBackSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetToolsScreenTestState();
    mockFs.exists.mockResolvedValue(true);
    historyBackSpy = vi.spyOn(history, "back");
  });

  afterEach(() => {
    historyBackSpy.mockRestore();
  });

  it("starts template-editor, shows JsonObjectsEditor with the input, saves via writeTextFile, and resolves startWorkflow on close", async () => {
    await renderToolsScreenHarness();
    await clickStartButton("start-template-editor");

    await waitForLoadingGone();
    await waitFor(() => {
      expect(screen.getByTestId("json-objects-editor-save-button")).toBeInTheDocument();
    });
    expect(screen.getByTestId("debug-json-data")).toHaveTextContent(/"name": "John Doe"/);

    await clickIonButton("json-objects-editor-save-button");
    await flushPromises();

    const expectedPath = getExpectedContentFilePath();
    expect(mockFs.writeTextFile).toHaveBeenCalledWith(
      expectedPath,
      expect.stringContaining('"name": "John Doe"'),
    );

    const workflowPromise = workflowPromises.value.get("template-editor-run");
    expect(workflowPromise).toBeDefined();
    await expect(workflowPromise!).resolves.toEqual({
      type: "closeWorkflow",
      isSuccessful: true,
    })
    expect(historyBackSpy).toHaveBeenCalled();
  });

  it("resolves false when a non-existent workflow shows an error alert that is dismissed", async () => {
    await renderToolsScreenHarness();
    await clickStartButton("start-bad-workflow");

    await waitFor(() => {
      expect(screen.getAllByTestId("workflow-orchestrator-error-alert").length).toBeGreaterThan(0);
    });

    await dismissWorkflowErrorAlert();

    const workflowPromise = workflowPromises.value.get("bad-workflow-run");
    expect(workflowPromise).toBeDefined();
    await expect(workflowPromise!).resolves.toEqual({
      type: "closeWorkflow",
      isSuccessful: false,
    })
    expect(historyBackSpy).toHaveBeenCalled();
  });

  it("resolves true only for the closed workflow when two template-editor runs share a workflow id but have different input ids", async () => {
    await renderToolsScreenHarness();
    queueWorkflowRun("run-1", "template-editor");
    await waitForLoadingGone();

    queueWorkflowRun("run-2", "template-editor");
    await waitForLoadingGone();

    const run1Promise = workflowPromises.value.get("run-1");
    const run2Promise = workflowPromises.value.get("run-2");
    expect(run1Promise).toBeDefined();
    expect(run2Promise).toBeDefined();

    const backButton = await waitFor(() => screen.getByTestId("json-objects-editor-back-button"));
    await waitFor(() => {
      expect(backButton.classList.contains("hydrated")).toBe(true);
    });
    fireEvent.click(backButton);
    await flushPromises();

    await expect(run2Promise!).resolves.toEqual({
      type: "closeWorkflow",
      isSuccessful: true,
    })
    await expectPromiseStillPending(run1Promise!);
    expect(historyBackSpy).toHaveBeenCalled();
  });

  it("resolves false only for the failed workflow when two concurrent runs use different workflow ids", async () => {
    await renderToolsScreenHarness();
    queueWorkflowRun("concurrent-template-1", "template-editor");
    await waitForLoadingGone();

    queueWorkflowRun("concurrent-bad-2", "bad-workflow");
    await waitFor(() => {
      expect(screen.getAllByTestId("workflow-orchestrator-error-alert").length).toBeGreaterThan(0);
    });

    const templatePromise = workflowPromises.value.get("concurrent-template-1");
    const badWorkflowPromise = workflowPromises.value.get("concurrent-bad-2");
    expect(templatePromise).toBeDefined();
    expect(badWorkflowPromise).toBeDefined();

    await dismissWorkflowErrorAlert();

    await expect(badWorkflowPromise!).resolves.toEqual({
      type: "closeWorkflow",
      isSuccessful: false,
    })
    await expectPromiseStillPending(templatePromise!);
    expect(historyBackSpy).toHaveBeenCalled();
  });
});
