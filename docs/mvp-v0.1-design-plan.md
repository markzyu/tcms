# TCMS — MVP v0.1 Design Plan

# STATUS: PARTIAL DRAFT (Phases 0-2 are reviewed)

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
| **P2** | **Local CDN (LCDN)**         | Single entry point, serves static files, routes instances                 | Reversed CDN, framework cache, CSP polish, non-static backends             |
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
• start/stop LCDN         • editor UI schemas          • served via LCDN
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
- `lcdn_reload_configs()` → reads existing list of instances again. renames instance slug if needed (only if the ids stay the same)
- `lcdn_get_preview_url(instanceId)` → for Preview tab

### Out of scope for LCDN v0

- Multi-instance routing polish
- JS framework CDN cache
- CSP enforcement (stub only)
- Reversed CDN upload
- Screensaver (stub “serving” state in UI only)
- Non-static custom backend modes (Simulation of nginx `proxy_pass` to other backend types)

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

* Implement the Admin shell with ability to edit and preview instances.
* Formalize the architecture of Tools as mere Vue components.

We do not import any premade websites as tools for now. But this design should make it possible to eventually include premade rust-native servers and any website hosted on it, into the ThorCMS app. And shipping additional binaries on the phone is out of the question for MVP v0.1

### Formalizing the Architecture of "Tools"

I've arrived at this conclusion that v1 Tools are meant to be just a simple reusable Vue component. They are:

* Not a page in the Vue Router.
* Not a complex workflow, separated into backend and frontend parts with their own contracts. That's too complex to manage.
* Not meant to be so flexible that we can dynamically import a new tool on the phone.

We can always import complicated, better Tools in the future, especially when we want to fully support custom backends and premade websites.

Tools are still meant to be modularized, however.
* They should be organized into their parent folder in Vue `src/tools/` folder.
* Their component Props interface should not change too often over time.
* They should be reusable in different ways (A JSON editor can be used to edit content, but also to edit LCDN settings, given a json path and schema)
* Ideally, there should be a storybook setup that showcases the two json editor tools.

This simplifies things so that, the admin shell only really needs to implement the following:

* Implementing basic frontend components as tools
* Creating the basic storybook setup for tools
* Implementing the Preview and Edit tools with a reusable prop interface
* Connecting tools to the admin shell

Beyond the MVP scope: we could one day support adding an "External Edit" tool which copies out small files for external apps to process. But this is not a core feature of the ThorCMS app. And it's more of an additional action button that can be shown in a dropdown menu. It's also not meant for large files. Those should be preprocessed before importing into ThorCMS.

### Assumptions and Requirements for the Edit tools

- Assumption: Content schema would never define object fields dynamically. For those use cases, they would always define the dynamic content as an array of objects.
- Caveat: Each dynamic array in Content schema should define a key field. Otherwise, we default to the index, and it's not ideal.

Requirements:

- `json-objects-editor` frontend tool, for editing either objects, objects of objects, and top level, flat arrays of objects
  - For objects that do not nest arrays, we can essentially display each leaf object in a new section, titled by its full parent path.
  - For objects that contain a flat array, we can display each object in a new section, titled by the array path + the item's key field.
- `json-arrays-editor` frontend tool, for navigating nested arrays of objects, while relying on `json-objects-editor` to edit the objects
  - This scenario covers anything that's not an object of object, not a flat object, and not a flat array of objects.
  - This UI shows two levels of lists. The inner level shows the item names of the leaf array. The outer level shows the path from root to the leaf array.
- Both `json-objects-editor` and `json-arrays-editor` can be called with new root objects or arrays.
- Both of these Tools would not use Tauri commands directly. They transform a json data that is given to them. This is a v0.1 limitation. In later versions we can discuss what "backend tools" look like. But v0.1 explores a frontend-only tool approach for now.

Note: These two editors together are known as the "Template Editor". In MVP v0.1 and v1, we don't have a way to group and organize tools into parts. But essentially the idea of a template editor is to use these two different UIs to facilitate user when accessing different json shapes

