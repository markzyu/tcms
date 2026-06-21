# PCMS — MVP v0.1 Design Plan

# STATUS: PARTIAL DRAFT (Phase 0 is reviewed)

High-level project map and phased delivery plan for the first vertical slice: **contact card** template proving the PCMS spine.

Complements [requirements.md](./requirements.md), [tech-overview.md](./tech-overview.md), [motivation.md](./motivation.md), and [futures-looking.md](./futures-looking.md) (draft contracts not in Phase 0 scope).

## North star (v0.1)

> **Create a contact card on phone, edit in a Tool, preview through Local CDN, show on same device.**

> **Mini-app templates use **React** (CSR) in v0.1. The Admin shell and Tools use **Vue** (Tauri). Vue as a mini-app framework is deferred.**

Everything else in motivation (pack drops, today's board, field kit, reversed CDN) hangs off this spine once instance schema + LCDN + editor tool exist.

## Multi-project map

PCMS is **6 projects** that can ship independently but share contracts:


| #      | Project                      | Owns                                                                                 | Defers                                    |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------- |
| **P1** | **Runtime shell**            | Tauri app, routing, Admin ↔ Tool navigation, Tauri commands for lifecycle            | Multiple templates, pack drop             |
| **P2** | **Local CDN (LCDN)**         | Single entry point, static layer, instance routes, `proxy_pass` to mini-app backends | Reversed CDN, framework cache, CSP polish |
| **P3** | **Instance & config schema** | Mini-app instance model, on-disk layout, template manifest contract                  | CAS, signed packs, merge                  |
| **P4** | **Template: contact-card**   | React CSR mini-app + content model                                                   | SSR, iframes, arrays, Vue mini-apps       |
| **P5** | **Tool: template editor**    | Reusable Edit/Preview chrome, schema-driven form, preview iframe                     | AI assist, version history UI             |
| **P6** | **Publish & ops** (later)    | Pack drop zip, reversed CDN sync, hosting options, backup                            | v1                                        |


### UI areas mapped

```
Admin shell (P1)          Tools (P5)                 Mini apps (P4)
─────────────────         ─────────────────            ─────────────────
• instance list      →    • TemplateEditor tool   →   • localhost HTTP
• "New contact card"      • Edit tab (schema form)     • serves template
• "Edit" / "Preview"      • Preview tab (iframe)       • bound 127.0.0.1
• start/stop LCDN         • reusable ToolNav           • rendered via LCDN
```

Mini apps are **never** opened as Tauri routes. Preview tab loads **LCDN URL in sandboxed iframe**.

## Phase 0 — Contracts + standalone template

**Goal:** Freeze the **minimal** internal configuration schema and ship the contact-card as a **standalone site** (CMS schema + React CSR) before LCDN integration.

Forward-looking shapes (CAS, multi-page manifest, rich editor UI, LCDN/rcdn ops blocks) are in [futures-looking.md](./futures-looking.md) — not Phase 0 scope.

### Deliverables

1. **`template.manifest.json`** (per template, bundled with app)
2. **`instance.json`** (per mini-app instance, user data)
3. **Variant content files** — `content/{pageShortName}.{variant}.json` (contact card: `main.en.json`, etc.)
4. Directory layout under app sandbox (see below)
5. **Standalone contact-card site** — React CSR reading the active variant content file; runnable without PCMS shell for dev/demo

### Directory layout

```
instances/
  {instanceSlug}/
    instance.json
    content/
      main.en.json
      main.es.json
    assets/
      hero.jpg
templates/
  contact-card/
    manifest.json
    schema/content.schema.json
    app/                    # mini-app static bundle (React CSR)
```

### Content file naming

Content files use **`{pageShortName}.{variant}.json`**.

* **Page short name** — key from `template.manifest.json` → `pages` (contact card: `main`).
* **Variant** — locale or edition tag (e.g. `en`, `es`). One variant is **active** at a time via `instance.json` → `currentVariant`.
* Phase 0 contact card is **single-page, flat fields, no arrays**. Multiple variants are supported; only the active variant is served in preview/publish until the user switches.

### `instance.json` (v0)

Source of truth for instance metadata and which content variant is active.

```json
{
  "slug": "my-contact-card",
  "name": "My contact card",
  "templateId": "contact-card",
  "templateVersion": "1.0.0",
  "createdAt": 1782051137000,
  "updatedAt": 1782051137000,
  "currentVariant": "en",
  "variants": ["en", "es"],
}
```

* **`slug`** — the URL slug for this instance. This will later by replaced by the "Page Short Name" in [futures-looking.md](./futures-looking.md).
* **`currentVariant`** — which `{pageShortName}.{variant}.json` files are live for preview/publish.
* **`variants`** — declared locale/edition tags for this instance. Phase 0 may ship with one variant seeded; the field exists so multi-lingual config does not require a schema migration later.

### Contact-card content model

Flat model for `content/main.{variant}.json` — no arrays in Phase 0.

| Field       | Type   | Notes                              |
| ----------- | ------ | ---------------------------------- |
| `name`      | string | e.g. “John Doe”                    |
| `headline`  | string | e.g. “Photographer”                |
| `bio`       | string | multiline                          |
| `email`     | string |                                    |
| `phone`     | string |                                    |
| `heroImage` | string | filename under `assets/` (e.g. `hero.jpg`) |

### `content/main.en.json` (v0 example)

```json
{
  "name": "John Doe",
  "headline": "Photographer",
  "bio": "John is a photographer based in New York City. He is known for his street photography and his use of color. He has been photographing for 10 years. His favorite camera is the Leica M10.",
  "email": "john@example.com",
  "phone": "123-456-7890",
  "heroImage": "hero.jpg"
}
```

### `content.schema.json` (v0)

Aligned with contact-card Phase 0 — flat fields only, minimal editor UI groups.

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
      }
    },
    "required": ["name"]
  }
}
```

### `template.manifest.json` (v0)

Contact-card only — single page, CSR default. LCDN mount paths and backend config come in Phase 1; see [futures-looking.md](./futures-looking.md) for the expanded manifest shape.

```json
{
  "id": "contact-card",
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

---

---

# STATUS: DRAFT (Phase 1 and beyond, NEED FULL, HUMAN REVIEW. ALSO NEED REVIEW ON SCRUM BOARD)

---

## Phase 1 — Basic Local CDN

**Goal:** LCDN v0 — one instance, one route, static + proxy. No reversed CDN, no framework cache.

### LCDN v0 capabilities

- Read **`lcdn.config.json`** (or equivalent) listing registered instances
- Bind **localhost + optional LAN** (private networks per tech doc)
- For each instance at `/cards/{slug}/`:
  - Serve active variant content (`content/main.{currentVariant}.json`), other variant files on request, and `assets/*` from instance dir
  - Serve cached/bundled HTML entry (CSR shell)
  - `proxy_pass` API/dynamic paths to mini-app backend port if needed
- Expose preview URL to Tauri: `http://127.0.0.1:{lcdnPort}/cards/{slug}/`

### Mini-app backend v0 (contact-card)

- Sidecar / in-process server on **random localhost port**
- Serves template `app/` static files (React bundle)
- For CSR v0, dynamic work is minimal: optionally regenerate HTML cache on content change, or shell fetches active variant content from LCDN path

### Tauri commands (minimal)

- `lcdn_start()` / `lcdn_stop()` / `lcdn_status()`
- `instance_register(instanceId)` → updates LCDN config + starts backend
- `instance_get_preview_url(instanceId)` → for Preview tab

### Out of scope for LCDN v0

- Multi-instance routing polish
- JS framework CDN cache
- CSP enforcement (stub only)
- Reversed CDN upload
- Screensaver (stub “serving” state in UI only)

### Success criteria

Edit `content/main.{variant}.json` on disk → refresh iframe → contact card updates via LCDN URL.

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

### Reusable tool chrome

```
<ToolShell title="Contact Card" onBack="admin">
  <ToolNav v-model="tab" :tabs="['edit', 'preview']" />
  <EditView   v-if="tab === 'edit'"    … />
  <PreviewView v-if="tab === 'preview'" … />
</ToolShell>
```

- **`ToolShell`** — header, back to Admin, optional save indicator
- **`ToolNav`** — two-tab bar; reusable by future tools
- **`EditView`** — schema-driven form from `content.schema.json` for the active variant
- **`PreviewView`** — sandboxed iframe → `instance_get_preview_url()`

### Save path

1. Edit tab mutates in-memory model for the active variant (`instance.currentVariant`)
2. Save → Tauri writes `content/main.{variant}.json` + triggers LCDN cache refresh (when HTML snapshot enabled)
3. Preview tab reloads iframe (or listens for save event)

Future tools (Hosting options, CDN ops, backup) reuse **`ToolShell` + `ToolNav`**; Admin never embeds editor UI inline.

---

## Phase 3 — Polishing + migration to real templates

**Goal:** Make v0.1 demo-ready for one market story; harden template packaging for additional templates later.

Pick **one** primary story first (recommended: **Today's board + pack drop export** before reversed CDN):


| Story                 | What to add                                                  |
| --------------------- | ------------------------------------------------------------ |
| **Today's board (C)** | LCDN on LAN IP; full-screen preview route; “open in browser” |
| **Pack drop (A/B)**   | Export `instances/{id}/` → `.pcms.zip` per motivation doc    |
| **Public link (A/C)** | Reversed CDN upload of assets + optional HTML toggle         |


Also: asset picker for hero image, HTML cache on save, persist backend port in `instance.json` for stable LAN URLs.

---

## Design decisions (lock early)

1. **Content authority:** `content/main.{variant}.json` in instance dir is source of truth; LCDN serves it; mini-app reads via LCDN URL (not Tauri).
2. **Tool invocation contract:** Admin passes `instanceId` + `toolId`; tool loads schema from template bundle.
3. **Preview always via LCDN:** Preview tab never points iframe at mini-app port directly.
4. **CSR default:** Contact card needs no SSR for v0; SSR toggle deferred until template 2 (see [futures-looking.md](./futures-looking.md)).
5. **Port strategy:** Random port per session OK for v0; persist backend port in `instance.json` for board mode (Phase 3).

---

## Suggested repo structure (implementation)

```
pcms/
  docs/
  lcdn/                    # P2: custom server
  templates/contact-card/  # P4: manifest, schema, React app, backend
  src/                     # P1/P5: Tauri + Vue Admin + Tools
    admin/
    tools/
      _shared/ToolShell.vue, ToolNav.vue
      template-editor/
    router/
  schemas/                 # P3: shared JSON Schema defs (optional)
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
2. LCDN serves active variant content + assets + index.html at `/cards/{slug}/`
3. contact-card React CSR reads active variant content from LCDN path
4. Tool: Edit | Preview (iframe)
5. Admin: one button → open editor for default instance

This proves all three UI areas in miniature: **Admin** (launch + lifecycle), **Tool** (edit), **Mini app** (preview via LCDN iframe).