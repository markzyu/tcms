# CDN Bridge object design doc

The CDN Bridge object is a client side JS object at `window.pcms.cdnBridge`. It is used to

* find the path to the content JSON for any mini app instance.
* get the root path of the mounted mini app instance, which the page can then use for page navigations.
* resolve paths and assets through the correct CDN backend, depending on localCDN vs reversedCDN.
* supply the **current page's** content JSON via `initialContentJson` when the CDN inlines it, or via a content fetch when reversed CDN omits it (see [Multi-page mini apps](#multi-page-mini-apps) and [Content provider fallback](#content-provider-fallback)).

## API

The CDN Bridge object:

```ts
type CDNType = "localCDN" | "reversedCDN" | "packDrop";

interface CDNBridge {
  /**
   * Current page content inlined by the CDN in `cdn-bridge.js` when present.
   * Contains only the active page's JSON (see multi-page query param).
   *
   * **Local CDN / pack drop / prototype:** usually set — read synchronously for initial render.
   * **Reversed CDN:** may be omitted to minimize traffic; when missing, templates must fetch
   * content (see [Content provider fallback](#content-provider-fallback)).
   */
  initialContentJson?: any;
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

In v0.1, mini-app templates load content on first render by reading **`initialContentJson` when it is present**. Local CDN (and pack-drop / prototype stubs) typically embed **only the current page's** content object in `cdn-bridge.js`. **Reversed CDN may omit `initialContentJson`** to reduce bytes on repeat visits; in that case the template must fetch the JSON (see [Content provider fallback](#content-provider-fallback)).

The only async parts of the APIs in v0.1 are `loadJsLibrary`, `loadEsModule`, and **content fetches when `initialContentJson` is missing**. `fetchContentJson` is async but reserved for post–v0.1 variant switching — do not use it as the reversed-CDN fallback (use `getContentJsonPath` + `fetch` instead).

## Multi-page mini apps

Multi-page templates do **not** ship one `index.html` per page. There is a **single HTML entry** (CSR shell + one app bundle). Which page the user sees is selected at runtime:

1. **URL query parameter** — the active page is identified by a query param (e.g. **`?pageShortName=main`**, `?pageShortName=projects-0`). The value is the page short name from `template.manifest.json` → `pages`.
   - Contact card (single page): `/my-slug/` or `/my-slug/?pageShortName=main`
   - Future multi-page template: `/my-slug/?pageShortName=projects-0`, `/my-slug/?pageShortName=about`
2. **Client routing** — React (or Vue) reads that param on load and mounts the matching page component. In-app links between pages update the query param (and may reload, or later use client-side navigation within the same shell).
3. **LCDN / reversed CDN** — when the browser requests `/__query__/cdn-bridge.js`, the **Referer** URL includes the instance path **and** the page query param. The CDN uses both to resolve the instance. **Local CDN** embeds the matching page's JSON in `initialContentJson`. **Reversed CDN** may omit `initialContentJson` (see [Content provider fallback](#content-provider-fallback)). Same rule as instance ID from referrer: do not open `cdn-bridge.js` directly; instance HTML should use `Referrer-Policy: same-origin` so the full referrer URL (including the page param) is sent on same-origin subresource requests.

Pack-drop and prototype setups follow the same model: one `index.html`, edit the query param in links/bookmarks to reach another page, and ensure the copied `cdn-bridge.js` template (or static stub) matches the page being viewed.

For v0.1 contact card (single page), `pageShortName` may be omitted or defaulted to `main`.

How to initialize the CDN Bridge object:

```html
<head>
    <script type="application/javascript" src="/__query__/cdn-bridge.js"></script>
