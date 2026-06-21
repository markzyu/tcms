# PCMS — Motivation & markets

Why this project exists, who it is for, and how the use cases fit together. Complements [requirements.md](./requirements.md) and [tech-overview.md](./tech-overview.md).

## Why PCMS exists

PCMS started as “**why can’t we package great desktop web tools and backend binaries for phones?**” CMS, Local CDN, and templates were **glue** so Tools and mini apps weren’t a junk drawer.

After market and honesty checks, the center of gravity is:

> ✅ **Local-first reality** — author on phone, preview on device or LAN, **ship** via pack drop, wall board, or synced static bucket when online.

> 💬 **Phone-origin webserver** — foreground, port-forward, dynamic SSR — remains **supported** for power users and last-resort publish, but **not** the story we lead with for helping everyday users.

Same engine, many verticals (board, pack drop, field kit, maker play). v1 can prove the **spine** with a small set of templates — not every row in the table at once.

## How the pieces work (plain language)

| Concept | What it is |
|--------|------------|
| **Local CDN** | On-phone preview layer: single entry point, proxies to mini-app backends on localhost. For **authoring and in-venue LAN preview**, not public internet traffic. |
| **Content pack drop** | Export a site bundle (HTML, assets, config, optional SSR snapshot) and **transfer offline** (share sheet, Xender-style, backup/restore). Recipient imports into PCMS or opens via browser if served locally. **No mobile data** to duplicate what a colleague already has. |
| **Today’s board** | Owner updates content on phone → **display device** (old phone, tablet, TV stick) on same Wi‑Fi shows the loop. Viewers **look at the screen**; they don’t install PCMS. |
| **Public link / reversed CDN** | When online, sync **static assets** (and optional SSR snapshot) to **user’s bucket** (S3, R2, GitHub, etc.). QR or WhatsApp bio points to `https://…`. Phone is **not** the origin for static traffic. |
| **LAN QR preview** | Fallback when nobody has data: join shop Wi‑Fi/hotspot, open local URL in **browser**. For demos and dead zones — not the main customer path. |
| **Phone-origin server** | Port-forwarding + foreground app (screensaver on iOS) so **live/dynamic** traffic hits the phone. **Last resort** for power users — not the default pitch for A or C. |

**Viewers:** Owners have PCMS. Almost everyone else uses a **browser** or looks at a **display**. Requiring PCMS on the customer’s phone is only for **pack handoffs between editors**, not for reading a menu.

## Content pack drops (technical language)

A **pack drop** is how PCMS moves a **whole mini-app instance** — content, assets, config, and cached static pages — from one place to another **without using mobile data**. Think Xender for APKs, but for a **site bundle** your app already understands.

### What gets dropped?

Yes: **a zip archive**, plus structured metadata PCMS can read. A pack is **not** a random folder dump; it is the same **static layer Local CDN would serve**, bundled for transport.

Typical contents:

| Inside the pack | Purpose |
|-----------------|--------|
| **`manifest.json`** | Template id, version, languages, declared external hosts, import hints |
| **`config/`** | User JSON / tokens paths (secrets may be stripped or encrypted on export) |
| **`content/`** | Authored text, menu items, event dates, field-brief copy |
| **`assets/`** | Images, video, PDFs, fonts |
| **`cache/`** | Optional SSR HTML snapshot, cached JS framework files |
| **`meta.json`** | Export time, source device, optional signature (future trust circle) |

What is **not** in a pack: the PCMS app itself, trusted backend **binaries** (those ship with the app store install), or a substitute for installing a template the recipient’s app doesn’t already support.

### How does a drop happen?

1. **Author** finishes edits in Admin / Tools; Local CDN preview looks correct.
2. **Export pack** from Backup & restore or the mini-app’s “Share pack” action → PCMS writes **`Something.pcms.zip`** (name TBD) to storage.
3. **Transfer offline** — any channel that moves a file without internet:
   - Xender / SHAREit / LocalSend / Files by Google Nearby
   - Bluetooth, USB, SD card, “Save to Files” then AirDrop-style handoff
   - Optional: upload zip to a bucket **as dumb file transport** when someone finally has data (same file, online courier)
4. **Recipient** gets the zip on their phone (or PC).

No PCMS server in the cloud is required for steps 1–4. The zip **is** the shipment.

### What does the recipient do with it?

Depends on **who** they are:

#### Path 1 — Another PCMS user (most common for pack drops)

They **import** the zip inside PCMS (Backup & restore → Receive pack, or mini-app import).

PCMS then:

- Validates manifest + template compatibility (“do I have this template installed?”)
- **Installs** a new mini-app instance, or **replaces** one instance (partial restore — no merge of two divergent edits)
- Rehydrates Local CDN from the pack’s static tree
- Opens **preview** immediately — same as if they had authored it locally

From there they can:

- **Show** content on a tablet/browser via Local CDN (field worker, shop board)
- **Edit** and re-export their own pack downstream
- **Sync** static layer to reversed CDN when online (optional public link)

This is the core **A** and **B** loop: HQ phone → pack drop → field phone; colleague A → pack drop → colleague B; no one re-downloads assets over cellular.

#### Path 2 — Wall display / in-venue screen (market C)

Usually **one phone owns PCMS** (imports or authors the pack). A **second device** (old phone, tablet, TV stick) on the same Wi‑Fi opens the site in a **browser** pointed at Local CDN on the owner’s phone — **today’s board** mode. The pack drop often lands on the **owner** device first; the display just renders what Local CDN serves.

Viewers do **not** need the zip and do **not** need PCMS.

#### Path 3 — Public visitors (link, not pack)

