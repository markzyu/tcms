import { flushPromises, type VueWrapper } from "@vue/test-utils";
import { screen, waitFor } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";

import {
  getAdminTestMocks,
  INITIAL_SLUG,
  resetAdminTestMocks,
} from "../mocks.ts";

import { clickIonButton, renderTest } from "../../utils/testUtils.ts";
import InstanceCard from "./InstanceCard.vue";
import { IonPage } from "@ionic/vue";

const { mockFs, mockTauri } = getAdminTestMocks();

async function getUrlSlugNativeInput() {
  const ionInputElement = screen.getByTestId("url-slug-input") as unknown as HTMLIonInputElement;
  await waitFor(() => {
    expect(ionInputElement.classList.contains("hydrated")).toBe(true);
  });
  return ionInputElement.getInputElement();
}

function getStatusText() {
  return screen.getByTestId("instance-status").textContent.replace(/\s+/g, " ").trim();
}

function getPreviewIframeSrc() {
  return (screen.getByTestId("preview-iframe") as HTMLIFrameElement).getAttribute("src");
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

async function setContentJson(_page: VueWrapper, contentJson: string) {
  const ionTextareaElement = screen.getByTestId("json-data-textarea") as unknown as HTMLIonTextareaElement;
  await waitFor(() => {
    expect(ionTextareaElement.classList.contains("hydrated")).toBe(true);
  });
  const nativeTextarea = await ionTextareaElement.getInputElement();
  const user = userEvent.setup();
  await user.click(nativeTextarea);
  await user.clear(nativeTextarea);
  await user.paste(contentJson);
  await flushPromises();
}

const WrapperComponent = {
  components: {
    InstanceCard,
    IonPage,
  },
  template: `
    <ion-page>
      <instance-card instance-id="6fa27a2f-2f1e-413d-a842-424242424242" />
    </ion-page>
  `,
};

describe("InstanceCard", () => {
  beforeEach(() => {
    resetAdminTestMocks();
  });

  it("renders all components", async () => {
    renderTest(WrapperComponent);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-configs-spinner")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("instance-card")).toBeInTheDocument();
    expect(screen.getByTestId("instance-debug-card")).toBeInTheDocument();
    expect(screen.getByTestId("preview-iframe")).toBeInTheDocument();
    expect(screen.getByTestId("instance-status")).toHaveTextContent(`${INITIAL_SLUG}`);
    expect(screen.getByTestId("start-cdn-button")).toHaveTextContent("Start");
    expect(screen.getByTestId("edit-button")).toHaveTextContent("Edit");
    expect(screen.getByTestId("share-button")).toHaveTextContent("Share");
    expect(screen.getByTestId("debug-tools-heading")).toHaveTextContent("Debug Tools");
    expect(screen.getByTestId("url-slug-input")).toBeInTheDocument();
    expect(screen.getByTestId("json-data-textarea")).toBeInTheDocument();
  });

  it("can start server and show the server is running", async () => {
    renderTest(WrapperComponent);

    await clickStartAndLoadPreview();
    await waitFor(() => {
      expect(getStatusText()).toContain(`${INITIAL_SLUG} (Running)`);
    });
    expect(screen.getByTestId("stop-cdn-button")).toBeInTheDocument();
    expect(screen.queryByTestId("start-cdn-button")).not.toBeInTheDocument();
  });

  it("can start server, and if it fails, can start again", async () => {
    mockTauri.methods.setWantError(true);
    renderTest(WrapperComponent);

    await clickStartAndLoadPreview();
    await waitFor(() => {
      expect(getStatusText()).toContain(`${INITIAL_SLUG} (Error)`);
    });
    expect(screen.getByTestId("start-cdn-button")).toBeInTheDocument();

    await clickStartAndLoadPreview();
    await waitFor(() => {
      expect(getStatusText()).toContain(`${INITIAL_SLUG} (Running)`);
    });
    expect(getStatusText()).not.toContain("(Error)");
  });

  it("can stop server", async () => {
    renderTest(WrapperComponent);

    await clickStartAndLoadPreview();
    await waitFor(() => {
      expect(getStatusText()).toContain("(Running)");
    });

    await clickIonButton("stop-cdn-button");
    await waitFor(
      () => {
        expect(getStatusText()).toBe(`${INITIAL_SLUG}`);
      },
      { timeout: 2000 },
    );
    expect(screen.getByTestId("start-cdn-button")).toBeInTheDocument();
  });

  it("reads the LCDN status upon page load, when server is running", async () => {
    mockTauri.methods.setWantToForceStatusAsRunning(true);
    renderTest(WrapperComponent);

    await waitFor(() => {
      expect(getStatusText()).toContain("(Running)");
    });
  });

  it("updates preview url when editing url slug while server is running", async () => {
    renderTest(WrapperComponent);

    await clickStartAndLoadPreview();
    await waitFor(() => {
      expect(getStatusText()).toContain("(Running)");
    });

    await setUrlSlug("updated-slug");
    await waitFor(() => {
      expect(mockFs.writeTextFile).toHaveBeenCalledWith(
        expect.stringContaining("/instance.json"),
        expect.stringContaining("\"slug\":\"updated-slug\""),
      );
    });
    expect(getPreviewIframeSrc()).toContain("http://localhost:8088/updated-slug?v=");
    expect(getStatusText()).toContain("updated-slug (Running)");
  });

  it("uses updated slug after editing url slug and restarting server", async () => {
    renderTest(WrapperComponent);

    await clickStartAndLoadPreview();
    await waitFor(() => {
      expect(getStatusText()).toContain("(Running)");
    });

    await setUrlSlug("updated-slug");
    await waitFor(() => {
      expect(mockFs.writeTextFile).toHaveBeenCalledWith(
        expect.stringContaining("/instance.json"),
        expect.stringContaining("\"slug\":\"updated-slug\""),
      );
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
      expect(getStatusText()).toContain("updated-slug (Running)");
    });
    expect(getPreviewIframeSrc()).toBe("http://localhost:8088/updated-slug");
  });

  it("updates preview url when editing url slug while server is stopped", async () => {
    renderTest(WrapperComponent);

    await setUrlSlug("updated-slug");
    await waitFor(() => {
      expect(mockFs.writeTextFile).toHaveBeenCalledWith(
        expect.stringContaining("/instance.json"),
        expect.stringContaining("\"slug\":\"updated-slug\""),
      );
      expect(getPreviewIframeSrc()).toContain("http://localhost:8088/updated-slug?v=");
    });
    expect(getStatusText()).toContain("updated-slug");
  });

  it("updates debug info when editing content json", async () => {
    const page = renderTest(WrapperComponent);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-configs-spinner")).not.toBeInTheDocument();
    });

    const updatedContentJson = '{"title":"updated"}';
    await setContentJson(page, updatedContentJson);

    await waitFor(() => {
      expect(mockFs.writeTextFile).toHaveBeenCalledWith(
        expect.stringContaining("/content/main.en.json"),
        expect.stringContaining(updatedContentJson),
      );
    });
    expect(getPreviewIframeSrc()).toContain("http://localhost:8088/my-contact-card?v=");
  });
});
