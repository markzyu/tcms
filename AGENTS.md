# TCMS — agent notes

Guidance for AI agents working in this repo.

## Side note: Node / nvm in agent shells

This project expects **Node 22** (see `.nvmrc`). Agent terminals often start with an old system Node (e.g. `/usr/local/bin/node` v14) because **nvm is not loaded** in non-interactive shells.

Before `yarn`, `npm`, or other Node tooling, activate the repo Node version:

```bash
cd tcms   # repo root (where .nvmrc lives)

export NVM_DIR="${HOME}/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use 22
node -v   # should report v22.x
```

If `nvm use` fails or `node -v` is still wrong, prepend the nvm-managed binary directly (works when sourcing nvm does not):

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.0/bin:$PATH" && cd tcms && node -v && yarn install
```
