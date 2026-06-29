declare global {
  type CDNType = "localCDN" | "reversedCDN" | "packDrop";

  interface CDNRouter {
    /**
     * Current page content inlined in `cdnRouter.js` when the CDN embeds it.
     * Only the active page’s JSON (see `shortPageName` query param).
     *
     * Present for local CDN, pack drop, and prototype stubs — read synchronously.
     * Omitted on reversed CDN when traffic is minimized — providers must fetch
     * via `getContentJsonPath()` + `fetch()` when undefined.
     */
    initialContentJson?: any;
    /**
     * Fetch content when the active variant changes.
     * Reserved for post–v0.1 — not for initial render or reversed-CDN fallback.
     */
    fetchContentJson<T>(
      pageShortName: string,
      contentSanitizer?: (content: any) => T,
    ): Promise<T>;
    getCDNType(): CDNType;
    /**
     * Get the path to the content JSON for a mini app instance.
     * @param instanceId - The ID of the mini app instance. If not provided, the current instance ID is used.
     */
    getContentJsonPath(pageShortName: string, variant: string, instanceId?: string): string;
    /**
     * Gets the initial variant that was used to preview the content.
     */
    getInitialPreviewVariant(): string;
    /**
     * Gets the root path of the mounted mini app instance.
     * @param instanceId - The ID of the mini app instance. If not provided, the current instance ID is used.
     */
    getInstanceRootPath(instanceId?: string): string;
    /**
     * Gets a new URL object containing only the origin of the CDN.
     */
    getOriginUrl(): URL;

    /**
     * Create a `script` tag and load a JS library according to localCDN or reversedCDN rules.
     */
    loadJsLibrary(name: string, version?: string): Promise<void>;

    /**
     * Use the `import` statement to load an ES module according to localCDN or reversedCDN rules.
     *
     * This will work for both module script context and commonjs context.
     */
    loadEsModule<T>(name: string, version?: string): Promise<T>;
  }

  interface Window {
    pcms: {
      cdnRouter: CDNRouter;
    };
  }
}

export {};
