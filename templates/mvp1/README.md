# mvp-template1

Minimal React + TypeScript app built with esbuild. React is loaded from the browser via an import map (not bundled into `dist/app.js`).

## Setup

```bash
cd mvp-template1
nvm use          # Node >= 18 (see .nvmrc)
yarn install
```

## Commands

```bash
yarn build       # tailwindcss CLI → dist/app.css, then esbuild → dist/app.js
yarn dev         # tailwindcss --watch + esbuild --watch + dev server :3000
yarn typecheck   # run tsc without emitting
yarn test        # jest + jsdom (mocks window.pcms.cdnBridge)
yarn test:watch  # jest in watch mode
```

CSS is built separately with the [Tailwind CLI](https://tailwindcss.com/docs/installation/tailwind-cli) (`src/main.css` → `dist/app.css`), not through esbuild.

## Scripts and Ops

Every template comes with a few `.mts` scripts to actually stitch together the build process.

- `src/content/rootManifest.mts`: Defines the root manifest for the template.
- `src/content/contactCard.ts`: Defines the contact card schema.
- `esbuild.config.mts`: The esbuild script that transpiles and bundles the final javascript code.

All three files contain calls to Node.js modules. But `src/content` files rely on helper functions to do so. If you need custom Node.js logic, please add those to `esbuild.config.mts` or add a new, configurable build behavior in `@pcms/mini-app-common`.

## Testing (TDD)

Component tests use Jest + jsdom + React Testing Library. They do **not** run esbuild or hit the network.

Use `@pcms/mini-app-react-test-utils` to install a mocked `window.pcms.cdnBridge`. Bind your template content type once per test file; content is supplied via **`initialContentJson`** (v0.1 does not call `fetchContentJson`):

```tsx
import { screen } from "@testing-library/react";
import { renderWithCdnBridge } from "@pcms/mini-app-react-test-utils";
import type { ContactCardContent } from "./content/contactCard";
import { defaultContactCardContent } from "./content/contactCard.mock";

const render = renderWithCdnBridge<ContactCardContent>;

render(<ContactCard />, {
  content: { ...defaultContactCardContent, name: "Jane Doe" },
});

expect(screen.getByText("Jane Doe")).toBeInTheDocument();
```

Open http://127.0.0.1:3000 after starting the dev server.
