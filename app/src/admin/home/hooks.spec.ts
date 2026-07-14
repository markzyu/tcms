import { expect, vi } from 'vitest';

import { useLocalCDNControls } from "./hooks";

const mockTauriInvoke = vi.hoisted(() => vi.fn().mockImplementation(async (method: string) => {
  if (method === "lcdn_status") {
    return {
      running: false,
      port: null
    };
  }
  if (method === "ensure_os_data_dir") {
    return "./public";
  }
  return null;
}));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockTauriInvoke,
}));

describe("useLocalCDNControls", () => {
  it("exports all fields and start/stop do not crash without awaiting", async () => {
    const controls = useLocalCDNControls();

    expect(controls.isLocalCDNRunning).toBeDefined();
    expect(controls.localCDNError).toBeDefined();
    expect(controls.isLocalCDNStarting).toBeDefined();
    expect(controls.isLocalCDNStopping).toBeDefined();
    expect(controls.currentLCDNSlug).toBeDefined();
    expect(controls.startLocalCDN).toBeTypeOf("function");
    expect(controls.stopLocalCDN).toBeTypeOf("function");

    expect(controls.currentLCDNSlug.value).toBe("my-contact-card");

    await controls.startLocalCDN("my-contact-card");
    await controls.stopLocalCDN();

    expect(mockTauriInvoke).toHaveBeenCalledWith("lcdn_start", expect.anything());
  });
});
