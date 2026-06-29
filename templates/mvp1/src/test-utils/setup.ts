import "@testing-library/jest-dom";

import { uninstallMockCdnRouter } from "./cdnRouterMock";

afterEach(() => {
  jest.clearAllMocks();
  uninstallMockCdnRouter();
});
