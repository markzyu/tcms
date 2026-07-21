import { flushPromises } from "@vue/test-utils";
import { screen, waitFor } from "@testing-library/vue";
import { vi } from "vitest";

import { renderTest } from "../utils/testUtils";
import { MockOrchestratorWrapper } from "./WorkflowOrchestrator.mocks";
import { ToolInputTypes } from "./toolTypes";

type OrchestratorTestProps = {
  workflowToolIds: string;
  inputType: ToolInputTypes;
  inputJson: Record<string, unknown>;
  inputJsonSchema: Record<string, unknown>;
  onAction?: ReturnType<typeof vi.fn>;
};

const DEFAULT_PROPS: OrchestratorTestProps = {
  workflowToolIds: "json-objects-editor,json-arrays-editor",
  inputType: "jsonWithSchema" as ToolInputTypes,
  inputJson: {
    name: "John Doe",
  },
  inputJsonSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
    },
  },
};

function normalizeText(text: string | null | undefined) {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function getErrorText() {
  return normalizeText(
    screen.getByTestId("workflow-orchestrator-error-component").textContent,
  );
}

async function waitForLoadingGone() {
  await waitFor(() => {
    expect(screen.queryByTestId("loading-workflow")).not.toBeInTheDocument();
  });
}

function expectLoadedTool(testId: string) {
  expect(screen.getByTestId(testId)).toBeInTheDocument();
}

async function expectErrorMatching(...patterns: RegExp[]) {
  await waitForLoadingGone();
  const errorText = getErrorText();
  for (const pattern of patterns) {
    expect(errorText).toMatch(pattern);
  }
}

async function renderOrchestrator(overrides: Partial<OrchestratorTestProps> = {}) {
  const onAction = overrides.onAction ?? vi.fn();
  renderTest(MockOrchestratorWrapper, {
    props: {
      ...DEFAULT_PROPS,
      ...overrides,
      onAction,
    },
  });
  await flushPromises();
  return { onAction };
}

describe("WorkflowOrchestrator", () => {
  describe("happy paths", () => {
    it("loads the first eligible tool with the storybook default args", async () => {
      const { onAction } = await renderOrchestrator();

      await waitForLoadingGone();
      expectLoadedTool("json-objects-editor");
      expect(screen.getByTestId("json-objects-editor")).toHaveTextContent("John Doe");
      expect(onAction).not.toHaveBeenCalled();
    });

    it("loads json-objects-editor when tool order is json-arrays-editor,json-objects-editor", async () => {
      const { onAction } = await renderOrchestrator({
        workflowToolIds: "json-arrays-editor,json-objects-editor",
      });

      await waitForLoadingGone();
      expectLoadedTool("json-objects-editor");
      expect(screen.queryByTestId("json-arrays-editor")).not.toBeInTheDocument();
      expect(onAction).not.toHaveBeenCalled();
    });

    it("skips invalid tool ids and loads json-objects-editor", async () => {
      const { onAction } = await renderOrchestrator({
        workflowToolIds: "invalid1,json-objects-editor,invalid2",
      });

      await waitForLoadingGone();
      expectLoadedTool("json-objects-editor");
      expect(onAction).not.toHaveBeenCalled();
    });

    it("loads json-objects-editor before reaching mock-crash-during-load", async () => {
      const { onAction } = await renderOrchestrator({
        workflowToolIds: "json-objects-editor,mock-crash-during-load",
      });

      await waitForLoadingGone();
      expectLoadedTool("json-objects-editor");
      expect(onAction).not.toHaveBeenCalled();
    });

    it("loads json-objects-editor when inputJson is an empty object", async () => {
      const { onAction } = await renderOrchestrator({
        inputJson: {},
      });

      await waitForLoadingGone();
      expectLoadedTool("json-objects-editor");
      expect(onAction).not.toHaveBeenCalled();
    });

    it("loads json-objects-editor when the schema requires name and input includes it", async () => {
      const { onAction } = await renderOrchestrator({
        inputJsonSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
          required: ["name"],
        },
      });

      await waitForLoadingGone();
      expectLoadedTool("json-objects-editor");
      expect(onAction).not.toHaveBeenCalled();
    });
  });

  describe("error cases", () => {
    it("reports no eligible tool when workflowToolIds is empty", async () => {
      const { onAction } = await renderOrchestrator({
        workflowToolIds: "",
      });

      await expectErrorMatching(/There was no eligible tool to load/);
      expect(onAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "closeWorkflow",
          errorMessage: expect.stringMatching(/There was no eligible tool to load/),
        }),
      );
    });

    it("reports skip reason when json-arrays-editor cannot handle object input", async () => {
      const { onAction } = await renderOrchestrator({
        workflowToolIds: "json-arrays-editor",
      });

      await expectErrorMatching(
        /There was no eligible tool to load/,
        /json-arrays-editor/,
        /Skipping json-arrays-editor because input is not an array/,
      );
      expect(onAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "closeWorkflow",
        }),
      );
    });

    it("reports missing tools when workflowToolIds contains unknown ids", async () => {
      const { onAction } = await renderOrchestrator({
        workflowToolIds: "abc,def",
      });

      await expectErrorMatching(
        /There was no eligible tool to load/,
        /Tried abc: There is no such tool/,
        /Tried def: There is no such tool/,
      );
      expect(onAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "closeWorkflow",
        }),
      );
    });

    it("reports loader failure for mock-crash-during-load", async () => {
      const { onAction } = await renderOrchestrator({
        workflowToolIds: "mock-crash-during-load,json-objects-editor",
      });

      await expectErrorMatching(
        /Failed to load required tool mock-crash-during-load/,
        /Mock crash during load/,
      );
      expect(onAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "closeWorkflow",
        }),
      );
    });

    it("reports input type mismatch when workflow expects miniAppInstance", async () => {
      const { onAction } = await renderOrchestrator({
        inputType: "miniAppInstance",
      });

      await expectErrorMatching(
        /There was no eligible tool to load/,
        /json-objects-editor: Input type mismatch: jsonWithSchema !== miniAppInstance/,
        /json-arrays-editor: Input type mismatch: jsonWithSchema !== miniAppInstance/,
      );
      expect(onAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "closeWorkflow",
        }),
      );
    });

    it("reports schema validation error when name is not a string", async () => {
      const { onAction } = await renderOrchestrator({
        inputJson: {
          name: 123,
        },
      });

      await expectErrorMatching(
        /jsonWithSchema is invalid:/,
        /"path":\s*\[\s*"name"\s*\]/,
        /invalid_type/,
        /"expected":\s*"string"/,
      );
      expect(onAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "closeWorkflow",
        }),
      );
    });
  });
});
