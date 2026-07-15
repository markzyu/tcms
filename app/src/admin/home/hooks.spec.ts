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
  it("exports all fields and start/stop do not crash", async () => {
    const onUrlUpdate = vi.fn();
    const controls = useLocalCDNControls(onUrlUpdate);

    expect(controls.isLocalCDNRunning).toBeDefined();
    expect(controls.localCDNError).toBeDefined();
    expect(controls.isLocalCDNStarting).toBeDefined();
    expect(controls.isLocalCDNStopping).toBeDefined();
    expect(controls.startLocalCDN).toBeTypeOf("function");
    expect(controls.stopLocalCDN).toBeTypeOf("function");

    await controls.startLocalCDN("my-contact-card");
    expect(onUrlUpdate).toHaveBeenCalledWith("http://localhost:8088/my-contact-card");

    await controls.stopLocalCDN();
    expect(onUrlUpdate).toHaveBeenCalledWith(null);

    expect(mockTauriInvoke).toHaveBeenCalledWith("lcdn_start", expect.anything());
  });
});
