#!/usr/bin/env tsx
import { createTemplatePack } from "../createTemplatePack";
import { readArg, requireArg, resolveTemplatePath } from "../cliArgs";

const usage =
  "Usage: pcms-create-template-pack --template-dir <dir> --dist <dist-dir> --out <zip-path> [--template-id contact-card]";

async function main() {
  const templateDir = requireArg("--template-dir", usage);
  const distDir = requireArg("--dist", usage);
  const outputZipPath = requireArg("--out", usage);
  const templateId = readArg("--template-id");

  await createTemplatePack({
    distDir: resolveTemplatePath(templateDir, distDir),
    outputZipPath: resolveTemplatePath(templateDir, outputZipPath),
    templateId,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
