# Ops Design: Workspace packages, and versioning.

In general, we do not want publish `app/` and `templates/` as packages. Those are meant to be built together into application bundles.

However we will publish `packages/*` as packages, and we will need to version them.

Additionally, that versioning is done through the git commit hook system. It could be confusing to figure out what versioning rules are in place.

So this document covers some basic rules about versioning.

### Monorepo structure & coupling

- **`app/` and `templates/`** are always built and shipped **together**. There should be **no way to build the app against an older template** (no semver npm dep; build order + embed/copy template `dist`, not `@tcms/template-*@version`).
- **`templates/` → `packages/`** can use **semver / npm** later. Templates may pin **older published helpers** while the monorepo moves on.
- **`packages/*`** workspace is declared but was empty at first; you're about to add publishable helpers.

Within packages, we adopt a naming scheme, based on the three levels of Security as mentioned in [tech-overview.md](./tech-overview.md):

- `@tcms/common` is a list of public types and utilities that are shared between all three levels of Security.
- `@tcms/mini-app-*` for mini-app packages (Harness for connecting Vue/React mini apps to Local CDN)
- `@tcms/tool-*` for tool packages (Any common types and utilities used by tools)
- `@tcms/admin-*` for admin shell packages (Any common types and utilities used by the admin shell)

Build scripts: All templates and packages should have `build`, `typecheck` and `test` scripts at the least, even if they just return 0: 

* `test` can return 0 for test-utils only. 
* `build` can do nothing for everything in `packages/*`.
* `typecheck` should always run for everything.

### Dependency / versioning policy

- **Inside the monorepo (daily dev):** workspace link — `*` (Yarn 1) or `workspace:*` (Berry). “Latest” means **whatever is on disk** in `packages/*`.
- **Published helpers on npm:** explicit pin (e.g. `0.1.0`) or `npm:@tcms/common@0.1.0` on Berry when workspace is newer.
- **Yarn workspace resolution:** local workspace wins when **name matches + range satisfies**; not “npm first.” Tight pin can pull registry; broad range / `*` stays local.
- **Debugging old built versions:** not automatic with workspace linking; options are git, `yarn pack` + `file:`, or a private registry — you understood that tradeoff.

### Git commit message convention

Runs on the final commit message via two separate hooks `commit-msg` to read the commit message, and `post-commit` to amend the commit with latest versions. Skip with `git commit --no-verify`.

| Rule | Behavior |
|------|----------|
| **Trigger** | Staged **relevant** files under `packages/<name>/` (not `.md`, not `dist/`; `package.json` only if non-version fields change) |
| **`feat!:`** | **minor** bump (`1.2.3` → `1.3.0`) |
| **`feat:`** | **patch** bump (`1.2.3` → `1.2.4`) |
| **`fix:`** | **patch** bump (`1.2.3` → `1.2.4`) |
| **`chore`, `refactor`, `test`** | no bump |
| **Unknown / non-conventional type** | **exit non-zero** — block commit |
| **Allowed types only** | `feat!`, `feat`, `fix`, `chore`, `refactor`, `test` |

Implemented via **Husky** `commit-msg` + `post-commit` → `scripts/bump-package-versions.mjs`. Demo packages (`demo-a`, `demo-b`) + `scripts/test-bump-package-versions.mjs` for integration tests.
