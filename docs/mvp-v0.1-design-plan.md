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
5. **Standalone example-info-card1 site** — React CSR reading the active variant content file; runnable without Thor CMS shell for dev/demo

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

---

# STATUS: DRAFT (Phase 2 and beyond, NEED FULL, HUMAN REVIEW. ALSO NEED REVIEW ON SCRUM BOARD)

---

## Phase 2 — Admin shell + Template Editor tool

**Goal:** **Edit | Preview** as a **Tool**, invoked from Admin — not hardwired as the app root.

### Routing model

```
/                          AdminHome (instance list)
/instances/new             Admin: create contact card
/tools/template-editor     Tool host (query: ?instanceId=…)
```

### Admin shell v0

- List instances (even if one seeded initially)
- “New contact card” → creates instance dir + default `content/main.en.json` (and `instance.json` with `currentVariant: "en"`)
- Row action **“Edit”** → `navigateTo('/tools/template-editor?instanceId=…')`
- Shows LCDN status (running / stopped)

**Also, very importantly:**

!! At this point, the Admin shell would need to support Internationalization (i18n). We should consider either Vue I18n or our own template schema.

### Reusable tool chrome

```
<ToolShell title="Contact Card" onBack="admin">
  <ToolNav v-model="tab" :tabs="['edit', 'preview']" />
  <EditView   v-if="tab === 'edit'"    … />
  <PreviewView v-if="tab === 'preview'" … />
</ToolShell>
```

- `**ToolShell**` — header, back to Admin, optional save indicator
- `**ToolNav**` — two-tab bar; reusable by future tools
- `**EditView**` — schema-driven form from `content.schema.json` for the active variant
- `**PreviewView**` — sandboxed iframe → `lcdn_get_preview_url()`

### Save path

1. Edit tab mutates in-memory model for the active variant (`instance.currentVariant`)
2. Save → Tauri writes `content/main.{variant}.json` + triggers LCDN cache refresh (when HTML snapshot enabled)
3. Preview tab reloads iframe (or listens for save event)

Future tools (Hosting options, CDN ops, backup) reuse `**ToolShell` + `ToolNav**`; Admin never embeds editor UI inline.

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