import { vi, type Mock } from "vitest";
import { LcdnInstanceConfig, LcdnStatus } from "../tauri-types";

export const INITIAL_SLUG = "my-contact-card";
export const INSTANCE_ID = "6fa27a2f-2f1e-413d-a842-424242424242";
export const INITIAL_CONTENT_JSON = '{"title":"hello"}';

export const defaultInstanceConfig: LcdnInstanceConfig = {
  instanceId: INSTANCE_ID,
  slug: INITIAL_SLUG,
  name: "My Contact Card",
  templateScope: "default",
  templateId: "my-contact-card",
  templateVersion: "1.0.0",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  currentVariant: "default",
  variants: ["default"],
};

function createReadTextFileImplementation() {
  return vi.fn().mockImplementation(async (path: string) => {
    if (path.includes("/instance.json")) {
      return JSON.stringify(defaultInstanceConfig);
    }
    if (path.includes("/content/main.en.json")) {
      return INITIAL_CONTENT_JSON;
    }
    throw new Error(`Unexpected read path: ${path}`);
  });
}

const homeTestMocks = vi.hoisted(() => {
  let wantStartError = false;
  let wantStopError = false;
  let wantStatusError = false;
  let wantToForceStatusAsRunning = false;
  let status: LcdnStatus = {
    running: false,
    port: null,
  };

  const methods: Record<string, Mock> = {
    ensure_os_data_dir: vi.fn().mockResolvedValue("./public"),
    lcdn_start: vi.fn().mockImplementation(async () => {
      if (wantStartError) {
        wantStartError = false;
        status = {
          running: false,
          port: null,
        };
        throw new Error("Test error");
      }
      status = {
        running: true,
        port: 8088,
      };
    }),
    lcdn_stop: vi.fn().mockImplementation(async () => {
      if (wantStopError) {
        wantStopError = false;
        throw new Error("Test stop error");
      }
      status = {
        running: false,
        port: null,
      };
    }),
    lcdn_status: vi.fn().mockImplementation(async () => {
      if (wantStatusError) {
        wantStatusError = false;
        throw new Error("Test status error");
      }
      if (wantToForceStatusAsRunning) {
        wantToForceStatusAsRunning = false;
        status = {
          running: true,
          port: 8088,
        };
      }
      return status;
    }),
    lcdn_reload_configs: vi.fn().mockResolvedValue(null),
    setWantError: vi.fn().mockImplementation((value: boolean) => {
      wantStartError = value;
    }),
    setWantStopError: vi.fn().mockImplementation((value: boolean) => {
      wantStopError = value;
    }),
    setWantStatusError: vi.fn().mockImplementation((value: boolean) => {
      wantStatusError = value;
    }),
    setWantToForceStatusAsRunning: vi.fn().mockImplementation((value: boolean) => {
      wantToForceStatusAsRunning = value;
    }),
    reset: vi.fn().mockImplementation(() => {
      wantStartError = false;
      wantStopError = false;
      wantStatusError = false;
      status = {
        running: false,
        port: null,
      };
    }),
  };

  const mockInvoke = vi.fn().mockImplementation((method: string) => {
    if (method in methods) {
      return methods[method]();
    }
    return Promise.resolve(null);
  });

  const mockFs = {
    readTextFile: createReadTextFileImplementation(),
    writeTextFile: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn().mockImplementation(() => {
      mockFs.readTextFile.mockReset();
      mockFs.readTextFile.mockImplementation(createReadTextFileImplementation());
      mockFs.writeTextFile.mockReset();
      mockFs.writeTextFile.mockResolvedValue(undefined);
    }),
  };

  const mockToast = {
    create: vi.fn().mockResolvedValue({
      present: vi.fn().mockResolvedValue(undefined),
    }),
    reset: vi.fn().mockImplementation(() => {
      mockToast.create.mockClear();
      mockToast.create.mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      });
    }),
  };

  return {
    mockTauri: {
      mockInvoke,
      methods,
    },
    mockFs,
    mockToast,
  };
});

export function getHomeTestMocks() {
  return homeTestMocks;
}

export function resetHomeTestMocks() {
  homeTestMocks.mockTauri.methods.reset();
  homeTestMocks.mockTauri.methods.ensure_os_data_dir.mockClear();
  homeTestMocks.mockTauri.methods.lcdn_start.mockClear();
  homeTestMocks.mockTauri.methods.lcdn_stop.mockClear();
  homeTestMocks.mockTauri.methods.lcdn_status.mockClear();
  homeTestMocks.mockTauri.methods.lcdn_reload_configs.mockClear();
  homeTestMocks.mockTauri.mockInvoke.mockClear();
  homeTestMocks.mockFs.reset();
  homeTestMocks.mockToast.reset();
}

vi.mock("@tauri-apps/api/core", () => ({
  invoke: homeTestMocks.mockTauri.mockInvoke,
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  join: (...args: unknown[]) => args.map(String).join('/'),
  readTextFile: (...args: unknown[]) => homeTestMocks.mockFs.readTextFile(...args),
  writeTextFile: (...args: unknown[]) => homeTestMocks.mockFs.writeTextFile(...args),
}));

vi.mock("@ionic/vue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ionic/vue")>();
  return {
    ...actual,
    toastController: {
      create: (...args: unknown[]) => homeTestMocks.mockToast.create(...args),
    },
  };
});
