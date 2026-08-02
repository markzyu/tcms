import { flushPromises } from "@vue/test-utils";
import { fireEvent, screen, waitFor, within } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, type Mock } from "vitest";

import { renderTest } from "../utils/testUtils";
import JsonObjectsEditor from "./JsonObjectsEditor.vue";

import {
  allGroupNames,
  defaultSavePath,
  singletonOnlyGroupNames,
  withArrayFieldsInitialDebugJson,
  withArrayFieldsInitialRender,
  withArrayFieldsJson,
  withArrayFieldsProps,
} from "./JsonObjectsEditor.fixtures";

function getDebugJson() {
  const text = screen.getByTestId("debug-json-data").textContent ?? "";
  return JSON.parse(text.replace(/^Debug:\s*/, ""));
}


function getRenderedGroupNames() {
  const grid = screen.getByTestId("field-groups-grid");
  return Array.from(grid.children)
    .filter((element) => element.classList.contains("h-full"))
    .flatMap((column) => {
      const header = column.querySelector(".mx-3");
      if (!header) {
        return [];
      }
      const headerText = header.textContent ?? "";
      const match = allGroupNames.find((name) => headerText.startsWith(name));
      return match ? [match] : [];
    });
}

function getGroupContainer(groupName: string) {
  const grid = screen.getByTestId("field-groups-grid");
  const column = Array.from(grid.children)
    .filter((element) => element.classList.contains("h-full"))
    .find((element) => (element.querySelector(".mx-3")?.textContent ?? "").startsWith(groupName));
  expect(column).toBeTruthy();
  return column as HTMLElement;
}

async function waitForIonControl(fieldTestId: string) {
  const field = screen.getByTestId(fieldTestId);
  await waitFor(() => {
    expect(field.classList.contains("hydrated")).toBe(true);
  });
  return field;
}

async function getNativeInput(fieldTestId: string) {
  const field = await waitForIonControl(fieldTestId);
  const ionInput = field.querySelector("ion-input, ion-textarea") as HTMLIonInputElement | HTMLIonTextareaElement | null;
  if (!ionInput) {
    return within(field).getByRole("textbox");
  }
  await waitFor(() => {
    expect(ionInput.classList.contains("hydrated")).toBe(true);
  });
  return ionInput.getInputElement();
}

async function setFieldInputValue(fieldTestId: string, value: string) {
  const user = userEvent.setup();
  const input = await getNativeInput(fieldTestId);
  await user.click(input);
  await user.clear(input);
  await user.paste(value);
  await flushPromises();
}

async function clickMediaPicker(fieldTestId: string) {
  const field = await waitForIonControl(fieldTestId);
  const path = fieldTestId.replace(/^field-media-/, "");
  await userEvent.setup().click(within(field).getByTestId(`media-picker-${path}`));
  await flushPromises();
}

function getArrayGroupNames() {
  return getRenderedGroupNames().filter((name) => name.startsWith("Project "));
}

async function setSegmentValue(fieldTestId: string, value: string) {
  const field = await waitForIonControl(fieldTestId);
  const segment = field.querySelector("ion-segment") as HTMLElement & { value?: string };
  segment.value = value;
  fireEvent(segment, new CustomEvent("ionChange", { bubbles: true, detail: { value } }));
  await flushPromises();
}

async function setToggleChecked(fieldTestId: string) {
  const field = await waitForIonControl(fieldTestId);
  const toggle = field.querySelector("ion-toggle") as HTMLElement;
  await waitFor(() => {
    expect(toggle.classList.contains("hydrated")).toBe(true);
  });
  await userEvent.setup().click(toggle);
  await flushPromises();
}

async function fulfillRequiredFields(onAction: Mock) {
  await clickMediaPicker("field-media-heroImage");
  expect(onAction).toHaveBeenCalledWith(
    expect.objectContaining({ type: "chooseMedia" }),
  );
}

