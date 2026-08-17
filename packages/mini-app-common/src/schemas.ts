import { z, type ZodObject } from "zod";

// @ts-ignore: Node.js types are not available in the browser.
const IS_NODE = typeof process !== "undefined" && Boolean(process?.versions?.node);

// @ts-ignore: Node.js types are not available in the browser.
const WORKDIR = IS_NODE ? process.cwd() : "";

export const AppLanguagesSchema = z.enum(["en", "ja"]);
export type AppLanguages = z.infer<typeof AppLanguagesSchema>;

export const EditorUiTextareaFieldSchema = z.object({
  type: z.literal("textarea"),
});

export const EditorUiInputFieldSchema = z.object({
  type: z.literal("input"),
  inputType: z.enum(["text", "number", "email", "password", "tel", "url"]).optional(),
});

export const EditorUiMediaFieldSchema = z.object({
  type: z.literal("media"),
});

export const EditorUiToggleFieldSchema = z.object({
  type: z.literal("toggle"),
});

export const EditorUiSegmentFieldSchema = z.object({
  type: z.literal("segment"),
  choices: z.array(z.string()),
  defaultValue: z.string().optional(),
});

export const EditorUiFieldTypesSchema = z.union([
  EditorUiTextareaFieldSchema.partial(),
  EditorUiMediaFieldSchema.partial(),
  EditorUiInputFieldSchema.partial(),
  EditorUiToggleFieldSchema.partial(),
  EditorUiSegmentFieldSchema.partial(),
]);

export const EditorUiFieldSchema = z.intersection(
  EditorUiFieldTypesSchema,
  z.object({
    path: z.string(),
  }),
);

export type EditorUiFieldTypes = z.infer<typeof EditorUiFieldTypesSchema>;
export type EditorUiField = z.infer<typeof EditorUiFieldSchema>;

export const EditorUiFieldGroupSchema = z.object({
  // If not provided, we store all fields in the default "Miscellaneous" group.
  labelByLanguage: z.record(AppLanguagesSchema, z.string()).optional(),
  fields: z.array(EditorUiFieldSchema),
});

export const EditorUiFieldLabelsSchema = z.record(
  AppLanguagesSchema, z.record(z.string(), z.string())
);

export const EditorUiSchemaJsonSchema = z.object({
  fieldGroups: z.array(EditorUiFieldGroupSchema),
  fieldLabels: EditorUiFieldLabelsSchema,
  keyFieldsOfArrays: z.array(z.string()).optional(),
  displayAsInnerArrays: z.array(z.string()).optional(),
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
    editorUiSchema: EditorUiSchemaJsonSchema.parse(editorUiSchema),
    jsonSchema: z.toJSONSchema(schema, { io: "input" }),
  };

  await writeFile(
    path.join(outputDir, `${schemaName}.schema.json`),
    JSON.stringify(schemaDefinition, null, 2)
  );
  console.log("Generated schema for", schemaName);

  return `schema/${schemaName}.schema.json`;
};

type RawFieldDescriptor = EditorUiFieldTypes & { label: Record<AppLanguages, string> };
type PredefinedField<T extends z.ZodType> = {
  zodSchema: T;
  fieldGroup: EditorUiFieldGroup;
  fieldLabels: Record<AppLanguages, Record<string, string>>;
}
export const defineEditorUiField = <T extends z.ZodType>(
  zodSchema: T,
  groupName: Record<AppLanguages, string>,
  rawFields: Record<keyof z.infer<T>, RawFieldDescriptor | PredefinedField<any>>
): PredefinedField<T> => {
  const fields: EditorUiField[] = [];
  Object.entries(rawFields).forEach(([key, field]) => {
    if (field && typeof field === "object" && "label" in field) {
      const { label, ...rest } = field as RawFieldDescriptor;
      fields.push({
        ...rest,
        path: key,
      });
    } else if (field && typeof field === "object" && "fieldGroup" in field) {
      const { fieldGroup: { fields } } = field as PredefinedField<any>;
      fields.forEach((field) => {
        fields.push({
          ...field,
          path: `${key}.${field.path}`,
        });
      });
    }
  });
  const fieldGroup = {
    labelByLanguage: groupName,
    fields,
  };

  const fieldLabels: Record<AppLanguages, Record<string, string>> = {
    en: {},
    ja: {},
  };
  Object.entries(rawFields).map(([key, field]) => {
    if (field && typeof field === "object" && "label" in field) {
      const labels = (field as RawFieldDescriptor).label;
      Object.entries(labels).forEach(([language, label]) => {
        fieldLabels[language as AppLanguages][key] = label;
      });
    } else if (field && typeof field === "object" && "fieldLabels" in field) {
      const { fieldLabels } = field as PredefinedField<any>;
      Object.entries(fieldLabels).forEach(([language, labels2]) => {
        Object.entries(labels2).forEach(([key2, label]) => {
          fieldLabels[language as AppLanguages][`${key}.${key2}`] = label;
        });
      });
    }
  });
  return { zodSchema, fieldGroup, fieldLabels };
};

const unionDiscriminatorLabel: Record<AppLanguages, string> = {
  en: "Kind",
  ja: "種類",
};

type UnionType<DP extends string> = z.ZodType<Record<DP, string> & unknown>;
export const defineEditorUiUnionField = <DP extends string, T extends readonly UnionType<DP>[]>(
  zodSchema: z.ZodUnion<T>,
  predefinedFields: Record<z.infer<z.ZodUnion<T>>[DP], PredefinedField<T[number]>>,
  groupName: Record<AppLanguages, string>,
  discriminatorPath: DP,
): PredefinedField<z.ZodUnion<T>> => {
  const fields: EditorUiField[] = [];
  const fieldLabels: Record<AppLanguages, Record<string, string>> = {
    en: {},
    ja: {},
  };
  Object.entries(predefinedFields).forEach(([unionKey, obj]) => {
    const { fieldGroup, fieldLabels } = obj as PredefinedField<T[number]>;
    fieldGroup.fields.forEach((field) => {
      if (discriminatorPath === field.path) {
        return;
      }
      if (fields.some((f) => f.path === field.path)) {
        return;
      }
      console.warn(`[WARN] Collision amongst union fields: ${field.path}`);
    });
    Object.entries(fieldLabels).forEach(([language, labels]) => {
      Object.entries(labels).forEach(([key, label]) => {
        if (key in fieldLabels[language as AppLanguages]) {
          if (discriminatorPath === key) {
            fieldLabels[language as AppLanguages][`${key}.${unionKey}`] = label;
          }
          console.warn(`[WARN] Collision amongst union fields: ${key}`);
        }

        fieldLabels[language as AppLanguages][key] = label;
      });
    });
  });
  fields.push({ path: discriminatorPath });
  Object.entries(unionDiscriminatorLabel).forEach(([language, label]) => {
    fieldLabels[language as AppLanguages][discriminatorPath] = label;
  });
  const fieldGroup = {
    labelByLanguage: groupName,
    fields,
  }
  return { zodSchema, fieldGroup, fieldLabels };
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