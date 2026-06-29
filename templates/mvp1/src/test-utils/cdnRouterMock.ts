import type { CDNRouter, CDNType } from "@pcms/mini-app-common";
import type { ContactCardContent } from "../content/contactCard";
import { defaultContactCardContent } from "./fixtures/contactCardContent";

export interface CdnRouterMockOptions {
  /** Active preview variant returned by getInitialPreviewVariant(). */
  variant?: string;
  /** Default content for the main page in initialContentJson. */
  content?: ContactCardContent;
  /** Partial overrides merged onto the generated mock. */
  overrides?: Partial<CDNRouter>;
}

export type MockCdnRouter = jest.Mocked<CDNRouter>;

export function createMockCdnRouter(
  options: CdnRouterMockOptions = {},
): MockCdnRouter {
  const variant = options.variant ?? "en";
  const initialContentJson = options.content ?? defaultContactCardContent;

  const mock = {
    initialContentJson,
    fetchContentJson: jest.fn().mockResolvedValue(initialContentJson),
    getCDNType: jest.fn((): CDNType => "localCDN"),
    getContentJsonPath: jest.fn(
      (pageShortName: string, pageVariant: string) =>
        `content/${pageShortName}.${pageVariant}.json`,
    ),
    getInitialPreviewVariant: jest.fn(() => variant),
    getInstanceRootPath: jest.fn(() => "/cards/test-instance/"),
    getOriginUrl: jest.fn(() => new URL("http://mock_host_name:3000")),
    loadJsLibrary: jest.fn().mockRejectedValue(undefined),
    loadEsModule: jest.fn().mockResolvedValue(undefined),
    ...options.overrides,
  };

  return mock as MockCdnRouter;
}

export function installMockCdnRouter(
  options: CdnRouterMockOptions = {},
): MockCdnRouter {
  const mock = createMockCdnRouter(options);
  window.pcms = { cdnRouter: mock };
  return mock;
}

export function uninstallMockCdnRouter(): void {
  Reflect.deleteProperty(window, "pcms");
}
