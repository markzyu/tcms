# PCMS — Technical Overview

High-level architecture from design discussions. Intentionally brief; see **Open questions** for unresolved detail.

---

## Architecture summary

PCMS is a **native mobile app** that has multiple different Frontend parts, split into security levels:

1. **Admin shell** — the main UI of the PCMS phone app, able to configure and launch hosted apps, able to launch tools as part of the configuration workflows; all privileged OS operations (starting http servers, etc).
2. **Tools** — premade websites meant as productivity tools, that users can utilize to author CMS templates, and do basic OPS work on the phone; scoped OS features (opening files and storing them for mini app assets, but not starting http servers).
3. **Mini app(s)** — one or more real **HTTP servers** on `127.0.0.1` serving CMS templates; rendered in a **sandboxed iframe** (no Tauri runtime).

Admin shell and Tools are hosted separately from the mini apps, on separate backends with completely separate security and trust boundaries.

* Admin shell and Tools are standard Tauri pages, and they can invoke Tauri commands for OS interactions (opening files, running binaries, etc).
* Mini web apps are **standard web servers, running on localhost or private IPs only**. OS integration with the Android/iOS/Desktop host, would not go through the webview. Instead they must use their own backend implementations (either none by default, or, through a separate server binary)

But there is one more hidden backend component: Local CDN (LCDN)

In terms of security boundaries, Local CDN is a hidden mini app. It is a separate binary that just reads configurations and hosts static files. It runs in the **foreground** whenever there is at least one running mini app. On iOS, keeping servers alive requires the app to stay foregrounded; PCMS shows a **fullscreen screensaver** while serving (not shown in Developer Mode; see below). 

Local CDN serves for other mini apps:

* The authored contents (text)
* The relevant assets (images and files)
* JS framework, locally cached. Configurable to use remote CDN if needed.
* Any SSR cache of another mini app's HTML
* A proxy, on the backend, from a Local CDN URL to the mini apps (on a different port). This is not a redirect. It's an nginx proxy_pass.

Because it is a CDN, its port number is the actual public endpoint that all apps are served on. When a user runs multiple mini apps and visits one of them:

* We either provide a URL to the SSR content on the mini app
* Or, we provide a URL to the mini app on a subdomain of the mini app

Local CDN should enforce CSP policies to only allow access from its own domain. Users should never have to visit the mini app's own server port.

As a result, the final URL for each mini app isn't actually the address to the mini app servers. They are all just visiting the Local CDN server.

## Publishing

There are 3 modes for users to publish their websites

* Serving directly from the phone: Users must secure their own port forwarding solutions and register their own domains
* Exporting to a personal server: Users must have a computer that is publicly accessible. Phone exports CDN static content + an install script for the server binaries.
* (Static HTMLs only) Exporting to an external service: Phone exports CDN static content for templates that are completely static. User can upload this to Github Pages, netlify, or any service of their choice.

There is technically a 4th mode: Serving on another phone. But it is basically the same as the "backup and restore" feature of PCMS app data.

## Security considerations

(A) For the Admin shell, and for tools, we rely heavily on Tauri's security models. We would need to write Tauri commands that access Mobile Phone's OS. Here we should prefer **narrow, user-confirmed OS access** over broad commands that can access random parts of filesystem or wide network privileges.

Tauri doesn't host the commands on a public socket and is instead only accessibile from its own webview, even when using the brownfield pattern. So the default brownfield security is enough. But we should still enable the Tauri Isolation Pattern, because: (1) we won't ever use Tauri commands to read a verbatim file into JS memory. Instead, everything goes through Local CDN (2) The isolation pattern can be useful to sanity check that Tools are not accidentally being used by users to open and edit files from other apps: All super user functions are restricted to files owned by the PCMS app, to comply with any potential app store requirements

(B) For mini apps, we run them outside Tauri and as separate backends.

Mini apps servers, and Local CDN are served on insecure HTTP. User must bring their own reverse proxy / port forwarding / hosting solutions.

When in PCMS app, Mini apps URLs and Local CDN URLs must always be opened from a sandboxed iframe, which does not have access to Tauri runtime.

Mini app servers must open port on localhost only. Mini app servers would run with the same Filesystem/OS permssions as the app binary itself. Bundled backends only: each trusted server is **shipped with the app** as a static, codesigned binary (on iOS, may run in-process as a thread rather than a separate process). They serve **predefined template schemas only**, not arbitrary user-supplied server logic. Optional on-demand download bundles (see requirements) are still author-signed splits of the same trusted binaries—not user-defined custom servers.

Local CDN servers must open port on localhost and private networks only.

Local CDN's CSP policy should be indirectly configurable, to allow adding records for public domain names.


## Developer Mode

Developer mode is for power users who want to create their own templates while using a **backend HTTP server in another app** on the phone (e.g. Termux on Android, Pythonista on iPad). PCMS does not ship or trust that server; the user must find and run a separate app that can bind a localhost port.

This requires adding Local CDN hosting rules to whitelist the developer's URL, which must be a new port and must be localhost only. Create a hidden menu within the Admin shell to enable this feature. (Assets, contents and JS frameworks would still load from Local CDN.)

**Platform scope:** Developer mode targets **iPad** (split screen or Stage Manager with the helper app). iPhone is out of scope unless jailbroken (unsupported). Developer mode is non-standard and breaks feature parity across iPhone vs iPad and Android vs iOS—for example, no fullscreen screensaver while serving, and no guarantee of the standard foreground-serving UX.

Unrelated: There might eventually be a remote Admin UI, because super users would want to configure their phone-servers remotely. However, this would not have access to Tauri Core either. It would be just another Mini App, whose backend takes incoming API calls and then updates local configuration files. Those configuration files would only affect Local CDN, and would have a very limited number of options that serve as overrides to what the true Admin shell configures.

### Navigation and content policy (when using in-app WebView)

- **Whitelist** what may load inside the shell WebView, including within templates and mini apps. Each mini app **manifest** must declare any external dependency (domains/hosts).
- **Always allowed**: local CDN, and external, pre-approved **CDN hosts** for JS/CSS.
- **Declared iframe hosts**: templates may embed third-party pages (e.g. sign-in or ordering) only for domains listed in the manifest; users must not use unlisted sites for those functions. A template may offer multiple listed choices.
- **Not allowed inline**: undeclared external images, videos, and general third-party pages — these may exist as links; clicking opens the phone's browser, not PCMS.
- Block non-whitelisted **top-level navigation**. Mini apps should either remain in iframe, or open in another app like the real browser

### Persistence and recovery

For tools, we can just store in the Android/iOS app home folder

But for mini apps, we should

- Persist user data via **app sandbox** and/or WebView storage where appropriate.
- Allow the backend binary to store a database in mobile app, but these are considered server data, and should be in very limited forms. It shouldn't allow arbitary data.
- Assume **WebView process death** on iOS; templates and shell should tolerate reload and restore from storage.
- Support backup/restore story for power users (zip + metadata).
