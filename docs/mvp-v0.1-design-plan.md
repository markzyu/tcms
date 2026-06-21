# PCMS — MVP v0.1 Design Plan

# STATUS: DRAFT (NEED FULL, HUMAN REVIEW. ALSO NEED REVIEW ON SCRUM BOARD)

High-level project map and phased delivery plan for the first vertical slice: **contact card** template proving the PCMS spine.

Complements [requirements.md](./requirements.md), [tech-overview.md](./tech-overview.md), and [motivation.md](./motivation.md).

---

## North star (v0.1)

> **Create a contact card on phone, edit in a Tool, preview through Local CDN, show on same device.**

Everything else in motivation (pack drops, today's board, field kit, reversed CDN) hangs off this spine once instance schema + LCDN + editor tool exist.

---

## Multi-project map

PCMS is **6 projects** that can ship independently but share contracts:


| #      | Project                      | Owns                                                                                 | Defers                                    |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------- |
| **P1** | **Runtime shell**            | Tauri app, routing, Admin ↔ Tool navigation, Tauri commands for lifecycle            | Multiple templates, pack drop             |
| **P2** | **Local CDN (LCDN)**         | Single entry point, static layer, instance routes, `proxy_pass` to mini-app backends | Reversed CDN, framework cache, CSP polish |
| **P3** | **Instance & config schema** | Mini-app instance model, on-disk layout, template manifest contract                  | CAS, signed packs, merge                  |
| **P4** | **Template: contact-card**   | CSR mini-app backend + Vue shell + content model                                     | SSR, iframes, arrays                      |
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

---

## Phase 0 — Contracts + standalone template

**Goal:** Freeze the internal configuration schema and ship the contact-card as a **standalone site** (CMS schema + Vue CSR) before LCDN integration.

### Deliverables

1. `**template.manifest.json`** (per template, bundled with app)
2. `**instance.json**` (per mini-app instance, user data)
3. `**content.json**` (CMS payload for contact card)
4. Directory layout under app sandbox (see below)
5. **Standalone contact-card site** — Vue CSR reading `content.json`; runnable without PCMS shell for dev/demo

### Directory layout

```
instances/
  {instanceId}/
    instance.json
    history.json          # content + asset history, for v0.9
    cas/
      2f/
        2f83b3f05c85b26369e9169930beb818d451b1b9.jpg
      6a/
        6a43da4a177ae0af2b335fe2358b6d5759bb3df9.json
templates/
  contact-card/
    manifest.json
    schema/content.schema.json
    schema/xxx.schema.json  # any other schema referenced by content
    app/                    # mini-app static bundle (Vue CSR)
```

### `instance.json` (v0)

This json is the source of truth for the current Ops configs of the mini app instance.

```json
{
  "id": "uuid",
  "name": "My contact card",
  "templateId": "contact-card",
  "templateVersion": "1.0.0",
  "createdAt": 1782051137000,
  "updatedAt": 1782051137000,
  "contentList": {
    "contents": {
      "main.en.json": "6a43da4a177ae0af2b335fe2358b6d5759bb3df9.json",
      "main.es.json": "....",
      "(page short name).(variant).json": "...."
    },
    "assets": [
      "2f83b3f05c85b26369e9169930beb818d451b1b9.jpg"
    ]
  },
  "lcdn": {
    "serverRenderer": "static",
    "mountPath": "/cards/my-contact-card",
    "slug": "my-contact-card",
    "currentVariant": "en"
  },
  "rcdn": {
    "enabled": false,
    "publishHtml": true,
    "serverRenderer": "static",
    "mountPath": "/cards/my-contact-card",
    "slug": "my-contact-card",
    "currentVariant": "es"
  }
}
```

contentList stores the CAS IDs of the contents and assets for localCDN to easily decide which files to serve, especially if the other files on disk are not used in the current version of the instance.

* `lcdn.serverRenderer` choices: `callCSR`, `callMiniSSR`, `static`

### Contact-card content model

This describes the schema of `content.json`.

In phase 0, we have a flat model without arrays.


| Field         | Type   | Notes                          |
| ------------- | ------ | ------------------------------ |
| `name`        | string | e.g. “John Doe”                |
| `headline`    | string | e.g. “Photographer”            |
| `bio`         | string | multiline                      |
| `email`       | string |                                |
| `phone`       | string |                                |
| `heroImage`   | string | asset CAS ID under `assets/`   |

For CAS IDs, it's a SHA256 hash of the asset content, followed by the file extension. Example: `2f83b3f05c85b26369e9169930beb818d451b1b9.jpg`.

### `content.json` (v0)

```json
{
  "name": "John Doe",
  "headline": "Photographer",
  "bio": "John is a photographer based in New York City. He is known for his street photography and his use of color. He has been photographing for 10 years. His favorite camera is the Leica M10.",
  "email": "john@example.com",
  "phone": "123-456-7890",
  "heroImage": "2f83b3f05c85b26369e9169930beb818d451b1b9.jpg"
}
```

### `content.schema.json` (v0)

This is an example of how schemas themselves work and is intentionally unaligned with the actual `content.json`.

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
      },
      {
        "name": "Project {index}",
        "paths": ["projects.{index}.name"],
      }
    ],
    "arrayGroups": [
      {
        "groupDisplayName": "\"{groupName}\" Project",
        "groupsPath": "projects",
        "groupName": "projects.{groupIndex}.name",
        "itemsPath": "projects.{groupIndex}.richTextList",
        "itemName": "projects.{groupIndex}.richTextList.{itemIndex}.text",
      },
      {
        "isSingleArray": true,
        "groupDisplayName": "Biography Rich Text",
        "itemsPath": "richTextList",
        "itemName": "richTextList.{itemIndex}.text",
      }
    ]
  },
  "jsonSchema": {
    "type": "object",
    "properties": {
      "name": {
        "title": "Name",
        "type": "string"
      },
      "projects": {
        "title": "Projects",
        "description": "(This is a demo of arrays) This is a list of projects that the person has worked on.",
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "richTextList": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "text": { "type": "string" },
                  "listIcon": { "type": "string" },
                  "isBold": { "type": "boolean" },
                  "isItalic": { "type": "boolean" },
                  "isUnderline": { "type": "boolean" },
                  "isStrikethrough": { "type": "boolean" },
                  "isCode": { "type": "boolean" },
                }
              }
            }
          }
        }
      },
      "headline": {
        "title": "Headline",
        "type": "string"
      },
      "bio": {
        "title": "Bio",
        "type": "string",
        "isMarkdown": true
      },
      "email": {
        "title": "Email",
        "type": "string"
      },
      "phone": {
        "title": "Phone",
        "type": "string"
      },
      "heroImage": {
        "title": "Hero Image",
        "description": "This is a wide image that will be displayed at the top of the contact card.",
        "type": "string"
      },
      "richTextList": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "text": { "type": "string" },
            "listIcon": { "type": "string" },
            "isBold": { "type": "boolean" },
            "isItalic": { "type": "boolean" },
            "isUnderline": { "type": "boolean" },
            "isStrikethrough": { "type": "boolean" },
            "isCode": { "type": "boolean" },
          }
        }
      }
    }
  }
}
```

Note: `richTextList` is an example of a rich text schema. In reality it would be reused through schema references, not by directly copying it everywhere.

```json
  "richTextList": {"$ref": "common.schema.json#/$defs/richTextList"}
