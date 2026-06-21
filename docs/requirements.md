# PCMS — Requirements Overview

**PCMS** (Phone-hosted self-contained CMS) is a mobile toolkit that hosts, configures, and serves small web apps from the phone itself. It is aimed at (1) regular users who pick templates and paste tokens to spin up simple websites, (2) power users who make use of built-in tools for their own usefulness, editing JSONs, calling popular web services, etc. (3) and power users who make use of pre-bundled backend server binaries, and offline caches of JS frameworks, to create custom local webapps.

## Overall Goals

- Run a **local mini-app platform** on Android and iOS.
- Compartmentalize the phone ops cycle into 3 types of workflows, and thus 3 types of UIs: admin shell, tools, and the hosted “mini apps” from templates.
- Ships a sophisticated "Local CDN" server for **local preview**, plus an optional **reversed Local CDN** path that syncs the same static layer to a user-configured remote bucket (GitHub, S3, Cloudflare, etc.) when publishing from the phone.
- Keep the experience **simple and safe for end users** (install template, configure tokens/paths, open and preview their website without unsafely publishing it everywhere rightaway).
- Allow **power users** to make use of local DBs, local CDN configurations, cloud services tokens, custom publishing methods, and similar power tools. But they should expect to do some glue work in other apps (e.g. Termux on Android, Pythonista on iPad).
- Support **multi-lingual configuration without multi-tenant hosting** (no parallel language URLs for user apps); config schema may exist for multiple languages, but is served flat for a small number of uses/users.
    - Even the PCMS app itself, the admin interface must support multiple languages and internationalization. (This is also, in a way, not really multi tenant hosting, but just a selection of the current "strings"/"CMS content" context)

## Out of scope / rejected

We won't implement the following

- **Socket Supply–style exposure**: arbitrary FS and socket access from frontend code.
- **Full File System Access API compliance** on mobile (e.g. pretending `showDirectoryPicker` / persistent directory handles work like desktop Chromium).
  - This means all "tools" UIs must be rewritten from scatch and cannot simply rely on existing open source webapps meant for Desktop
- **Requiring users to install a device-wide root CA** as the default path (optional power-user feature only, if ever).
- **Serving multiple live variants of the same app** at different public URLs (e.g. per-locale routes at once).

## Functional requirements / Desired capabilities

### Admin shell

- Provide an **admin UI** for installing, configuring, and opening mini apps.
- Calls upon tools to configure the mini apps and CDNs.
- **Start / stop / status** of bundled backend processes (within realistic mobile foreground/background limits).
- **App lifecycle**: assign per-app config dirs, metadata, etc.

### Tools

- JSON editor: A phone-friendly editor that relies on JSON schemas to simplify the editing experience of JSONs. This would be shown as the main interface to create a new mini app from template. This can also optionally integrate with AI API keys to assist folks who just want to chat with an AI (authentication with cloud services). But it must be able to show the edits in real time on Phone UI.
- Hosting options: Instead of using the generic JSON editor for this, we should desing a native UI for ease of use. This is part of the Settings in PCMS app. These options include a field for public hostname, a list of mini apps and their configurations (highlighting the URL pathname), and **reversed Local CDN** settings (remote provider, bucket/repo, API token, public static base URL). This "Hosting options" tool is also what shows up when editing a mini app instance.
- Backup and restore: Authentication with cloud services can also provide access to buckets and storage APIs. Use these to backup and retore the content of PCMS apps. This "Backup and restore" UI must support partially restoring only a specific mini app from any existing version of backup. But it won't support merging.
- CDN Operations: Allow dynamically caching any JS framework. Allow configuring a local URL that proxies requests to all external CDNs. Allow configuring whether the local URL prefers external CDN first, or prefers cache first (**context-aware routing**: preview prefers localhost/Local CDN; external visitors prefer remote CDN when reversed CDN is enabled). Allow clearing cache by framework. Allow configuring allowlists and banlists. Allow **publish/sync** of the local static layer to a remote bucket (reversed Local CDN)—manual or on content change—when a token is configured. Separate toggles: **reversed Local CDN** on/off and **HTML on remote CDN** on/off (HTML upload can be disabled while other static sync stays on).

