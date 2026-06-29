import "@testing-library/jest-dom";

import { uninstallMockCdnBridge } from "./cdnBridgeMock";

afterEach(() => {
  jest.clearAllMocks();
  uninstallMockCdnBridge();
});
