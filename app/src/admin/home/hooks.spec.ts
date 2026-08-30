import { expect, vi } from "vitest";
import { defineComponent, nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { IonicVue } from "@ionic/vue";

import {
  defaultInstanceConfig,
  getAdminTestMocks,
  INITIAL_CONTENT_JSON,
  INITIAL_SLUG,
  INSTANCE_ID,
  resetAdminTestMocks,
} from "../mocks";
import { useEditableInstanceConfigs, useLocalCDNControls } from "./hooks";

const { mockTauri, mockFs, mockToast } = getAdminTestMocks();

describe("useLocalCDNControls", () => {
  beforeEach(() => {
    resetAdminTestMocks();
  });

  it("exports all fields and manages starting, stopping, and running flags", async () => {
    const onUrlUpdate = vi.fn();
    const controls = useLocalCDNControls(onUrlUpdate);

    expect(controls.isLocalCDNRunning).toBeDefined();
    expect(controls.localCDNError).toBeDefined();
    expect(controls.isLocalCDNStarting).toBeDefined();
    expect(controls.isLocalCDNStopping).toBeDefined();
    expect(controls.startLocalCDN).toBeTypeOf("function");
    expect(controls.stopLocalCDN).toBeTypeOf("function");

    const startPromise = controls.startLocalCDN("my-contact-card");
    expect(controls.isLocalCDNStarting.value).toBe(true);
    await startPromise;

    expect(onUrlUpdate).toHaveBeenCalledWith("http://localhost:8088/my-contact-card");
    expect(controls.isLocalCDNRunning.value).toBe(true);
    expect(controls.isLocalCDNStarting.value).toBe(false);
    expect(mockTauri.mockInvoke).toHaveBeenCalledWith("lcdn_start", expect.anything());

    const stopPromise = controls.stopLocalCDN();
    expect(controls.isLocalCDNStopping.value).toBe(true);
    await stopPromise;

    expect(onUrlUpdate).toHaveBeenCalledWith(null);
    expect(controls.isLocalCDNRunning.value).toBe(false);
    expect(controls.isLocalCDNStopping.value).toBe(false);
    expect(mockTauri.mockInvoke).toHaveBeenCalledWith("lcdn_stop");
  });

  it("records error when startLocalCDN fails", async () => {
    const onUrlUpdate = vi.fn();
    const controls = useLocalCDNControls(onUrlUpdate);

    mockTauri.methods.setWantError(true);
    await controls.startLocalCDN(["6fa27a2f-2f1e-413d-a842-424242424242"], "my-contact-card");

    expect(controls.localCDNError.value).toBe("Error: Test error");
    expect(controls.isLocalCDNRunning.value).toBe(false);
    expect(onUrlUpdate).not.toHaveBeenCalled();
  });

  it("records error when stopLocalCDN fails", async () => {
    const onUrlUpdate = vi.fn();
    const controls = useLocalCDNControls(onUrlUpdate);

    mockTauri.methods.setWantStopError(true);
    await controls.stopLocalCDN();

    expect(controls.localCDNError.value).toBe("Error: Test stop error");
    expect(onUrlUpdate).toHaveBeenCalledWith(null);
    expect(controls.isLocalCDNRunning.value).toBe(false);
  });

  it("records error when updateLocalCDNStatus fails", async () => {
    const onUrlUpdate = vi.fn();
    const controls = useLocalCDNControls(onUrlUpdate);

    mockTauri.methods.setWantStatusError(true);
    await controls.startLocalCDN(["6fa27a2f-2f1e-413d-a842-424242424242"], "my-contact-card");

    expect(controls.localCDNError.value).toContain("Failed to get local CDN status");
    expect(controls.localCDNHost.value).toBeNull();
    expect(controls.isLocalCDNRunning.value).toBe(false);
    expect(onUrlUpdate).toHaveBeenCalledWith("http://localhost:8088/my-contact-card");
  });
});

describe("useEditableInstanceConfigs", () => {
  beforeEach(() => {
    resetAdminTestMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function mountEditableConfigsTestComponent(onUrlUpdate = vi.fn()) {
    const TestComponent = defineComponent({
      setup() {
        const hook = useEditableInstanceConfigs(INSTANCE_ID, onUrlUpdate);
        return {
          ...hook,
        };
      },
      template: `
        <div>
          <span data-testid="loading">{{ isLoadingInstanceConfig }}</span>
          <span data-testid="slug">{{ urlSlug }}</span>
          <span data-testid="content">{{ contentJson }}</span>
          <input data-testid="slug-input" v-model="urlSlug" />
          <textarea data-testid="content-input" v-model="contentJson"></textarea>
        </div>
      `,
    });

    return mount(TestComponent, {
      attachTo: document.body,
      global: {
        plugins: [IonicVue],
      },
    });
  }

  it("loads instance configs on mount and clears loading state", async () => {
    const onUrlUpdate = vi.fn();
    const wrapper = mountEditableConfigsTestComponent(onUrlUpdate);

    expect(wrapper.get("[data-testid=loading]").text()).toBe("true");

    await flushPromises();

    expect(mockTauri.methods.ensure_os_data_dir).toHaveBeenCalled();
    expect(mockFs.readTextFile).toHaveBeenCalledWith(
      `./public/public/instances/${INSTANCE_ID}/instance.json`,
    );
    expect(mockFs.readTextFile).toHaveBeenCalledWith(
      `./public/public/instances/${INSTANCE_ID}/content/main.en.json`,
    );
    expect(wrapper.get("[data-testid=loading]").text()).toBe("false");
    expect(wrapper.get("[data-testid=slug]").text()).toBe(INITIAL_SLUG);
    expect(wrapper.get("[data-testid=content]").text()).toBe(INITIAL_CONTENT_JSON);
    expect(onUrlUpdate).not.toHaveBeenCalled();
    expect(mockToast.create).not.toHaveBeenCalled();

    wrapper.unmount();
    document.body.innerHTML = "";
  });

  it("shows toast when loading configs fails", async () => {
    mockFs.readTextFile.mockRejectedValueOnce(new Error("read failed"));

    const onUrlUpdate = vi.fn();
    const wrapper = mountEditableConfigsTestComponent(onUrlUpdate);
    await flushPromises();

    expect(mockToast.create).toHaveBeenCalledWith({
      message: "Error loading configs: Error: read failed",
      duration: 5000,
    });
    expect(wrapper.get("[data-testid=loading]").text()).toBe("true");
    expect(onUrlUpdate).not.toHaveBeenCalled();

    wrapper.unmount();
    document.body.innerHTML = "";
  });

  it("writes configs and calls onUrlUpdate after debounced urlSlug change", async () => {
    const onUrlUpdate = vi.fn();
    const wrapper = mountEditableConfigsTestComponent(onUrlUpdate);
    await flushPromises();

    await wrapper.get("[data-testid=slug-input]").setValue("updated-slug");
    await nextTick();

    expect(mockFs.writeTextFile).not.toHaveBeenCalled();
    expect(onUrlUpdate).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    await flushPromises();

    expect(mockFs.writeTextFile).toHaveBeenCalledWith(
      `./public/public/instances/${INSTANCE_ID}/instance.json`,
      JSON.stringify({
        ...defaultInstanceConfig,
        slug: "updated-slug",
      }),
    );
    expect(mockFs.writeTextFile).toHaveBeenCalledWith(
      `./public/public/instances/${INSTANCE_ID}/content/main.en.json`,
      INITIAL_CONTENT_JSON,
    );
    expect(mockTauri.methods.lcdn_reload_configs).toHaveBeenCalled();
    expect(onUrlUpdate).toHaveBeenCalledWith(
      expect.stringMatching(/^http:\/\/localhost:8088\/updated-slug\?v=\d+$/),
    );
    expect(wrapper.get("[data-testid=slug]").text()).toBe("updated-slug");

    wrapper.unmount();
    document.body.innerHTML = "";
  });

  it("writes configs and calls onUrlUpdate after debounced contentJson change", async () => {
    const onUrlUpdate = vi.fn();
    const wrapper = mountEditableConfigsTestComponent(onUrlUpdate);
    await flushPromises();

    const updatedContentJson = '{"title":"updated"}';
    await wrapper.get("[data-testid=content-input]").setValue(updatedContentJson);
    await nextTick();

    await vi.advanceTimersByTimeAsync(500);
    await flushPromises();

    expect(mockFs.writeTextFile).toHaveBeenCalledWith(
      `./public/public/instances/${INSTANCE_ID}/instance.json`,
      JSON.stringify(defaultInstanceConfig),
    );
    expect(mockFs.writeTextFile).toHaveBeenCalledWith(
      `./public/public/instances/${INSTANCE_ID}/content/main.en.json`,
      updatedContentJson,
    );
    expect(mockTauri.methods.lcdn_reload_configs).toHaveBeenCalled();
    expect(onUrlUpdate).toHaveBeenCalledWith(
      expect.stringMatching(/^http:\/\/localhost:8088\/my-contact-card\?v=\d+$/),
    );
    expect(wrapper.get("[data-testid=content]").text()).toBe(updatedContentJson);

    wrapper.unmount();
    document.body.innerHTML = "";
  });
});