async function getSaveButton() {
  const button = screen.getByTestId("json-objects-editor-save-button");
  await waitFor(() => {
    expect(button.classList.contains("hydrated")).toBe(true);
  });
  return button;
}

async function clickBackButton() {
  const button = screen.getByTestId("json-objects-editor-back-button");
  await waitFor(() => {
    expect(button.classList.contains("hydrated")).toBe(true);
  });
  await userEvent.setup().click(button);
  await flushPromises();
}

async function getConfirmBackAlert() {
  return await waitFor(() => screen.getByTestId("json-objects-editor-confirm-back-alert"));
}

async function expectSaveDisabled(disabled: boolean) {
  const button = await getSaveButton();
  await waitFor(() => {
    if (disabled) {
      expect(button).toHaveAttribute("disabled");
    } else {
      expect(button).not.toHaveAttribute("disabled");
    }
  });
}

async function dispatchAddArrayItem(groupName = "Project 1") {
  const actionSheet = document.querySelector("ion-action-sheet");
  expect(actionSheet).not.toBeNull();
  fireEvent(actionSheet!, new CustomEvent("didDismiss", {
    detail: {
      data: {
        action: "add-flat-array-item",
        groupName,
      },
    },
    bubbles: true,
  }));
  await flushPromises();
}

async function deleteArrayGroup(groupName: string) {
  const group = getGroupContainer(groupName);
  await userEvent.setup().click(within(group).getByText("Delete"));
  await flushPromises();
  await userEvent.setup().click(within(group).getByText("Confirm deletion"));
  await flushPromises();
}

async function renderEditor(
  overrides: {
    json?: Record<string, unknown>;
    onAction?: Mock;
  } = {},
) {
  const onAction = overrides.onAction ?? vi.fn(async (action) => {
    if (action.type === "chooseMedia") {
      action.onMediaUrl("https://example.com/hero.png");
    }
  });
  renderTest(JsonObjectsEditor, {
    props: {
      ...withArrayFieldsProps,
      input: {
        ...withArrayFieldsProps.input,
        json: structuredClone(overrides.json ?? withArrayFieldsJson),
      },
      onAction,
    },
  });
  await flushPromises();
  await waitFor(() => {
    expect(screen.getByText("Basic Information")).toBeInTheDocument();
  });
  return { onAction };
}

