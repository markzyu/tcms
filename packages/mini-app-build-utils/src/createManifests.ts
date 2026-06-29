import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ContentSchemaDocument, EditorUiSchema } from "@pcms/mini-app-common";
import { z, type ZodType } from "zod";

export type CreateManifestsOptions = {
  outputDir: string;
  schemaVersion: string;
  contentSchema: ZodType;
  editorUiSchema: EditorUiSchema;
  templateManifest: Record<string, unknown>;
};

export function createManifests(options: CreateManifestsOptions): void {
  const { outputDir, schemaVersion, contentSchema, editorUiSchema, templateManifest } =
    options;

  mkdirSync(outputDir, { recursive: true });

  const contentSchemaDocument: ContentSchemaDocument = {
    schemaVersion,
    editorUiSchema,
    jsonSchema: z.toJSONSchema(contentSchema, { io: "input" }) as Record<string, unknown>,
  };

  writeFileSync(
    join(outputDir, "content.schema.json"),
    `${JSON.stringify(contentSchemaDocument, null, 2)}\n`,
  );

  writeFileSync(
    join(outputDir, "template.manifest.json"),
    `${JSON.stringify(templateManifest, null, 2)}\n`,
  );
}
