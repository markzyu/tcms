import { resolve } from "node:path";

export function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

export function requireArg(flag: string, usage: string): string {
  const value = readArg(flag);
  if (!value) {
    console.error(usage);
    process.exit(1);
  }
  return value;
}

export function resolveTemplatePath(templateDir: string, relativePath: string): string {
  return resolve(templateDir, relativePath);
}
