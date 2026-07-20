import { z, type ZodObject } from "zod";

// @ts-ignore: Node.js types are not available in the browser.
const IS_NODE = typeof process !== "undefined" && Boolean(process?.versions?.node);

// @ts-ignore: Node.js types are not available in the browser.
const WORKDIR = IS_NODE ? process.cwd() : "";

export const EditorUiFieldGroupSchema = z.object({
  name: z.string().optional(),
  paths: z.array(z.string()),
  isSingleton: z.boolean().optional(),
  isSingleField: z.boolean().optional(),
});

export const EditorUiSchemaJsonSchema = z.object({
  fieldGroups: z.array(EditorUiFieldGroupSchema),
});

export type EditorUiFieldGroup = z.infer<typeof EditorUiFieldGroupSchema>;
export type EditorUiSchemaJson = z.infer<typeof EditorUiSchemaJsonSchema>;

export const PageContentSchemaJsonSchema = z.object({
  schemaVersion: z.string(),
  editorUiSchema: EditorUiSchemaJsonSchema,
  jsonSchema: z.object<Record<string, unknown>>(),
});

export type PageContentSchemaJson = z.infer<typeof PageContentSchemaJsonSchema>;

export type DefinePageContentSchemaProps = {
  schema: ZodObject<any>;
  schemaName: string;
  schemaVersion: string;
  editorUiSchema: EditorUiSchemaJson;
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
  if (!IS_NODE) {
    return;
  }

  // @ts-ignore: Node.js types are not available in the browser.
  const path = await import("path");
  // @ts-ignore: Node.js types are not available in the browser.
  const { mkdir, writeFile } = await import("fs/promises");
  const { z } = await import("zod");
  const outputDir = path.join(WORKDIR, "dist", "schema");

  await mkdir(outputDir, { recursive: true });

  const schemaDefinition: PageContentSchemaJson = {
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
  if (!IS_NODE) {
    return;
  }

  // @ts-ignore: Node.js types are not available in the browser.
  const path = await import("path");
  // @ts-ignore: Node.js types are not available in the browser.
  const { mkdir, writeFile } = await import("fs/promises");
  const outputDir = path.join(WORKDIR, "dist");

  await mkdir(outputDir, { recursive: true });

  // @ts-ignore: Node.js types are not available in the browser.
  const { pathToFileURL } = await import("node:url");
  const packageJsonUrl = pathToFileURL(path.join(WORKDIR, "package.json"));
  const packageJson = await import(packageJsonUrl.toString());
  const packageDependencies = packageJson.dependencies || {};
  const dependencies = Object.entries(packageDependencies)
    .filter(([name]) => !name.startsWith("@tcms/"))
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
  // @ts-ignore: Node.js types are not available in the browser.
  const path = await import("path");
  // @ts-ignore: Node.js types are not available in the browser.
  const { rm } = await import("fs/promises");
  const outputDir = path.join(WORKDIR, "dist", "schema");
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
  "node:url",
];