Note: The contact card template we created at the end of phase 0, can only really demo `json-objects-editor`. We could either create a second template to demo `json-arrays-editor`, or just build a custom storybook only for now.

### Admin shell Requirements

And the Admin shell needs to implement the following natively, as admin features and not as tools:

- Call the correct json editor for each content/template json.
  - Full original json along with the schema that defines the json shape, and the editor UI schema that defines editor features.
  - Path to the array / object that the editor is showing at its root level
- Track the history of previous edit paths so user can go back to the previous editor.
- Store the edited json data back to disk.
- Call `lcdn_reload_configs()`, refresh iframes to apply the latest jsons.
- List instances (even if one seeded initially)
- "New instance" button → creates instance dir + default `content/main.en.json` (and `instance.json` with `currentVariant: "en"`)
- Add an Edit button to each instance card
- Show Preview tool upon clicking instance preview image
- Show LCDN status (running / stopped)
- The buttons/UI entry points for creating and deleting instances
- Implement the hosting/sharing button to restart lcdn on private IP (LAN)
- Implement the screensaver mode to display a basic black screen with a moving clock and message.

After all of these are ready, Admin shell should also remove the debug UI we created in Phase 1.

Note: For compliance and security reasons, MVP v0.1 will not support fully public hosting options. We will only support private IP (LAN) hosting. It's not that far away from fully public hosting. The user can fill this gap for now if they know to use Reverse Proxies or port forwarding.

### Another important requirement: Internationalization (i18n)

At this point, both the Admin shell, the Tools, and the mini apps, would need to support Internationalization (i18n). But as mentioned in requirements, we don't need to serve multiple languages at once. We just need to provide a way to define multiple variants of the same content.

There are two separate language settings in question:

* App Language: This includes translations provided by TCMS's core developers.
  * All of Admin Shell and Tool UIs
  * Field names of every json schema in every template. Only visible in editors, not in final website.
  * Reusable "template default" contents that users don't usually edit. This is visible in the final website.
* Mini App Language: This includes translations created at runtime, by the users of TCMS app.
  * User contents that are used to create the final website.
  * Overrides of the reusable "template default" contents.

Note: For each locale, we only consider the `language-script` part of the Intl.Locale object. This `language-script` string becomes the content json's variant / extension name.

Note: We do not currently support untranslatable content fields. But in the future, they should be stored separately as variant: `__` (instead of `language-script`)

Tauri provides a `locale()` API in their os crate, which returns a BCP 47 language tag. We can use this to determine the App Language. However, we cannot assume that the user will create content in the same Mini App Language as the App Language.

* If tauri detection fails during launch, user must be prompted with a list of known App Languages to choose from.
* Alternatively, they can go to the settings menu and manually choose both the App Language and the Mini App Language.
* However, if a Mini App Language is not set, we should set the default variant to `_1` meaning "Unknown Language (#1)".
* However, during the creation of new mini app instances, the user will always have a chance to update the current Mini App language, AND, upon editing content jsons, we should do a very basic language check using `whatlang`. If it doesn't match the Mini App Language, we should prompt the user to update the language.

There are also 3 different ways to perform the i18n text interpolation:

* In the Admin Shell, we would use standard `vue-i18n` with ICU MessageFormat. This also applie to the static strings of Tools UIs.
* In the Tools UI, for field names and schemas, we would extend the existing `editorUiSchema` to support i18n, as described below.
* In the Mini App and templates, we store ICU MessageFormat strings directly in the content json, as identified by file name `<pageShortName>.<variant>.json`.

Here is a new field added to the `editorUiSchema` to support i18n:

```
editorUiSchema: {
  fieldTitles: {
    en: {
      "xxx.firstName": "First name",
      "xxx.lastName": "Last name"
    }
    jp: {
      "xxx.firstName": "名",
      "xxx.lastName": "姓"
    }
  }
}
```

This "fieldTitles" field can both appear at the root of editor ui schema, and within each field group / array group. They don't technically have to be actually related to that field group to exist. But we merge all `fieldTitles` into a single object from the deepest level to the root level, or, if at the same level, first come first served.

