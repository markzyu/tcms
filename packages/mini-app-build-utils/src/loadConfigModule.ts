import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { assertTemplateBuildConfig, type TemplateBuildConfig } from "./template-build-config";

export async function loadTemplateBuildConfig(
  configPath: string,
): Promise<TemplateBuildConfig> {
  const moduleUrl = pathToFileURL(resolve(configPath)).href;
  const moduleExports = (await import(moduleUrl)) as Record<string, unknown>;
  return assertTemplateBuildConfig(moduleExports);
}
