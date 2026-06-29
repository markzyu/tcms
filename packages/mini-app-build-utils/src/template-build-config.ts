import type { EditorUiSchema } from "@pcms/mini-app-common";
import type { ZodType } from "zod";

export type TemplateBuildConfig = {
  schemaVersion: string;
  contentSchema: ZodType;
  editorUiSchema: EditorUiSchema;
  templateManifest: Record<string, unknown>;
};

export function assertTemplateBuildConfig(
  moduleExports: Record<string, unknown>,
): TemplateBuildConfig {
  const { schemaVersion, contentSchema, editorUiSchema, templateManifest } = moduleExports;

  if (typeof schemaVersion !== "string") {
    throw new Error("Template config must export schemaVersion: string");
  }
  if (!contentSchema || typeof contentSchema !== "object" || !("safeParse" in contentSchema)) {
    throw new Error("Template config must export contentSchema: ZodType");
  }
  if (!editorUiSchema || typeof editorUiSchema !== "object") {
    throw new Error("Template config must export editorUiSchema: EditorUiSchema");
  }
  if (!templateManifest || typeof templateManifest !== "object") {
    throw new Error("Template config must export templateManifest: object");
  }

  return {
    schemaVersion,
    contentSchema: contentSchema as ZodType,
    editorUiSchema: editorUiSchema as EditorUiSchema,
    templateManifest: templateManifest as Record<string, unknown>,
  };
}
