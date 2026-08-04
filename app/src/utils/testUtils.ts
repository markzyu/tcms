import { fireEvent, screen, waitFor } from "@testing-library/vue";
import { IonicVue } from "@ionic/vue";
import { mount, type MountingOptions, type VueWrapper } from "@vue/test-utils";
import type { Component } from "vue";
import type { Router } from "vue-router";
import { AppLanguageKey, createAppLanguageContext } from "./i18n";

// Keep track of the wrapper instance so we can cleanup after each test
let wrapper: VueWrapper | undefined;

export type RenderTestOptions<Props, Data = {}> = MountingOptions<Props, Data> & {
  router?: Router;
};

export function renderTest<Props, Data = {}>(
  component: Component,
  options?: RenderTestOptions<Props, Data>,
): VueWrapper {
  document.dir = "ltr";

  const { router, global, ...restOptions } = options ?? {};

  wrapper = mount(component, {
    attachTo: document.body,
    ...restOptions,
    global: {
      ...global,
      plugins: [
        IonicVue,
        (app) => app.provide(AppLanguageKey, createAppLanguageContext("en")),
        ...(router ? [router] : []),
        ...(global?.plugins ?? []),
      ],
    },
  });
  return wrapper;
}

export async function clickIonButton(testId: string) {
  const ionButton = screen.getByTestId(testId);
  await waitFor(() => {
    expect(ionButton.classList.contains("hydrated")).toBe(true);
  });
  fireEvent.click(ionButton);
}

// Automatically cleanup our custom wrapper after each test
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});