End customers do **not** receive zips. Owner imports or authors, then **reversed CDN** (or static export to GitHub Pages) produces a normal **`https://`** link for WhatsApp bio. Pack drop is for **operators**, not diners.

#### Path 4 — Static-only, no PCMS on recipient (edge case)

If the template is **fully static** (no live SSR, no mini-app backend needed), an advanced user could unzip and host `index.html` elsewhere — same as tech-overview “export static HTMLs” mode. That is **export for hosting**, not the main pack-drop UX. PCMS optimizes for Path 1.

### Pack drop vs other publish paths

| Mechanism | What moves | Typical recipient |
|-----------|------------|-------------------|
| **Pack drop** | `.pcms.zip` offline | Another PCMS install |
| **Today’s board** | Nothing — owner serves on LAN | Eyes / browser on display |
| **Reversed CDN** | Static files uploaded to **your** bucket | Anyone with link |
| **Static export** | Plain HTML zip for Netlify/GitHub | Web host |
| **Phone-origin server** | Live traffic to phone | Power users only; last resort |

Potential future follow-up: signed packs:  For market **B**, we can sign the packs: **trust circle** signing attaches to `meta.json` so import can show “signed by Amara (org key)” before unpack. Not required for v1.

## Potential Markets to consider

### Market A — Data-conscious creators

**Who:** Phone-first users where mobile data is expensive, slow, or metered carefully (common in Nigeria, East/West Africa, and similar markets).

**Struggles:**
- Re-downloading large apps or site assets wastes money and time.
- “Just use the cloud” assumes affordable, reliable connectivity.
- Offline sharing culture (Xender-style) moves **files**, not structured **sites**.
- Viewers should use a normal browser — not install another app.

**What PCMS offers:** Author on phone; preview locally; **ship static layers** via pack drop or cheap remote bucket when online — not by pushing every asset through the handset on every visit.

### Market B — Connectivity-stressed & field work

**Who:** NGO field workers, community health visitors, documenters in shutdown-prone areas, orgs that need **approved offline content** (Cameroon, Zimbabwe, Sudan-style realities — not only activists).

**Struggles:**
- Weeks offline; PDFs scattered in WhatsApp; version chaos (“which leaflet is current?”).
- HQ updates don’t reach the field without burning data.
- Trust matters: “did this pack really come from our org?” (future: signed packs / trust circles).
- Mesh chat (Briar) solves **messages**, not **presentable program content**.

**What PCMS offers:** **Field kit** — briefings and program pages on the worker’s phone; show community via browser or tablet; **sync or partial-restore** a new pack in town. Not a mesh messenger.

> Note: For this to work, we don't necessarily need a git-style version control with ability to merge perfectly. But we do need to help users by showing the edit dates and versions of files in the JSON template editor so that they can easily track them, and then easily fetch the versions they need.
> 
> After thought: It's likely that we might benefit from having a Content-Addressable Storage (CAS) system on the phone. Then, we can build indexes of the known versions and relationships between them to quickly show the infos users might need, or quickly help them swap in another version.

### Market C — Small business & community presence

**Who:** Market stalls, salons, clinics, churches, events, tourism boards — owners whose **phone is the business device**, not a desk laptop.

**Struggles:**
- Need “today’s special” or weekly bulletin **always visible**, not a URL customers must open.
- Cloud builders (GIZI-style) work but lock hosting; local hosting resellers are unreliable.
- Diners don’t want to join random Wi‑Fi to order; they glance at a board or use WhatsApp.

**What PCMS offers:** **Today’s board** — edit on phone, loop on a wall tablet/TV; optional **public link** for WhatsApp bio when online. Digital chalkboard, not conveyor-belt ordering.

### "Power" Market - Power Users, Makers & packaged OSS

**Who:** Super users just like you: want desktop-grade open-source web UIs + backend binaries on a phone, with sane OS boundaries (Tauri Tools, dev mode, Termux/Pythonista on iPad).

**Struggles:**
- Great OSS stacks exist for desktop; mobile gets a thin app or nothing.
- Random “swiss army knife” apps feel incoherent without a spine.
- App Store rules forbid arbitrary downloadable server binaries from users.

**What PCMS offers:** **Trusted bundled backends**, mini-app templates, Local CDN, optional dev mode — a **runtime**, not an infinite app store. Personal Tools (Melt, SHASUM, etc.) live on the shelf, not the billboard.

## Conclusion: Use cases & verticals

| Use case / vertical | Market | Rejected? |
|---------------------|--------|-----------|
| **Today’s board** (menu, prices, hours, promo video) | C | |
| **Content pack drops** (offline site bundle handoff) | A (+ all) | |
| **WhatsApp / bio public link** when online (reversed CDN) | A, C | |
| **Event / church / school weekly one-pager** | C | |
| **NGO field kit** (mission brief on worker phone, show via tablet/browser) | B | |
| **Community health visit brief** | B | |
| **Outage / disaster community bulletin** | B | |
| **Rural teacher weekly lesson pack** | B, C | |
| **Maker demo** (try OSS template locally before upload) | Power | |
| **Developer mode** (external localhost server via Termux/Pythonista) | Power | |
| **Trust circle / QR key exchange** (sign & verify packs) | B | |
| **Personal Tools shelf** (video, SHASUM, etc.) | Power | Likely yes. Can be an internal version, or easter eggs |
| **Remote admin UI** (future mini app) | Power | |
| Per-seat **customer joins Wi‑Fi to order** (conveyor-belt model) | — | Yes |
| **Catalog of all mobile OSS binaries** | — | Yes |
| **Device-wide root CA** as default trust path | — | Yes (see requirements) |
| **GIZI-style** locked hosting as the only publish path | — | Not our product; the diversity of hosting/drops is our game |
