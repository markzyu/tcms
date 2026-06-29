import type { CDNBridge, CDNType } from "@pcms/mini-app-common";
import type { ContactCardContent } from "../content/contactCard";
import { defaultContactCardContent } from "./fixtures/contactCardContent";

export interface CdnBridgeMockOptions {
  /** Active preview variant returned by getInitialPreviewVariant(). */
  variant?: string;
  /** Default content for the main page in initialContentJson. */
  content?: ContactCardContent;
  /** Partial overrides merged onto the generated mock. */
  overrides?: Partial<CDNBridge>;
}

export type MockCdnBridge = jest.Mocked<CDNBridge>;

export function createMockCdnBridge(
  options: CdnBridgeMockOptions = {},
): MockCdnBridge {
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

  return mock as MockCdnBridge;
}

export function installMockCdnBridge(
  options: CdnBridgeMockOptions = {},
): MockCdnBridge {
  const mock = createMockCdnBridge(options);
  window.pcms = { cdnBridge: mock };
  return mock;
}

export function uninstallMockCdnBridge(): void {
  Reflect.deleteProperty(window, "pcms");
}
