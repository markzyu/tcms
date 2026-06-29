import type { CDNBridge, CDNType } from "@pcms/mini-app-common";

export const DEFAULT_MOCK_INSTANCE_ROOT_PATH = "/test-template/test-instance";

export interface CdnBridgeMockOptions<TContent = unknown> {
  /** Active preview variant returned by getInitialPreviewVariant(). */
  variant?: string;
  /** Content for the main page in initialContentJson. */
  content?: TContent;
  /** Partial overrides merged onto the generated mock. */
  overrides?: Partial<CDNBridge>;
}

export type MockCdnBridge = jest.Mocked<CDNBridge>;

export function createMockCdnBridge<TContent = unknown>(
  options: CdnBridgeMockOptions<TContent> = {},
): MockCdnBridge {
  const variant = options.variant ?? "en";
  const initialContentJson = options.content;

  const mock = {
    initialContentJson,
    fetchContentJson: jest.fn().mockResolvedValue(initialContentJson),
    getCDNType: jest.fn((): CDNType => "localCDN"),
    getContentJsonPath: jest.fn(
      (pageShortName: string, pageVariant: string) =>
        `content/${pageShortName}.${pageVariant}.json`,
    ),
    getInitialPreviewVariant: jest.fn(() => variant),
    getInstanceRootPath: jest.fn(() => DEFAULT_MOCK_INSTANCE_ROOT_PATH),
    getOriginUrl: jest.fn(() => new URL("http://mock_host_name:3000")),
    loadJsLibrary: jest.fn().mockRejectedValue(undefined),
    loadEsModule: jest.fn().mockResolvedValue(undefined),
    ...options.overrides,
  };

  return mock as MockCdnBridge;
}

export function installMockCdnBridge<TContent = unknown>(
  options: CdnBridgeMockOptions<TContent> = {},
): MockCdnBridge {
  const mock = createMockCdnBridge(options);
  window.pcms = { cdnBridge: mock };
  return mock;
}

export function uninstallMockCdnBridge(): void {
  Reflect.deleteProperty(window, "pcms");
}

afterEach(() => {
  uninstallMockCdnBridge();
});