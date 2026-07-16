# TCMS — MVP v0.1 Design Plan

# STATUS: PARTIAL DRAFT (Phases 0-1 are reviewed)

High-level project map and phased delivery plan for the first vertical slice: **contact card** template proving the TCMS spine.

Complements [requirements.md](./requirements.md), [tech-overview.md](./tech-overview.md), [motivation.md](./motivation.md), and [futures-looking.md](./futures-looking.md) (draft contracts not in Phase 0 scope).

## North star (v0.1)

> **Create a contact card on phone, edit in a Tool, preview through Local CDN, show on same device.**

> **Mini-app templates use React (CSR) in v0.1. The Admin shell and Tools use Vue (Tauri). Vue as a mini-app framework is deferred.**

Everything else in motivation (pack drops, today's board, field kit, reversed CDN) hangs off this spine once instance schema + LCDN + editor tool exist.

## Multi-project map

TCMS is **6 projects** that can ship independently but share contracts:


| #      | Project                      | Owns                                                                      | Defers                                                                     |
| ------ | ---------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **P1** | **Runtime shell**            | Tauri app, routing, Admin ↔ Tool navigation, Tauri commands for lifecycle | Multiple templates, pack drop                                              |
| **P2** | **Local CDN (LCDN)**         | Single entry point, serves static files, routes instances                 | Reversed CDN, framework cache, CSP polish, non-static backends, proxy_pass |
| **P3** | **Instance & config schema** | Mini-app instance model, on-disk layout, template manifest contract       | CAS, signed packs, merge                                                   |
| **P4** | **Template: example-info-card1**   | React CSR mini-app + content model                                        | SSR, iframes, arrays, Vue mini-apps                                        |
| **P5** | **Tool: template editor**    | Reusable Edit/Preview chrome, schema-driven form, preview iframe          | AI assist, version history UI                                              |
| **P6** | **Publish & ops** (later)    | Pack drop zip, reversed CDN sync, hosting options, backup                 | v1                                                                         |


### UI areas mapped

```
Admin shell (P1)          Tools (P5)                   Mini apps (P4)
─────────────────         ─────────────────            ─────────────────
• instance list      →    • TemplateEditor tool   →    • is a CSR mini-app
• "New contact card"      • Edit tab (schema form)     • serves template
• "Edit" / "Preview"      • Preview tab (iframe)       • bound 127.0.0.1
• start/stop LCDN         • reusable ToolNav           • served via LCDN
```

Mini apps are **never** opened as Tauri routes. Preview tab loads **LCDN URL in sandboxed iframe**.

## Phase 0 — Contracts + standalone template

**Goal:** Freeze the **minimal** internal configuration schema and ship the example-info-card1 as a **standalone site** (CMS schema + React CSR) before LCDN integration.

Forward-looking shapes (CAS, multi-page manifest, rich editor UI, LCDN/rcdn ops blocks) are in [futures-looking.md](./futures-looking.md) — not Phase 0 scope.

### Deliverables

1. `**template.manifest.json`** (per template, bundled with app)
2. `**instance.json**` (per mini-app instance, user data)
3. **Variant content files** — `content/{pageShortName}.{variant}.json` (contact card: `main.en.json`, etc.)
4. Directory layout under app sandbox (see below)
5. **Standalone example-info-card1 site** — React CSR reading the active variant content file; runnable without the ThorCMS app shell for dev/demo

### Directory layout

```
instances/
  {instanceId}/
    instance.json
    content/
      main.en.json
      main.es.json
    assets/
      hero.jpg
templates/
  example-info-card1/
    manifest.json
    schema/content.schema.json
    app/                    # mini-app static bundle (React CSR)
```

### Content file naming

Content files use `**{pageShortName}.{variant}.json**`.

- **Page short name** — key from `template.manifest.json` → `pages` (contact card: `main`).
- **Variant** — locale or edition tag (e.g. `en`, `es`). One variant is **active** at a time via `instance.json` → `currentVariant`.
- Phase 0 contact card is **single-page, flat fields, no arrays**. Multiple variants are supported; only the active variant is served in preview/publish until the user switches.

### `instance.json` (v0)

Source of truth for instance metadata and which content variant is active.

```json
{
  "instanceId": "6fa27a2f-2f1e-413d-a842-424242424242",
  "slug": "my-contact-card",
  "name": "My contact card",
  "templateId": "example-info-card1",
  "templateVersion": "1.0.0",
  "createdAt": 1782051137000,
  "updatedAt": 1782051137000,
  "currentVariant": "en",
  "variants": ["en", "es"]
}
```

- `**slug**` — the URL slug for this instance.
- `**currentVariant**` — which `{pageShortName}.{variant}.json` files are live for preview/publish.
- `**variants**` — declared locale/edition tags for this instance. Phase 0 may ship with one variant seeded; the field exists so multi-lingual config does not require a schema migration later.

### example-info-card1 content model

Flat model for `content/main.{variant}.json` — no arrays in Phase 0.


| Field       | Type   | Notes                                       |
| ----------- | ------ | ------------------------------------------- |
| `name`      | string | e.g. “John Doe”                             |
| `headline`  | string | e.g. “Photographer”                         |
| `bio`       | string | multiline                                   |
| `email`     | string |                                             |
| `phone`     | string |                                             |
| `heroImage` | string | path relative to mount (`/assets/hero.jpg`) |

And optionally, `heroAltText`, `heroAlignment` (whether the image is left or right aligned).


### `content/main.en.json` (v0 example)

```json
{
  "name": "John Doe",
  "headline": "Photographer",
  "bio": "John is a photographer based in New York City. He is known for his street photography and his use of color. He has been photographing for 10 years. His favorite camera is the Leica M10.",
  "email": "john@example.com",
  "phone": "123-456-7890",
  "heroImage": "/assets/hero.jpg"
}
```

### `content.schema.json` (v0)

Aligned with example-info-card1 Phase 0 — flat fields only, minimal editor UI groups.

```json
{
  "schemaVersion": "0.1.0",
  "editorUiSchema": {
    "fieldGroups": [
      {
        "name": "Basic Information",
        "paths": ["name", "headline", "bio"],
        "isSingleton": true
      },
      {
        "name": "Contact Information",
        "paths": ["email", "phone"],
        "isSingleton": true
      },
      {
        "isSingleField": true,
        "isSingleton": true,
        "paths": ["heroImage"]
      }
    ]
  },
  "jsonSchema": {
    "type": "object",
    "properties": {
      "name": { "title": "Name", "type": "string" },
      "headline": { "title": "Headline", "type": "string" },
      "bio": { "title": "Bio", "type": "string" },
      "email": { "title": "Email", "type": "string" },
      "phone": { "title": "Phone", "type": "string" },
      "heroImage": {
        "title": "Hero Image",
        "description": "Filename under assets/ for this instance.",
        "type": "string"
      },
      "heroAltText": {
        "title": "Hero Image Alt Text",
        "type": "string"
      },
      "heroAlignment": {
        "title": "Hero Image Alignment",
        "type": "enum",
        "enum": ["left", "right"],
        "default": "left"
      }
    },
    "required": ["name", "heroImage"]
  }
}
```

### `template/manifest.json` (v0)

example-info-card1 only — single page, CSR default. LCDN mount paths and backend config come in Phase 1; see [futures-looking.md](./futures-looking.md) for the expanded manifest shape.

```json
{
  "id": "example-info-card1",
  "version": "1.0.0",
  "title": "Contact Card",
  "dependencies": {
    "react": "/react@18.3.1/dist/react.production.min.js",
    "react-dom": "/react-dom@18.3.1/dist/react-dom.production.min.js"
  },
  "pages": {
    "main": {
      "schema": "schema/content.schema.json"
    }
  }
}
```

As a reminder, the pages are not individual html files. They are a single PWA html that serves different content based on a query parameter `pageShortName`.

## Phase 1 — Basic Local CDN

**Goal:** LCDN v0 — one instance, one route, serving html and JS statically. No reversed CDN, no framework cache.

### LCDN v0 capabilities

- Read `**lcdn.config.json`** (or equivalent) listing registered instances
- Bind **127.0.0.1:8088**
- For each instance at `/{slug}/`:
  - Serve active variant content (`content/main.{currentVariant}.json`), other variant files on request, and `assets/`* from instance dir
  - Serve cached/bundled HTML entry (CSR shell)
- Expose preview URL to Tauri: `http://127.0.0.1:{lcdnPort}/{slug}/`

Additionally, we will have a basic debug UI in Tauri:
- A start/stop button 
- An iframe to preview the instance
- A text area to edit content json
- A textbox to edit the slug

### LCDN v0 implementation

- LCDN is an in-process, singleton server on **hardcoded static port 8088**
- LCDN starts via Tauri command. Tauri passes in LCDN config object, along with paths to templates, and instances.
- LCDN handles "static" server mode directly, without the need for a separate static server crate.
- Tauri can also control LCDN via IPC/Rust states. Here is a preview of possible features:
  - Tauri can shutdown LCDN. Think `axum::serve().with_graceful_shutdown()`
  - Tauri can update the LCDN config, through `arc_swap`. 
  - Tauri can add/remove instances visible to LCDN. LCDN uses Dynamic Routing and reads the config to know which instances to serve.
- But, for CSR v0, dynamic work is minimal: starting, stopping, and, hotswapping the LCDN config (renaming instance slug, not adding/removing instances)

### `lcdn.config.json`

```json
{
  "port": 8088,
  "startupTimeout": 1500,
  "healthcheckTimeout": 3000,
  "instanceIds": [
    "6fa27a2f-2f1e-413d-a842-424242424242"
  ]
}
```

Note: In rust, we will ask serde to convert the fields from camelCase to snake_case.

The instanceIds array lists the instance ids to enable by default. 

This config file is hotload-able. Tauri can update just about anything by restarting the http server. But, Tauri can also just update the list of instanceIds through an IPC command (which should also update the config file on disk).

As for the storage of templates vs instances: Templates are stored as zipfiles under public `templates/@tcms` folder, because they won't change. But instances must be actual files in folders. We could ship example instances using zipfiles but those must be unzipped to the public `instances` folder.

### Tauri commands (minimal)

- `lcdn_start()` / `lcdn_stop()` / `lcdn_status()`
- `lcdn_sync_instances()` → reads existing list of instances again. renames instance slug if needed (only if the ids stay the same)
- `lcdn_get_preview_url(instanceId)` → for Preview tab

### Out of scope for LCDN v0

- Multi-instance routing polish
- JS framework CDN cache
- CSP enforcement (stub only)
- Reversed CDN upload
- Screensaver (stub “serving” state in UI only)
- Simulation of nginx `proxy_pass` to other backend types

### Success criteria

- lcdn_start() binds 127.0.0.1
- Seeded instance `6fa27a2f-2f1e-413d-a842-424242424242` is unzipped correctly to `instances/{instanceId}/` and is registered through Tauri to run on LCDN.
- Solidify Rust struct / serde definitions for `instance.json`, without the JSON Schema for now.
- GET http://127.0.0.1:{port}/my-contact-card/ renders contact card with content from disk. Verify `Referrer-Policy` header.
- GET http://127.0.0.1:{port}/my-contact-card/assets/xxx for assets in `content/main.en.json`, where it is specified as `/assets/xxx`
- GET `/__query__/cdn-bridge.js` (Referer = instance URL) inlines current main.{currentVariant}.json. Verify `cache-control` header.
- Edit `instances/.../content/main.en.json` → iframe refresh shows new text (no app restart).
- Slug change updates mount path and preview URL (via config hotswap).
- Debug UI: start/stop, iframe to preview URL, optional JSON/slug editors wired to disk + config refresh.

---

## Phase 2 — Admin shell + Template Editor tool

**Goals:** 

* Content Editing as a **Tool**, invoked from Admin Shell — not hardwired as the app root.
* Each tool is served from Tauri and must be built as a Vue page.

### Formalizing the Architecture of "Tools"

We would define a "tool" as a part of the "tool workflow".

What we discussed in requirement docs is really the capability of a "tool workflow", not a tool. And each workflow, technically, can be built from multiple tools. There are two kinds of tools in a "tool workflow".

* The backend tool is any Tauri/Rust capability to provide file conversion/manipulation such as ffmpeg, melt, etc. This also includes the basic tauri commands for LCDN configuration and management.
* The frontend tool is just Vue page in the frontend, similar to an admin page. Each tool should not start by its own. And the admin shell must call into the tools based on user consent and interaction

There are also two types of schemas:

A backend tool and a frontend tool should establish a contract using "backend schemas". The backend schemas define what configurations are allowed for backend tool's actions. The frontend tool doesn't have permission to call the backend tool directly. It returns a json fitting the backend schema and admin shell invokes the backend tool with the json.

Separately, we can also have "frontend schemas", which are contracts between purely frontend tools. And these are really just a way to automate workflows by combining multiple tool UIs. In this case, each frontend tool returns its own json describing its inputs, outputs, and backend dependencies. And Admin shell needs to connect the inputs and outputs between multiple tools to create a UI workflow. 

In sum, the admin shell only really needs to implement the following:

* Parsing frontend schemas, backend schemas, and workflow schemas
* Enabling and calling the frontend tools and backend tools
* Displaying a UI consent screen, confirming the list of backend tools invoked by a workflow
* Executing the workflow by displaying the correct frontend and calling the backend tools with the correct json
* Handling the workflow state persistence, in case frontend webview context expires while backend runs

Beyond the MVP scope, we might support creating custom workflows out of composable tools that are builtin to the ThorCMS app. But there is something we would never support: Developer mode would not allow registration of new, custom tools. As a workaround, we could provide a custom "developer tool" which is just a pre-bundled UI to issue arbitrary http calls to any custom backend on the developer's phone.

### Routing model

Tauri internal routes:

```
/home/                     AdminHome (instance list)
/tool/xxx                  Entry point of tools
```

Each frontend tool is registered as a route in Vue Router. They do not communicate via URL parameters. Instead, admin shell stores all workflow states in Rust backend through IPC commands.

> Special tauri commands for Workflow states: `workflow_start(wf_name)`, `workflow_next_step()`, `workflow_end()`, `workflow_get_step_name()`, `workflow_get_step_state(step_name)`, `workflow_set_step_state(step_name, state)`

Tauri commands and OS APIs (Backend tools)

```
lcdn_reload_configs()      Reloads the LCDN config from disk.
ffmpeg_start(config_path)  Starts ffmpeg with the given config file.
melt_start(config_path)    Starts melt with the given config file.
...                        ... more backend tools ...
```

Notes: 

* Workflows don't have a URL. The frontend tools have Vue Router URLs.
* Workflow states are entirely managed in Rust memory through IPC commands.
  * Though the phone can kill the webview context at any time, we don't need to persist workflow state beyond the lifetime of Rust backend.
  * This in-memory state is basically a singleton for the "current" workflow.

### Admin shell v0

Beyond a basic secure setup of tools with workflow schemas, with persistent workflow states, the Admin shell needs to actually implement tools for the following features:

- `edit-instance` workflow: Editing a new or existing instance.
  - Assumption: Content schema would never define object fields dynamically. For those use cases, they would always define the dynamic content as an array of objects.
  - Caveat: Each dynamic array in Content schema should define a key field. Otherwise, we default to the index, and it's not ideal.
- `json-objects-editor` frontend tool, for editing either objects, objects of objects, and top level, flat arrays of objects
  - For objects that do not nest arrays, we can essentially display each leaf object in a new section, titled by its full parent path.
  - For objects that contain a flat array, we can display each object in a new section, titled by the array path + the item's key field.
- `json-arrays-editor` frontend tool, for navigating nested arrays of objects, while relying on `json-objects-editor` to edit the objects
  - This scenario covers anything that's not an object of object, not a flat object, and not a flat array of objects.
  - This UI shows two levels of lists. The inner level shows the item names of the leaf array. The outer level shows the path from root to the leaf array.
- Both `json-objects-editor` and `json-arrays-editor` can be called with new root objects or arrays.

**Reminder**: Frontend tools cannot directly call backend. They return jsons. And the workflow schemas specify what backend tools can be called. Admin shell performs that call on its behalf.

And the Admin shell needs to implement the following natively, as admin features and not as tools:

- List instances (even if one seeded initially)
- "New instance" button → creates instance dir + default `content/main.en.json` (and `instance.json` with `currentVariant: "en"`)
- Row action **“Edit”** → `navigateTo('/tool?wf=edit-instance&instanceId=…')`
- Shows LCDN status (running / stopped)
- Displays the full screen preview of the instance
- `lcdn_reload_configs()` backend tool

As for the schemas, we should focus more on the backend schemas than frontend or workflow schemas.
* The workflow schemas would only list the frontend and backend tools for now. It's used to decide what to show on the consent screen. It's also used to determine the permissions / scope that backend tools can run at.
* The frontend schemas can be missing for now.
* In the long run, we eventually could also define the output of `json-objects-editor` as (the new JSON + a new path to edit + or a boolean indicating edit completion), and define the output of `json-arrays-editor` as the path to the chosen array item. And we could define both to take root json + a relative path as the input. This would allow workflows to eventually define multiple jq queries to actually route the edited JSONs.

This schema design would eventually allow users to create their own custom workflows. But it would start mostly as a stub.

**Also, very importantly: Internationalization (i18n)**

!! At this point, the Admin shell would need to support Internationalization (i18n). We should consider either Vue I18n or our own template schema.

We might need both eventually. One solution for loading/managing international versions of contents. The other solution for string templates designed to help i18n (when some strings come from template devs and other strings come from users).

But, for now, we assume that all strings come from users. And we focus on the user content's i18n structure.

---

---

# STATUS: DRAFT (Phase 3 and beyond, NEED FULL, HUMAN REVIEW.)

---

## Phase 3 — Polishing + migration to real templates

**Goal:** Make v0.1 demo-ready for one market story; harden template packaging for additional templates later.

Pick **one** primary story first (recommended: **Today's board + pack drop export** before reversed CDN):


| Story                 | What to add                                                  |
| --------------------- | ------------------------------------------------------------ |
| **Today's board (C)** | LCDN on LAN IP; full-screen preview route; “open in browser” |
| **Pack drop (A/B)**   | Export `instances/{id}/` → `.tcms.zip` per motivation doc    |
| **Public link (A/C)** | Reversed CDN upload of assets + optional HTML toggle         |


Also: asset picker for hero image, HTML cache on save, persist backend port in `instance.json` for stable LAN URLs.

---

## Design decisions (lock early)

1. **Content authority:** `content/main.{variant}.json` in instance dir is source of truth; LCDN serves it; mini-app reads via LCDN URL (not Tauri).
2. **Tool invocation contract:** Admin passes `instanceId` + `toolId`; tool loads schema from template bundle.
3. **Preview always via LCDN:** Preview tab never points iframe at mini-app port directly.
4. **CSR default:** Contact card needs no SSR for v0; SSR toggle deferred until template 2 (see [futures-looking.md](./futures-looking.md)).
5. **Port strategy:** Serving on a hardcoded static port for now. This can be configurable later.
---

## Repo structure

```
tcms/
  docs/
  app/
    crates/        # Local CDN + any template backend
      common/      # Common types such as the schema for Instance, LCDN config, etc.
      lcdn-server/
    src-tauri/     # Tauri commands. Consumes LCDN types.
    src/           # Tauri + Vue Admin + Tools
      admin/
      tools/
        common/ToolShell.vue, ToolNav.vue
        template-editor/
  packages/
    mini-app-*/    # See naming scheme in ops-pkg-and-versions.md
    tool-*/
    admin-*/
  templates/
    example-info-card1/  # Manifest, schema, React app
    schemas/       # Shared JSON Schema defs (optional)
```

---

## Priority backlog (post–v0.1)

Ordered list of work **after** the four epics; not all are v0.1 scope.

### v0.2 — “Show someone”

1. LCDN LAN binding for board demo
2. Asset picker for hero image (Tauri → `assets/`)
3. HTML cache on save (CSR snapshot in `cache/`)
4. Pack export v0 (zip shape from motivation doc)

### Later

1. Second template (restaurant menu — arrays + iframe manifest)
2. JSON editor tool (generic, power users)
3. CDN ops tool
4. Reversed CDN providers (separate integrations)
5. SSR mode toggle per instance
6. Developer mode / external backend whitelist
7. Content-addressable storage + version indexes (field kit / market B)
8. Signed packs / trust circle
9. Personal Tools shelf (Melt, SHASUM, etc.)
10. Remote admin UI mini app

---

## Smallest vertical slice (sprint 1 checklist)

1. `instance.json` + `content/main.en.json` + JSON Schema (contact card)
2. LCDN serves active variant content + assets + index.html at `/{slug}/`
3. example-info-card1 React CSR reads active variant content from LCDN path
4. Tool: Edit | Preview (iframe)
5. Admin: one button → open editor for default instance

This proves all three UI areas in miniature: **Admin** (launch + lifecycle), **Tool** (edit), **Mini app** (preview via LCDN iframe).