- Other "Tools", which are reallly just webapps with Tauri access meant to provide super user abilities: Simple tools with file access (for my own dev purposes), phone UIs for cloud servies. Examples: SHASUM calculator with Virustotal integration (requires API key). Path of Exile tool to quickly search economy data, with access to native OCR (on device). A basic video editor powered by Melt (perhaps can even generate vague cutpoints using Whisper).

### Mini apps

- Each template is a **standard web app** served over **local HTTP** on the device. They don't have access to Tauri or OS APIs besides what the prebundled http backend logics exposes.
- These apps should support both CSR and SSR. However SSR will be a basic implementation that might do a full page refresh. These apps generate new HTML based on the content provided by the users. For CSR, this is a HTML that loads client side Vue with a content json. For SSR, real html content exists but will be re-rendered. Mini apps simply need to serve the static content on a randomly assigned port. And the local CDN will cache that and serve the page properly
- Example template: Restaurant menus with external iframes for sign-in and ordering. The template **manifest lists allowed domains** for those flows (possibly multiple choices); users must use only listed sites. (Ordering logic won't be on the phone.)
- Example template: Any prebuilt open source single binary web apps that can run on arm64.

### Developer mode

Developers should be able to run their own backend in **another phone app** that exposes a localhost HTTP server (e.g. Termux, Pythonista) and still use the CMS / CDN framework via Local CDN proxy rules. That backend is user-provided and untrusted by PCMS.

**Scope:** iPad-first (split screen or Stage Manager). iPhone out of scope unless jailbroken (unsupported). Developer mode intentionally lacks full feature parity with the standard path (e.g. no fullscreen serving screensaver; platform differences vs Android).

Tools should have a deep link on iOS or Android to help with automation, but should require manual confirmations during the run.

Eventually there might also be a remote management UI to start/stop/configure mini apps remotely, but that's a separate backend, not a part of the Tauri UI.

## Platform expectations

- **Android and iOS** are both targets; **iOS is the harder platform** (WebView lifecycle, scoped file access, background limits, TLS/WebSocket constraints).
- **Android-first prototyping** is acceptable; iOS constraints must be tracked explicitly.
- **Tauri mobile** is the UI framework for the **Admin shell** and **Tools** (Tauri pages + commands). Mini apps are separate localhost HTTP backends, previewed in a sandboxed iframe—not Tauri frontends.
- Build variants: Open source packages v.s. App store variants.
  - Open source variants are not signed with app store keys.
  - App store variants come with a donation message and come with optional in app purchases for such donations.

## Non-functional requirements

- **App Store–friendly default path**: no device-wide CA install, no broad ATS/network exceptions without justification.
- **Memory-conscious**: prefer one reused WebView; avoid many concurrent heavy WebViews; keep mini apps in “tooling SPA” weight class where possible.
- **Honest background behavior**: backends and realtime features assume **foreground-first** on mobile. While mini apps are served, PCMS keeps the app foregrounded; on iOS this uses a **fullscreen screensaver** (standard path only; not Developer Mode).

## Open questions

- Which **backend binaries** are realistic on mobile (ARM builds, size, store policy, RAM).
- **Port strategy** for mini apps: random per session vs stable per installed app; how “open in browser” URLs are shared.
- **CDN allowlist**: global list vs per-template manifest.
- **Network egress policy** per template (killswitch per mini app?)
- **WebSocket / realtime** if templates need them: supported, shimmed, or excluded on iOS.
- **Service workers** and PWA assumptions inside embedded WebView. (Most likely we shouldn't need this and should rely on content refresh via local CDN)
- Upper bound of **hosted app weight** (bundle size, IndexedDB, WebGL) before unsupported.
    - Optional **download bundles** on the iOS App Store to split a large IPA—these are still author-signed trusted binaries, not user-defined custom servers.
- How to store cloud **secret/token** UX (Keychain/Keystore)—including reversed Local CDN bucket tokens and sync credentials
- Multi-user / shared-phone data separation? (How well does the current security model protect against other apps on the same device)