```

### `template.manifest.json` (v0)

```json
{
  "id": "contact-card",
  "version": "1.0.0",
  "title": "Contact Card",
  "pages": {
    "main": {
      "path": "{instanceMountPath}",
      "schema": "schema/content.schema.json"
    },
    "(page short name)": {
      "path": "(the mount path of this specific page)",
      "schema": "schema/anything.schema.json"
    }
  },
  "defaultServerRenderer": "csr",
  "csrBackend": {
    "framework": "actix-builtins",
    "cspRules": {
      "default-src": "self {lcdnDomain} {rcdnDomain}",
      "script-src": "self {lcdnDomain} {rcdnDomain}",
      "style-src": "self {lcdnDomain} {rcdnDomain}",
      "img-src": "self {lcdnDomain} {rcdnDomain}",
      "font-src": "self {lcdnDomain} {rcdnDomain}",
      "connect-src": "self {lcdnDomain} {rcdnDomain}",
      "frame-src": "self {lcdnDomain} {rcdnDomain}",
      "media-src": "self {lcdnDomain} {rcdnDomain}"
    },
    "apiPaths": []
  }
}
```

This schema is the seed for pack drops later (`manifest.json` inside `.pcms.zip` matches this shape).

* cspRules: The variable replacement syntax follows `Intl.MessageFormat` syntax.
* apiPaths: API paths from the sidecar/builtin backends that are enabled for this template. There is no need to list HTML paths here.

---

## Phase 1 — Basic Local CDN

**Goal:** LCDN v0 — one instance, one route, static + proxy. No reversed CDN, no framework cache.

### LCDN v0 capabilities

- Read `**lcdn.config.json`** (or equivalent) listing registered instances
- Bind **localhost + optional LAN** (private networks per tech doc)
- For each instance at `/cards/{slug}/`:
  - Serve `content.json`, `assets/`* from instance dir
  - Serve cached/bundled HTML entry (CSR shell)
  - `proxy_pass` API/dynamic paths to mini-app backend port if needed
- Expose preview URL to Tauri: `http://127.0.0.1:{lcdnPort}/cards/me/`

