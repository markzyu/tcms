import type { CDNBridge } from "@pcms/mini-app-common";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

import {
  type CdnBridgeMockOptions,
  type MockCdnBridge,
  installMockCdnBridge,
} from "./cdnBridgeMock";

export interface RenderWithCdnBridgeOptions extends CdnBridgeMockOptions {
  renderOptions?: Omit<RenderOptions, "wrapper">;
  overrideCdnBridge?: Partial<CDNBridge>;
}

export interface RenderWithCdnBridgeResult extends RenderResult {
  mockCdnBridge: MockCdnBridge;
}

/**
 * Render a component with window.pcms.cdnBridge mocked.
 * Content is provided via initialContentJson; no bundle or network involved.
 */
export function renderWithCdnBridge(
  ui: ReactElement,
  options: RenderWithCdnBridgeOptions = {},
): RenderWithCdnBridgeResult {
  const { renderOptions, ...cdnBridgeOptions } = options;
  const mockCdnBridge = installMockCdnBridge(cdnBridgeOptions);
  if (options.overrideCdnBridge) {
    Object.assign(mockCdnBridge, options.overrideCdnBridge);
  }

  return {
    mockCdnBridge,
    ...render(ui, renderOptions),
  };
}
