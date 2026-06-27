# CDN Router object design doc

The CDN Router object is a client side JS object at `window.pcms.cdnRouter`. It is used to

* find the path to the content JSON for any mini app instance.
* get the root path of the mounted mini app instance. which the page can then use for page navigations.
* route requests to the correct CDN server, depending on localCDN vs reversedCDN.

## API

The CDN Router object:

```ts
type CDNType = "localCDN" | "reversedCDN" | "packDrop";

interface CDNRouter {
  /**
   * Content JSON baked into `cdnRouter.js` at preview/export time, keyed by page short name.
   * Templates must read this for the initial render in v0.1.
   */
  initialContentJson: Record<string, unknown>;
  /**
   * Fetch content JSON for a page when the active variant changes.
   * Reserved for post–v0.1 variant switching — do not use for initial render.
   *
   * @param pageShortName - The short name of the page.
   * @param contentSanitizer - A function that sanitizes the content JSON. If not specified, we use a default JSON schema validator. Please make sure to specify a sanitizer if you want to have backwards compatibility between template versions.
   */
  fetchContentJson<T>(pageShortName: string, contentSanitizer?: (content: any) => T): Promise<T>;
  /**
   * This returns the type of CDN that is being used. It might be helpful for debug purposes. But the mini app instance would have no way to change it.
   */
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
```

The `getXXXPath` APIs should not need to perform network calls. And it returns only the paths. If a mini app has no permission to access the content, the path is still returned, but it is not guaranteed to be accessible.

In v0.1, mini-app templates read **`initialContentJson[pageShortName]`** synchronously on first render. The CDN embeds that object when generating `cdnRouter.js` (local CDN / reversed CDN) or when the author edits the pack-drop template.

The only async parts of the APIs in v0.1 are `loadJsLibrary` and `loadEsModule`. `fetchContentJson` is async but **not used in v0.1** — it exists for post–v0.1 variant switching without a full page reload.

How to initialize the CDN Router object:

```html
<head>
    <script type="application/javascript" src="/__query__/cdnRouter.js"></script>
</head>
```

Local CDN and reversed CDN should serve `cdnRouter.js` dynamically with `cache-control: no-cache` header.

* During MVP v0.1 prototyping, when local CDN does not exist yet, the `__query__/cdnRouter.js` and similar files should be manually created on disk, without any CDN at all. There should be a prototype version of this script to use along with a basic `python -m http.server`
* For local CDN, the `__query__` directory doesn't actually exist on disk. For reversed CDN, it is re-created per upload.
* And these two CDN modes should rely on the referrer header to determine the instance ID.
  
  (Note: This means you should never visit `__query__/cdnRouter.js` directly. And, the localCDN should serve all HTMLs with `Referrer-Policy: same-origin` header. And this works separately from the admin shell's iframe sandboxing policy)

Exported pack drops should not need a special server. Instead, it asks users to copy the cdnRouter template to that `__query__` directory.

## Other prep-work needed upfront, to prepare for future extensions

One major extension is to support switching the variant without reloading the page. This can likely be done by registering a listener through `CDNRouter.addOnVariantChangedListener()` and calling **`fetchContentJson(pageShortName)`** to refresh content when the variant changes.

In v0.1 the variant is static per page load. Templates must **not** call `fetchContentJson` for the initial render — use `initialContentJson` instead.

The React or Vue side utilities should have a provider that refreshes the virtual DOM when the variant changes. The v0.1 provider reads `initialContentJson` synchronously; a later version will call `fetchContentJson` on variant change.

Eventually we must also provide `@pcms/react` and `@pcms/vue` packages that will provide the React and Vue side utilities.

## Implementation

Either local CDN, or reversed CDN, or pack drop, should generate the `window.pcms.cdnRouter` object to implement the API. It should just be a simple js script that is loaded into the mini app HTML in `<head>`.

For local CDN and reversed CDN, the cdnRouter script is generated upon previewing the mini app. This means users could switch variants but cannot change the root path of the mounted mini app instance, at least not without reloading the page.

For pack drop, the cdnRouter script is not generated upon export. Instead, a template is provided, along with instructions. And it must be edited for public hosting, or for usage without PCMS app.

## Dev mode

Dev mode users are serving custom HTML and js content from a random localhost port which is then incoporated into local CDN.

There are two options here: Either localCDN modifies the dev's HTML to include the cdnRouter script, or the dev needs to include the cdnRouter script in their own HTML.

I'm leaning towards the latter. We just need to provide a simple starter HTML template.

One special consideration here is that the `cdnRouter` script should not be cached. So that the dev can always reload the preview page to get the latest version of the script.

## Side notes about ESM modules

The browser needs a `<script type="importmap">` tag to be present in the `<head>` for static `import` statements to work.

Since static imports are controlled by the author of the mini app template, it's their duty to create the importmap tag. And the dev environment of templates should reflect any missing importmap immediately, as dev feedback.

The author would create an importmap through relative URL paths, which will be resolved dynamically:

```html
<script type="importmap">
    {
        "imports": {
            "react": "/__query__/react@18.3.1/index.js",
            "react-dom": "/__query__/react-dom@18.3.1/index.js"
        }
    }
</script>
```

When using local CDN, these `__query__` paths do not exist on disk. But local CDN can route them to the correct location similar to how `proxy_pass` mirrors the content of a url. And it is up to the browser to follow the `cache-control` header and maximize performance.