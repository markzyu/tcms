import type { EditorUiFieldTypes } from "@tcms/mini-app-common";
import type { JSONSchema7Definition } from "json-schema";

// Unlike the EditorUiSchemaJson, the FieldGroups here reflect real data from input
// (Any non singleton field group will have different names, etc)
export type FieldGroupDescriptor = {
  // This is also the key of the field group in the UI. It must include all `indices`.
  name: string;
  fields: FieldDescriptor[];
  // This is a list of all indices accessed along the `EditorUiFieldGroup.paths` of the input JSON.
  indices: number[];
  // Contains only singleton fields.
  isSingleton: boolean;
};

// Unlike the EditorUiFieldGroup, the FieldDescriptors here reflect real data. Non existing fields are not included.
export type FieldDescriptor = {
  // This is also the UI key within the current field group.
  // For now this is just the field name. (TODO: For INTL we need a separate editorUiSchema field for field names in each language)
  name: string;
  // This is the full path to the actual field in the input JSON
  fullPath: string;
  isSingleton: boolean;
} & EditorUiFieldTypes;

export const walkJsonSchemaForAllFields = (schema: JSONSchema7Definition, results?: FieldDescriptor[], rootPath?: string, notSingleton?: boolean): FieldDescriptor[] => {
  const newResults = results ?? [];
  if (typeof schema === "boolean") {
    return newResults;
  } else if (schema.oneOf) {
    // We don't handle union types, for now
    return newResults;
  } else if (schema.type === "object") {
    for (const [key, value] of Object.entries(schema.properties ?? {})) {
      walkJsonSchemaForAllFields(value, newResults, rootPath ? `${rootPath}.${key}` : key, notSingleton);
    }
  } else if (schema.type === "array") {
    if (Array.isArray(schema.items)) {
      // We don't handle tuple types, for now
      return newResults;
    }
    if (rootPath && rootPath.includes("{index}")) {
      // The JsonObjectsEditor does not handle nested arrays.
      return newResults;
    }
    walkJsonSchemaForAllFields(schema.items ?? {}, newResults, rootPath ? `${rootPath}.{index}` : "{index}", true);
  } else if (schema.type !== "null") {
    let extras: EditorUiFieldTypes = {};
    if (schema.type === "boolean") {
      extras = { type: "toggle" };
    } else if (schema.type === "string" && Array.isArray(schema.enum)) {
      extras = { type: "segment" };
      extras.choices = schema.enum.map((choice) => String(choice));
      extras.defaultValue = schema.default ? String(schema.default) : undefined;
    }
    newResults.push({
      ...extras,
      name: rootPath ?? "",
      fullPath: rootPath ?? "",
      isSingleton: !notSingleton,
    });
  }
  return newResults;
}

export const newFieldGroup = (name: string, isSingleton: boolean): FieldGroupDescriptor => ({
  name,
  fields: [],
  indices: [],
  isSingleton,
});

export const getShallowArrayPaths = (group: FieldGroupDescriptor) => {
  return group.fields.flatMap(({ fullPath }) => {
    const parts = fullPath.split(".");
    const firstIndex = parts.indexOf("{index}");
    if (firstIndex === -1) {
      return [];
    }
    const result = parts.slice(0, firstIndex).join(".");
    return [result];
  });
}