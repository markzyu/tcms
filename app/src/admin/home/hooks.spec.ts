import { expect } from 'vitest';
import { useLocalCDNControls } from "./hooks";

describe("useLocalCDNControls", () => {
  it("exports all fields and start/stop do not crash without awaiting", () => {
    const onStarted = vi.fn().mockResolvedValue(undefined);
    const controls = useLocalCDNControls("my-contact-card", onStarted);

    expect(controls.isLocalCDNRunning).toBeDefined();
    expect(controls.isLocalCDNError).toBeDefined();
    expect(controls.isLocalCDNStarting).toBeDefined();
    expect(controls.isLocalCDNStopping).toBeDefined();
    expect(controls.currentLCDNSlug).toBeDefined();
    expect(controls.startLocalCDN).toBeTypeOf("function");
    expect(controls.stopLocalCDN).toBeTypeOf("function");

    expect(controls.currentLCDNSlug.value).toBe("my-contact-card");

    controls.startLocalCDN();
    controls.stopLocalCDN();
  });
});
