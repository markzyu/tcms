#!/usr/bin/env tsx
import { createManifests } from "../createManifests";
import { loadTemplateBuildConfig } from "../loadConfigModule";
import { readArg, requireArg, resolveTemplatePath } from "../cliArgs";

const usage =
  "Usage: pcms-create-manifests --template-dir <dir> --config <module.ts> --out <dist-dir>";

async function main() {
  const templateDir = requireArg("--template-dir", usage);
  const configPath = requireArg("--config", usage);
  const outputDir = requireArg("--out", usage);

  const config = await loadTemplateBuildConfig(
    resolveTemplatePath(templateDir, configPath),
  );

  createManifests({
    outputDir: resolveTemplatePath(templateDir, outputDir),
    schemaVersion: config.schemaVersion,
    contentSchema: config.contentSchema,
    editorUiSchema: config.editorUiSchema,
    templateManifest: config.templateManifest,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