### Mini-app backend v0 (contact-card)

- Sidecar / in-process server on **random localhost port**
- Serves template `app/` static files (Vue bundle)
- For CSR v0, dynamic work is minimal: optionally regenerate HTML cache on content change, or shell fetches `content.json` from LCDN path

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

Edit `content.json` on disk → refresh iframe → contact card updates via LCDN URL.

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
- “New contact card” → creates instance dir + default `content.json`
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

- `**ToolShell**` — header, back to Admin, optional save indicator
- `**ToolNav**` — two-tab bar; reusable by future tools
- `**EditView**` — schema-driven form from `content.schema.json`
- `**PreviewView**` — sandboxed iframe → `instance_get_preview_url()`

### Save path

1. Edit tab mutates in-memory model
2. Save → Tauri writes `content.json` + triggers LCDN cache refresh (when HTML snapshot enabled)
3. Preview tab reloads iframe (or listens for save event)

Future tools (Hosting options, CDN ops, backup) reuse `**ToolShell` + `ToolNav**`; Admin never embeds editor UI inline.

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

1. **Content authority:** `content.json` in instance dir is source of truth; LCDN serves it; mini-app reads via LCDN URL (not Tauri).
2. **Tool invocation contract:** Admin passes `instanceId` + `toolId`; tool loads schema from template bundle.
3. **Preview always via LCDN:** Preview tab never points iframe at mini-app port directly.
4. **CSR default:** Contact card needs no SSR for v0; SSR toggle in `instance.json` unused until template 2.
5. **Port strategy:** Random port per session OK for v0; persist in `instance.json` for board mode.

---

## Suggested repo structure (implementation)

```
pcms/
  docs/
  lcdn/                    # P2: custom server
  templates/contact-card/  # P4: manifest, schema, vue app, backend
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

1. `instance.json` + `content.json` + JSON Schema (contact card)
2. LCDN serves `/cards/{slug}/content.json` + assets + index.html
3. contact-card Vue CSR reads `content.json` from LCDN path
4. Tool: Edit | Preview (iframe)
5. Admin: one button → open editor for default instance

This proves all three UI areas in miniature: **Admin** (launch + lifecycle), **Tool** (edit), **Mini app** (preview via LCDN iframe).