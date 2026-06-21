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

| # | Project | Owns | Defers |
|---|---------|------|--------|
| **P1** | **Runtime shell** | Tauri app, routing, Admin ↔ Tool navigation, Tauri commands for lifecycle | Multiple templates, pack drop |
| **P2** | **Local CDN (LCDN)** | Single entry point, static layer, instance routes, `proxy_pass` to mini-app backends | Reversed CDN, framework cache, CSP polish |
| **P3** | **Instance & config schema** | Mini-app instance model, on-disk layout, template manifest contract | CAS, signed packs, merge |
| **P4** | **Template: contact-card** | CSR mini-app backend + Vue shell + content model | SSR, iframes, arrays |
| **P5** | **Tool: template editor** | Reusable Edit/Preview chrome, schema-driven form, preview iframe | AI assist, version history UI |
| **P6** | **Publish & ops** (later) | Pack drop zip, reversed CDN sync, hosting options, backup | v1 |

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

1. **`template.manifest.json`** (per template, bundled with app)
2. **`instance.json`** (per mini-app instance, user data)
3. **`content.json`** (CMS payload for contact card)
4. Directory layout under app sandbox (see below)
5. **Standalone contact-card site** — Vue CSR reading `content.json`; runnable without PCMS shell for dev/demo

### Directory layout

```
instances/
  {instanceId}/
    instance.json
    content.json
    assets/
      hero.jpg
templates/
  contact-card/
    manifest.json
    schema/content.schema.json
    app/                    # mini-app static bundle (Vue CSR)
```

### `instance.json` (v0)

```json
{
  "id": "uuid",
  "templateId": "contact-card",
  "templateVersion": "1.0.0",
  "slug": "me",
  "mode": "csr",
  "createdAt": "…",
  "updatedAt": "…",
  "lcdn": {
    "mountPath": "/cards/me"
  }
}
```

### Contact-card content model (flat, no arrays)

| Field | Type | Notes |
|-------|------|--------|
| `displayName` | string | |
| `headline` | string | e.g. “Photographer” |
| `bio` | string | multiline |
| `email` | string | |
| `phone` | string | |
| `heroImage` | string | asset filename under `assets/` |

### `template.manifest.json` (v0)

```json
{
  "id": "contact-card",
  "version": "1.0.0",
  "title": "Contact Card",
  "defaultMode": "csr",
  "contentSchema": "schema/content.schema.json",
  "backend": "contact-card-server",
  "lcdn": {
    "contentPaths": ["content.json", "assets/**"],
    "cacheHtml": true
  },
  "externalHosts": []
}
```

This schema is the seed for pack drops later (`manifest.json` inside `.pcms.zip` matches this shape).

---

## Phase 1 — Basic Local CDN

**Goal:** LCDN v0 — one instance, one route, static + proxy. No reversed CDN, no framework cache.

### LCDN v0 capabilities

- Read **`lcdn.config.json`** (or equivalent) listing registered instances
- Bind **localhost + optional LAN** (private networks per tech doc)
- For each instance at `/cards/{slug}/`:
  - Serve `content.json`, `assets/*` from instance dir
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

- **`ToolShell`** — header, back to Admin, optional save indicator
- **`ToolNav`** — two-tab bar; reusable by future tools
- **`EditView`** — schema-driven form from `content.schema.json`
- **`PreviewView`** — sandboxed iframe → `instance_get_preview_url()`

### Save path

1. Edit tab mutates in-memory model
2. Save → Tauri writes `content.json` + triggers LCDN cache refresh (when HTML snapshot enabled)
3. Preview tab reloads iframe (or listens for save event)

Future tools (Hosting options, CDN ops, backup) reuse **`ToolShell` + `ToolNav`**; Admin never embeds editor UI inline.

---

## Phase 3 — Polishing + migration to real templates

**Goal:** Make v0.1 demo-ready for one market story; harden template packaging for additional templates later.

Pick **one** primary story first (recommended: **Today's board + pack drop export** before reversed CDN):

| Story | What to add |
|-------|-------------|
| **Today's board (C)** | LCDN on LAN IP; full-screen preview route; “open in browser” |
| **Pack drop (A/B)** | Export `instances/{id}/` → `.pcms.zip` per motivation doc |
| **Public link (A/C)** | Reversed CDN upload of assets + optional HTML toggle |

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

5. Second template (restaurant menu — arrays + iframe manifest)
6. JSON editor tool (generic, power users)
7. CDN ops tool
8. Reversed CDN providers (separate integrations)
9. SSR mode toggle per instance
10. Developer mode / external backend whitelist
11. Content-addressable storage + version indexes (field kit / market B)
12. Signed packs / trust circle
13. Personal Tools shelf (Melt, SHASUM, etc.)
14. Remote admin UI mini app

---

## Smallest vertical slice (sprint 1 checklist)

1. `instance.json` + `content.json` + JSON Schema (contact card)
2. LCDN serves `/cards/{slug}/content.json` + assets + index.html
3. contact-card Vue CSR reads `content.json` from LCDN path
4. Tool: Edit | Preview (iframe)
5. Admin: one button → open editor for default instance

This proves all three UI areas in miniature: **Admin** (launch + lifecycle), **Tool** (edit), **Mini app** (preview via LCDN iframe).
