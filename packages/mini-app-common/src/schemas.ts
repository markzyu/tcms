import type { ZodObject } from "zod";

const isNode = typeof process !== "undefined" && Boolean(process?.versions?.node);

export type EditorUiFieldGroup = {
  name?: string;
  paths: string[];
  isSingleton?: boolean;
  isSingleField?: boolean;
};

export type EditorUiSchema = {
  fieldGroups: EditorUiFieldGroup[];
};

export type DefinePageContentSchemaProps = {
  schema: ZodObject<any>;
  schemaName: string;
  schemaVersion: string;
  editorUiSchema: EditorUiSchema;
};

export type DefineRootManifestPageProps = {
  schema: string | void;
};

export type DefineRootManifestProps = {
  id: string;
  title: string;
  version: string;
  pages: Record<string, DefineRootManifestPageProps>;
};

/**
 * Each schema definition contains this function call. It will only execute during build step.
 * 
 * Build step runs the schema definition file itself, from the template package as workdir.
 */
export const definePageContentSchema = async (props: DefinePageContentSchemaProps) => {
  const { schema, schemaName, schemaVersion, editorUiSchema } = props;
  if (!isNode) {
    return;
  }

  const path = await import("path");
  const { mkdir, writeFile } = await import("fs/promises");
  const { z } = await import("zod");
  const outputDir = path.join(process.cwd(), "dist", "schema");

  await mkdir(outputDir, { recursive: true });

  const schemaDefinition = {
    schemaVersion,
    editorUiSchema,
    jsonSchema: z.toJSONSchema(schema, { io: "input" }),
  };

  await writeFile(
    path.join(outputDir, `${schemaName}.schema.json`),
    JSON.stringify(schemaDefinition, null, 2)
  );
  console.log("Generated schema for", schemaName);

  return `schema/${schemaName}.schema.json`;
};

/**
 * Build step must run this function, from the template package root directory as workdir.
 */
export const defineRootManifest = async (props: DefineRootManifestProps) => {
  const { id, title, version, pages } = props;
  if (!isNode) {
    return;
  }

  const path = await import("path");
  const { mkdir, writeFile } = await import("fs/promises");
  const outputDir = path.join(process.cwd(), "dist");

  await mkdir(outputDir, { recursive: true });

  const packageJson = await import(path.join(process.cwd(), "package.json"));
  const packageDependencies = packageJson.dependencies || {};
  const dependencies = Object.entries(packageDependencies)
    .filter(([name]) => !name.startsWith("@pcms/"))
    .map(([name, version]) => (
      `${name}@${version}`
    ));
  const manifestDefinition = {
    id,
    title,
    version,
    pages,
    dependencies,
  };

  await writeFile(
    path.join(outputDir, "manifest.json"),
    JSON.stringify(manifestDefinition, null, 2)
  );
  console.log("Generated manifest at", path.join(outputDir, "manifest.json"));
};

export const cleanUpSchemaDirectory = async () => {
  const path = await import("path");
  const { rm } = await import("fs/promises");
  const outputDir = path.join(process.cwd(), "dist", "schema");
  console.log("Cleaning up schema directory at", outputDir);
  await rm(outputDir, { recursive: true, force: true });
  console.log("Cleaned up schema directory.");
};

/**
 * These modules must be excluded during esbuild.
 */
export const NODE_MODULES_USED_BY_BUILD_SCHEMA_STEP = [
  "path",
  "fs/promises",
];