describe("JsonObjectsEditor", () => {
  describe("happy paths", () => {
    it("renders the WithArrayFields fixture groups, fields, and values", async () => {
      await renderEditor();

      expect(getRenderedGroupNames()).toEqual(withArrayFieldsInitialRender.groupNames);
      expect(getDebugJson()).toEqual(withArrayFieldsInitialDebugJson);

      for (const group of withArrayFieldsInitialRender.groups) {
        const groupContainer = getGroupContainer(group.name);
        expect(groupContainer).toBeInTheDocument();

        for (const field of group.fields) {
          expect(within(groupContainer).getByTestId(field.testId)).toBeInTheDocument();
          if (field.value !== undefined && !field.testId.includes("toggle") && !field.testId.includes("segment")) {
            const input = await getNativeInput(field.testId);
            expect(input).toHaveValue(String(field.value));
          }
        }
      }
    });

    it("places singleton groups in the left column and array groups in the right column", async () => {
      await renderEditor();

      const grid = screen.getByTestId("field-groups-grid");
      expect(grid.style.gridTemplateRows).toBe(withArrayFieldsInitialRender.gridTemplateRows);

      const names = getRenderedGroupNames();
      const singletonCount = singletonOnlyGroupNames.length;
      expect(names.slice(0, singletonCount)).toEqual(singletonOnlyGroupNames);
      expect(names.slice(singletonCount)).toEqual(["Project 1", "Project 2", "Project 3"]);
    });

    it("updates singleton field edits in debug JSON, and confirms before leaving", async () => {
      const { onAction } = await renderEditor();

      await setFieldInputValue("field-undefined-name", "Jane Smith");
      await setFieldInputValue("field-textarea-bio", "A short bio");

      expect(getDebugJson()).toMatchObject({
        name: "Jane Smith",
        bio: "A short bio",
      });

      await clickBackButton();
      const alert1 = await getConfirmBackAlert();
      await userEvent.click(within(alert1).getByText("Cancel"));
      await flushPromises();
      expect(onAction).not.toHaveBeenCalled();

      await setFieldInputValue("field-textarea-bio", "A long bio");
      expect(getDebugJson()).toMatchObject({
        name: "Jane Smith",
        bio: "A long bio",
      });

      await clickBackButton();
      const alert2 = await getConfirmBackAlert();
      await userEvent.click(within(alert2).getByText("OK"));
      await flushPromises();
      expect(onAction).toHaveBeenCalledWith(
        expect.objectContaining({ type: "closeWorkflow" }),
      );
    });

    it("updates each schema1 input type in debug JSON", async () => {
      const onAction = vi.fn(async (action) => {
        if (action.type === "chooseMedia") {
          action.onMediaUrl("https://example.com/hero.png");
        }
      });
      await renderEditor({ onAction });

      await setFieldInputValue("field-undefined-headline", "Engineer");
      await setFieldInputValue("field-input-email", "jane@example.com");
      await setFieldInputValue("field-input-phone", "555-0100");
      await setFieldInputValue("field-input-exampleDeepField.field1", "secret");
      await setFieldInputValue("field-undefined-exampleDeepField.field2", "42");
      await setFieldInputValue("field-undefined-heroAltText", "Portrait");

      await clickMediaPicker("field-media-heroImage");
      await setSegmentValue("field-segment-heroAlignment", "right");
      await setToggleChecked("field-toggle-exampleDeepField.field3");

      await flushPromises();

      expect(onAction).toHaveBeenCalledWith(
        expect.objectContaining({ type: "chooseMedia" }),
      );
      expect(getDebugJson()).toMatchObject({
        headline: "Engineer",
        email: "jane@example.com",
        phone: "555-0100",
        heroImage: "https://example.com/hero.png",
        heroAltText: "Portrait",
        heroAlignment: "right",
        exampleDeepField: {
          field1: "secret",
          field2: "42",
          field3: true,
        },
      });
    });

    it("updates array item edits in debug JSON", async () => {
      await renderEditor();

      await setFieldInputValue("field-undefined-projects.1.title", "Updated Music");
      await setFieldInputValue("field-undefined-projects.1.url", "https://example.com/updated");

      expect(getDebugJson().projects[1]).toMatchObject({
        title: "Updated Music",
        url: "https://example.com/updated",
      });
    });

    it("deletes array item at index 0 and reindexes group names", async () => {
      await renderEditor();

      await deleteArrayGroup("Project 1");

      expect(getArrayGroupNames()).toEqual(["Project 1", "Project 2"]);
      expect(getDebugJson().projects).toHaveLength(2);
      expect(getDebugJson().projects[0].title).toBe("Music");
      expect(getDebugJson().projects[1].title).toBe("Programming");
    });

    it("deletes a middle array item and reindexes group names", async () => {
      await renderEditor();

      await deleteArrayGroup("Project 2");

      expect(getArrayGroupNames()).toEqual(["Project 1", "Project 2"]);
      expect(getDebugJson().projects).toHaveLength(2);
      expect(getDebugJson().projects[0].title).toBe("Art");
      expect(getDebugJson().projects[1].title).toBe("Programming");
    });

    it("adds an array item through the action sheet", async () => {
      await renderEditor();

      await dispatchAddArrayItem();

      expect(getArrayGroupNames()).toEqual([
        "Project 1",
        "Project 2",
        "Project 3",
        "Project 4",
      ]);
      expect(getDebugJson().projects).toHaveLength(4);
      expect(getDebugJson().projects[3]).toEqual({});
    });

    it("clears deletion confirmation when adding an array item", async () => {
      await renderEditor();

      const group = getGroupContainer("Project 2");
      await userEvent.setup().click(within(group).getByText("Delete"));
      expect(within(group).getByText("Confirm deletion")).toBeInTheDocument();

      await dispatchAddArrayItem();

      expect(within(group).queryByText("Confirm deletion")).not.toBeInTheDocument();
      expect(within(group).getByText("Delete")).toBeInTheDocument();
    });
  });

  describe("validation and save", () => {
    it("shows an email validation error, disables save, then clears after fixing the email and saves", async () => {
      const onAction = vi.fn(async (action) => {
        if (action.type === "chooseMedia") {
          action.onMediaUrl("https://example.com/hero.png");
        }
      });
      await renderEditor({ onAction });

      await fulfillRequiredFields(onAction);
      await setFieldInputValue("field-input-email", "not-an-email");
      await flushPromises();

      expect(within(screen.getByTestId("field-input-email")).getByText("Invalid information")).toBeInTheDocument();
      await expectSaveDisabled(true);

      await setFieldInputValue("field-input-email", "valid@example.com");
      await flushPromises();

      expect(within(screen.getByTestId("field-input-email")).queryByText("Invalid information")).not.toBeInTheDocument();
      await expectSaveDisabled(false);

      await userEvent.setup().click(await getSaveButton());
      await flushPromises();

      expect(onAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "saveText",
          filePath: defaultSavePath,
          text: expect.stringContaining("\"email\": \"valid@example.com\""),
        }),
      );
      expect(onAction).toHaveBeenCalledWith(
        expect.objectContaining({ type: "closeWorkflow" }),
      );
    });

    it("does not show an email validation error when the field is focused and blurred without edits", async () => {
      await renderEditor();

      const emailInput = await getNativeInput("field-input-email");
      fireEvent.focus(emailInput);
      fireEvent.blur(emailInput);
      await flushPromises();

      expect(within(screen.getByTestId("field-input-email")).queryByText("Invalid information")).not.toBeInTheDocument();
      expect(within(screen.getByTestId("field-input-email")).queryByText("Missing information")).not.toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("splits singleton groups across both columns when there are no array groups", async () => {
      await renderEditor({
        json: {
          name: "John Doe",
        },
      });

      const grid = screen.getByTestId("field-groups-grid");
      expect(grid.style.gridTemplateRows).toBe("repeat(2, 1fr)");
      expect(getRenderedGroupNames()).toEqual(singletonOnlyGroupNames);
    });

    it("uses the misc fieldGroup without labelByLanguage to render a media input", async () => {
      await renderEditor();

      const groupContainer = getGroupContainer("Miscellaneous Questions");
      expect(within(groupContainer).getByTestId("field-media-heroImage")).toBeInTheDocument();
      expect(within(groupContainer).getByTestId("media-picker-heroImage")).toBeInTheDocument();
    });

    it("does not fail required string enum validation for an empty input object", async () => {
      await renderEditor({ json: {} });

      const segmentField = screen.getByTestId("field-segment-heroAlignment");
      expect(within(segmentField).queryByText("Missing information")).not.toBeInTheDocument();
      expect(getDebugJson().heroAlignment).toBe("left");
    });

    it("does not fail required boolean validation for an empty input object", async () => {
      await renderEditor({ json: {} });

      const toggleField = screen.getByTestId("field-toggle-exampleDeepField.field3");
      expect(within(toggleField).queryByText("Missing information")).not.toBeInTheDocument();
      expect(getDebugJson().exampleDeepField.field3).toBe(false);
    });

    it("can add an array item to a non-existing array", async () => {
      await renderEditor({ json: {} });

      await dispatchAddArrayItem();

      expect(getArrayGroupNames()).toEqual(["Project 1"]);
      expect(getDebugJson().projects).toHaveLength(1);
      expect(getDebugJson().projects[0]).toEqual({});
    });
  });
});