**Caveat**: No matter how I design this i18n meta schema, it introduces the likelihood of forgotten declarations of a specific field for a specific language. As a result, I opted for the cleaner meta schema design. And we would also need to update the schema build scripts to throw an error if a known field is not declared for a known language in the same schema json.

Also, in the future, we could support page variants with more fields, for example: `.<variant>.json - .<language-script>.<publish-edition>.json`. But the language-script field is always required and listed first.

---

---

# STATUS: DRAFT (Phase 3 and beyond, NEED FULL, HUMAN REVIEW.)

---

## Phase 3 — Polishing + migration to real templates

**Goal:** Make v0.1 demo-ready for one market story; harden template packaging for additional templates later.

**Goal:** Make sure the v0.1 UI is mobile friendly at all sizes (Phones and Tablets).

> Note about tablet sized design: We don't have Figma for this but here is what I think
>
> * The home page in admin shell: Instead of showing the instance cards in a grid, we would show a vertical list with more info: show the simple phone-sized cards on the left, and a info card on the right, corresponding horizontally to each instance. (This can be later replaced with a nice timeseries monitoring chart)
> 
> * The json objects edit tool: On tablet landscape mode, we have enough space to show 3 columns of fields. Instead of randomly assinging a field group to each column, We dedicate each column to the type of field group (without having to show column titles): `fieldGroup (singleton)` (basic fields), `fieldGroup (non singleton)` (these are just one-liner buttons to open array items), `arrayGroup` (this isn't in MVP 0.1 but they are just fields in shallow arrays).
> 
> * The array editor tool: Instead of a thin left side panel showing multiple levels of array paths, we can have 2-3 levels of array navigation on the left side.
> 
> * For other admin shell pages we can use basic tablet designs: Use Grid instead of Flex for template cards; Use auto margin / max-width to show a basic settings list.

----

Pick **one** primary story first (recommended: **Today's board + pack drop export** before reversed CDN):


| Story                 | What to add                                                  |
| --------------------- | ------------------------------------------------------------ |
| **Today's board (C)** | LCDN on LAN IP; full-screen preview route; “open in browser” |
| **Pack drop (A/B)**   | Export `instances/{id}/` → `.tcms.zip` per motivation doc    |
| **Public link (A/C)** | Reversed CDN upload of assets + optional HTML toggle         |


Also: asset picker for hero image, HTML cache on save, persist backend port in `instance.json` for stable LAN URLs.

---

## Design decisions (pending reviews)

1. **Content authority:** `content/main.{variant}.json` in instance dir is source of truth; LCDN serves it; mini-app reads via LCDN URL (not Tauri).
2. **Tool invocation contract:** MVP v0.1 and v1 would see Tools as simple Vue components. So admin shell can call tools directly for now. Further architectural changes would depend on how custom backends work at all, on iOS and android.
3. **Preview always via LCDN:** Preview tab never points iframe at custom backend port directly. (This is a given for MVP v0.1, because we don't ship any other backends)
4. **CSR default:** Contact card needs no SSR for v0; SSR toggle deferred until template 2 (see [futures-looking.md](./futures-looking.md)).
5. **Port strategy:** Serving on a hardcoded static port for now. It is configurable in lcdn config but it's not changeable at runtime.
---

## Repo structure

```
tcms/
  docs/
  app/
    crates/        # Local CDN + any template backend
      common/      # Common types such as the schema for Instance, LCDN config, etc.
      lcdn-server/
      tools/       # This is a placeholder. json editors don't need it.
    src-tauri/     # Tauri commands to bind with lcdn/tools crates
    src/           # Tauri + Vue Admin + Tools
      admin/
      tools/
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

1. Public hosting options and reversed CDN implementation
2. Asset picker for hero image (Tauri → `assets/`)
3. HTML cache on save (CSR snapshot in `cache/`)
4. Pack export v0 (zip shape from motivation doc)

### Later

1. Second template (restaurant menu — arrays + iframe manifest)
2. Customizable tooling with "workflow"-like schemas (generic, power users)
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