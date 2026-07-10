import { expect, Mock } from 'vitest';
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import { IonInput } from "@ionic/vue";
import { screen, waitFor } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";

import { clickIonButton, renderTest } from "../../testUtils";
import { LcdnStatus } from '../lcdn-types.ts';
import HomePage from "./HomePage.vue";

const INITIAL_SLUG = "my-contact-card";
const RESTART_HELPER_TEXT = "Please restart the server to apply the new slug";

const mockTauri = vi.hoisted(() => {
  let wantError = false;
  let status: LcdnStatus = {
    running: false,
    port: null
  };
  const methods: Record<string, Mock> = {
    lcdn_start: vi.fn().mockImplementation(async () => {
      if (wantError) {
        wantError = false;
        status = {
          running: false,
          port: null
        };
        throw new Error("Test error");
      }
      status = {
        running: true,
        port: 8088
      };
    }),
    lcdn_stop: vi.fn().mockImplementation(async () => status = {
      running: false,
      port: null
    }),
    lcdn_status: vi.fn().mockImplementation(async () => status),
    setWantError: vi.fn().mockImplementation((value: boolean) => wantError = value),
  };
  const mockInvoke = vi.fn().mockImplementation((method: string) => {
    if (method in methods) {
      return methods[method]();
    }
    return Promise.resolve(null);
  });
  return {
    mockInvoke,
    methods,
  };
});

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockTauri.mockInvoke,
}));

async function getUrlSlugNativeInput() {
  const ionInputElement = screen.getByTestId("url-slug-input") as unknown as HTMLIonInputElement;
  await waitFor(() => {
    expect(ionInputElement.classList.contains("hydrated")).toBe(true);
  });
  return ionInputElement.getInputElement();
}

function getUrlSlugHelperText(wrapperInstance: VueWrapper) {
  return wrapperInstance.findComponent(IonInput).props("helperText")?.trim();
}

function getStatusText() {
  return screen.getByTestId("home-status").textContent.replace(/\s+/g, " ").trim();
}

async function clickStartAndLoadPreview() {
  await clickIonButton("start-cdn-button");
  await dispatchPreviewIframeLoad();
  await flushPromises();
}

async function dispatchPreviewIframeLoad() {
  const iframe = screen.getByTestId("preview-iframe");
  iframe.dispatchEvent(new Event("load"));
}

async function setUrlSlug(slug: string) {
  const user = userEvent.setup();
  const nativeInput = await getUrlSlugNativeInput();
  await user.clear(nativeInput);
  await user.type(nativeInput, slug);
  await flushPromises();

  await waitFor(() => {
    expect(getStatusText()).toContain(slug);
  });
}

describe("HomePage", () => {
  beforeEach(() => {
    mockTauri.methods.lcdn_start.mockClear();
    mockTauri.methods.lcdn_stop.mockClear();
    mockTauri.methods.lcdn_status.mockClear();
    mockTauri.methods.setWantError(false);
  });

  it("renders all components", () => {
    renderTest(HomePage);

    expect(screen.getByTestId("home-page-title")).toHaveTextContent("Home");
    expect(screen.getByTestId("preview-iframe")).toBeInTheDocument();
    expect(screen.getByTestId("home-status")).toHaveTextContent(`Test: ${INITIAL_SLUG}`);
    expect(screen.getByTestId("start-cdn-button")).toHaveTextContent("Start");
    expect(screen.getByTestId("edit-button")).toHaveTextContent("Edit");
    expect(screen.getByTestId("share-button")).toHaveTextContent("Share");
    expect(screen.getByTestId("debug-tools-heading")).toHaveTextContent("Debug Tools");
    expect(screen.getByTestId("url-slug-input")).toBeInTheDocument();
    expect(screen.getByTestId("json-data-textarea")).toBeInTheDocument();
  });

  it("can start server and show the server is running", async () => {
    renderTest(HomePage);

    await clickStartAndLoadPreview();
    await waitFor(() => {
      expect(getStatusText()).toContain(`Test: ${INITIAL_SLUG} (Running)`);
    });
    expect(screen.getByTestId("stop-cdn-button")).toBeInTheDocument();
    expect(screen.queryByTestId("start-cdn-button")).not.toBeInTheDocument();
  });

  it("can start server, and if it fails, can start again", async () => {
    mockTauri.methods.setWantError(true);
    renderTest(HomePage);

    await clickStartAndLoadPreview();
    await waitFor(() => {
      expect(getStatusText()).toContain(`Test: ${INITIAL_SLUG} (Error)`);
    });
    expect(screen.getByTestId("start-cdn-button")).toBeInTheDocument();

    await clickStartAndLoadPreview();
    await waitFor(() => {
      expect(getStatusText()).toContain(`Test: ${INITIAL_SLUG} (Running)`);
    });
    expect(getStatusText()).not.toContain("(Error)");
  });

  it("can stop server", async () => {
    renderTest(HomePage);

    await clickStartAndLoadPreview();
    await waitFor(() => {
      expect(getStatusText()).toContain("(Running)");
    });

    await clickIonButton("stop-cdn-button");
    await waitFor(
      () => {
        expect(getStatusText()).toBe(`Test: ${INITIAL_SLUG}`);
      },
      { timeout: 2000 },
    );
    expect(screen.getByTestId("start-cdn-button")).toBeInTheDocument();
  });

  it("shows helper text when editing url slug while server is running", async () => {
    const page = renderTest(HomePage);

    await clickStartAndLoadPreview();
    await waitFor(() => {
      expect(getStatusText()).toContain("(Running)");
    });

    await setUrlSlug("updated-slug");
    await waitFor(() => {
      expect(getUrlSlugHelperText(page)).toBe(RESTART_HELPER_TEXT);
    });
    expect(getStatusText()).toContain("Test: updated-slug (Running)");
  });

  it("clears helper text after editing url slug and restarting server", async () => {
    const page = renderTest(HomePage);

    await clickStartAndLoadPreview();
    await waitFor(() => {
      expect(getStatusText()).toContain("(Running)");
    });

    await setUrlSlug("updated-slug");
    await waitFor(() => {
      expect(getUrlSlugHelperText(page)).toBe(RESTART_HELPER_TEXT);
    });

    await clickIonButton("stop-cdn-button");
    await waitFor(
      () => {
        expect(screen.getByTestId("start-cdn-button")).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    await clickStartAndLoadPreview();
    await waitFor(() => {
      expect(getStatusText()).toContain("Test: updated-slug (Running)");
    });
    expect(getUrlSlugHelperText(page)).toBe("");
  });

  it("does not show helper text when editing url slug while server is stopped", async () => {
    const page = renderTest(HomePage);

    await setUrlSlug("updated-slug");
    await waitFor(() => {
      expect(getStatusText()).toContain("Test: updated-slug");
    });
    expect(getUrlSlugHelperText(page)).toBe("");
  });
});
