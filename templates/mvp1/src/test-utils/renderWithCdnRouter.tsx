import type { CDNRouter } from "@pcms/mini-app-common";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

import {
  type CdnRouterMockOptions,
  type MockCdnRouter,
  installMockCdnRouter,
} from "./cdnRouterMock";

export interface RenderWithCdnRouterOptions extends CdnRouterMockOptions {
  renderOptions?: Omit<RenderOptions, "wrapper">;
  overrideCdnRouter?: Partial<CDNRouter>;
}

export interface RenderWithCdnRouterResult extends RenderResult {
  mockCdnRouter: MockCdnRouter;
}

/**
 * Render a component with window.pcms.cdnRouter mocked.
 * Content is provided via initialContentJson; no bundle or network involved.
 */
export function renderWithCdnRouter(
  ui: ReactElement,
  options: RenderWithCdnRouterOptions = {},
): RenderWithCdnRouterResult {
  const { renderOptions, ...cdnRouterOptions } = options;
  const mockCdnRouter = installMockCdnRouter(cdnRouterOptions);
  if (options.overrideCdnRouter) {
    Object.assign(mockCdnRouter, options.overrideCdnRouter);
  }

  return {
    mockCdnRouter,
    ...render(ui, renderOptions),
  };
}
