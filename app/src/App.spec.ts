import { fireEvent, screen, waitFor, within } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";

import App from "./App.vue";
import router from "./router";
import { renderTest } from "./testUtils";

vi.mock("@tauri-apps/plugin-os", () => ({
  type: vi.fn(() => "macos"),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn().mockResolvedValue('{"appVersion": "0.0.0"}'),
  writeTextFile: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockImplementation((command) => {
    if (command === "ensure_os_data_dir") {
      return Promise.resolve("./public");
    }
    return Promise.resolve();
  }),
}));

const TAB_NAMES = ["Library", "Home", "Settings"] as const;

async function renderApp() {
  renderTest(App, {
    global: {
      plugins: [router],
    },
  });

  await router.isReady();
  await flushPromises();
}

async function waitForIonHydration(element: Element) {
  await waitFor(() => {
    expect(element.classList.contains("hydrated")).toBe(true);
  });
}

async function clickTab(testId: string) {
  const tab = screen.getByTestId(testId);
  await waitForIonHydration(tab);
  fireEvent.click(tab);
  await flushPromises();
}

describe("App", () => {
  it("renders tab names", async () => {
    await renderApp();

    const tabBar = await waitFor(() => {
      const element = document.querySelector("ion-tab-bar");
      expect(element?.classList.contains("hydrated")).toBe(true);
      return element as HTMLElement;
    });

    for (const tabName of TAB_NAMES) {
      expect(within(tabBar).getByText(tabName)).toBeInTheDocument();
    }
  });

  it("shows Home tab content by default", async () => {
    await renderApp();
    await waitFor(() => {
      expect(screen.getByTestId("home-page-title")).toHaveTextContent("Home");
    });
  });

  it("shows Library tab content", async () => {
    await renderApp();
    await clickTab("library-tab");
    await waitFor(() => {
      expect(screen.getByTestId("library-page-title")).toHaveTextContent("Library");
    });
  });

  it("shows Settings tab content", async () => {
    await renderApp();
    await clickTab("settings-tab");
    await waitFor(() => {
      expect(screen.getByTestId("settings-page-title")).toHaveTextContent("Settings");
    });
  });
});
