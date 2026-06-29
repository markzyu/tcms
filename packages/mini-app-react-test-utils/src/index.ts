import "@testing-library/jest-dom";  // sets up basic DOM helpers for tests

export {
  DEFAULT_MOCK_INSTANCE_ROOT_PATH,
  createMockCdnBridge,
  installMockCdnBridge,
  uninstallMockCdnBridge,
  type CdnBridgeMockOptions,
  type MockCdnBridge,
} from "./cdnBridgeMock";
export {
  renderWithCdnBridge,
  type RenderWithCdnBridgeOptions,
  type RenderWithCdnBridgeResult,
} from "./renderWithCdnBridge";