</head>
```

Local CDN and reversed CDN should serve `cdn-bridge.js` dynamically with `cache-control: no-cache` header.

* During MVP v0.1 prototyping, when local CDN does not exist yet, the `__query__/cdn-bridge.js` and similar files should be manually created on disk, without any CDN at all. There should be a prototype version of this script to use along with a basic `python -m http.server`
* For local CDN, the `__query__` directory doesn't actually exist on disk. For reversed CDN, it is re-created per upload.
* **Local CDN** resolves the **instance** from the referrer URL and the **active page** from the page query param on that referrer (see [Multi-page mini apps](#multi-page-mini-apps)), then generates `cdn-bridge.js` with the matching **`initialContentJson`** inlined.
* **Reversed CDN** uses the same referrer parsing but **may omit `initialContentJson`** in the generated script to minimize traffic.

  (Note: This means you should never visit `__query__/cdn-bridge.js` directly. And, the localCDN should serve all HTMLs with `Referrer-Policy: same-origin` header. And this works separately from the admin shell's iframe sandboxing policy)

Exported pack drops should not need a special server. Instead, it asks users to copy the cdn-bridge template to that `__query__` directory.

## Other prep-work needed upfront, to prepare for future extensions

One major extension is to support switching the variant without reloading the page. This can likely be done by registering a listener through `CDNBridge.addOnVariantChangedListener()` and calling **`fetchContentJson(pageShortName)`** to refresh content when the variant changes.

In v0.1 the variant is static per page load. Templates must **not** call `fetchContentJson` for the initial render or for the reversed-CDN fallback.

The React or Vue side utilities should have a provider that loads initial content and later refreshes the virtual DOM when the variant changes (post–v0.1). See [Content provider fallback](#content-provider-fallback).

Eventually we must also provide `@pcms/react` and `@pcms/vue` packages that will provide the React and Vue side utilities.

## Implementation

Either local CDN, or reversed CDN, or pack drop, should generate the `window.pcms.cdnBridge` object to implement the API. It should just be a simple js script that is loaded into the mini app HTML in `<head>`.

For **local CDN**, the cdn-bridge script is generated upon previewing (or on each request to `/__query__/cdn-bridge.js`). The generator reads the referrer's instance mount path and page query param, then embeds that page's content in `initialContentJson`. Reload the page (or change the query param) to switch page or pick up variant/instance changes — the mount path does not change without a reload.

Example (local CDN): a request for `cdn-bridge.js` whose Referer is `http://127.0.0.1:3000/my-slug/?pageShortName=main` yields:

```js
window.pcms.cdnBridge = {
  initialContentJson: { name: "John Doe", headline: "Photographer", /* … */ },
  getInitialPreviewVariant: () => "en",
  // …
};
```

Example (reversed CDN, minimized): the same Referer may yield a script **without** `initialContentJson`; path helpers still work:

```js
window.pcms.cdnBridge = {
  getCDNType: () => "reversedCDN",
  getContentJsonPath: (page, variant) => `/my-slug/content/${page}.${variant}.json`,
  getInitialPreviewVariant: () => "en",
  // …
};
```

A Referer of `…/my-slug/?pageShortName=projects-0` selects `projects-0` content instead, still from the same `index.html` and app bundle.

## Content provider fallback

Template React/Vue providers (and future `@pcms/react` / `@pcms/vue` packages) **must implement a fallback** for missing `initialContentJson`:

1. **If `window.pcms.cdnBridge.initialContentJson` is defined** — use it synchronously for the first render (local CDN, pack drop, prototype).
2. **If it is missing** (typical reversed CDN) — fetch the content JSON asynchronously:
   - Resolve `pageShortName` from the URL query param (`pageShortName`, defaulting to `main` for single-page templates).
   - Build the URL with `getContentJsonPath(pageShortName, getInitialPreviewVariant())`.
   - `fetch()` that path, parse JSON, then render.
3. **Expose loading state** while the fallback fetch is in flight (`isLoading: true` until content arrives).
4. **Post–v0.1 variant changes** — continue to reserve `fetchContentJson(pageShortName)` for in-place variant updates without a full reload; that is separate from this initial-load fallback.

Do not assume `initialContentJson` is always present. Providers that only read `initialContentJson` will fail on reversed CDN when traffic minimization omits inlined JSON.

For pack drop, the cdn-bridge script is not generated upon export. Instead, a template is provided, along with instructions. And it must be edited for public hosting, or for usage without PCMS app.

## Dev mode

Dev mode users are serving custom HTML and js content from a random localhost port which is then incoporated into local CDN.

There are two options here: Either localCDN modifies the dev's HTML to include the cdn-bridge script, or the dev needs to include the cdn-bridge script in their own HTML.

I'm leaning towards the latter. We just need to provide a simple starter HTML template.

One special consideration here is that the `cdn-bridge` script should not be cached. So that the dev can always reload the preview page to get the latest version of the script.

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
