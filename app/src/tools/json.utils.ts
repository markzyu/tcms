import type { EditorUiFieldTypes } from "@tcms/mini-app-common";
import IntlMessageFormat from "intl-messageformat";
import type { JSONSchema7Definition } from "json-schema";

// ----------------------------- UI States -----------------------------

// Unlike the EditorUiSchemaJson, the FieldGroups here reflect real data from input
// (Any non singleton field group will have different names, etc)
export type FieldGroupDescriptor = {
  // The i18n name. This is also the key of the field group in the UI.
  name: string;
  // The original i18n template (without instantiating {index})
  nameTemplate: string;
  fields: FieldDescriptor[];
  // True = Contains only singleton fields. False = Contains only array fields.
  isSingleton: boolean;
};

// Unlike the EditorUiFieldGroup, the FieldDescriptors here reflect real data. Non existing fields are not included.
export type FieldDescriptor = {
  // The i18n name. This is also the UI key within the current field group.
  name: string;
  // This is the full path to the actual field in the input JSON
  fullPath: string;
  jsonSchema: any;
  isRequired: boolean;

  // The array which this field came from, if any.
  arrayPath?: string;
  arrayIndex?: number;

  // The validation error message, if any.
  validationError?: string;

  // True = This field is not an array item. False = This field is an array item.
  isSingleton: boolean;
} & EditorUiFieldTypes;

// ----------------------------- Utility Functions -----------------------------

export const walkJsonSchemaForAllFields = (schema: JSONSchema7Definition, requiredFields: string[], results?: FieldDescriptor[], rootPath?: string, notSingleton?: boolean): FieldDescriptor[] => {
  const newResults = results ?? [];
  if (typeof schema === "boolean") {
    return newResults;
  } else if (schema.oneOf) {
    // We don't handle union types, for now
    return newResults;
  } else if (schema.type === "object") {
    for (const [key, value] of Object.entries(schema.properties ?? {})) {
      walkJsonSchemaForAllFields(value, requiredFields, newResults, rootPath ? `${rootPath}.${key}` : key, notSingleton);
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
    walkJsonSchemaForAllFields(schema.items ?? {}, requiredFields, newResults, rootPath ? `${rootPath}.{index}` : "{index}", true);
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
      arrayPath: notSingleton ? getShallowArrayPath(rootPath ?? "") : undefined,
      isSingleton: !notSingleton,
      jsonSchema: schema,
      isRequired: rootPath ? requiredFields.includes(rootPath) : true,
    });
  }
  return newResults;
}

export const getRequiredFields = (schema: JSONSchema7Definition, requiredFields?: string[], rootPath?: string) => {
  const results = requiredFields ?? [];
  if (typeof schema === "boolean") {
    return results;
  }
  if (schema.required) {
    schema.required.forEach((required) => {
      results.push(rootPath ? `${rootPath}.${required}` : required);
    });
  }
  if (schema.type === "object" && "properties" in schema) {
    for (const [key, value] of Object.entries(schema.properties ?? {})) {
      getRequiredFields(value, results, rootPath ? `${rootPath}.${key}` : key);
    }
  } else if (schema.type === "array" && "items" in schema && !Array.isArray(schema.items)) {
    getRequiredFields(schema.items ?? {}, results, rootPath ? `${rootPath}.{index}` : "{index}");
  } else if (schema.type === "array" && "items" in schema && Array.isArray(schema.items)) {
    schema.items.forEach((item, i) => getRequiredFields(item, results, rootPath ? `${rootPath}.${i}` : String(i)));
  } else if (schema.oneOf) {
    schema.oneOf.forEach((oneOf) => getRequiredFields(oneOf, results, rootPath));
  }
  return results;
}

export const newFieldGroup = (nameTemplate: string, locale: string, index?: number): FieldGroupDescriptor => ({
  name: String(new IntlMessageFormat(nameTemplate, locale).format({
    index: index !== undefined ? index + 1 : undefined,
  })),
  nameTemplate,
  fields: [],
  isSingleton: index === undefined,
});

export const getShallowArrayPath = (fullPath: string) => {
  const parts = fullPath.split(".");
  const firstIndex = parts.indexOf("{index}");
  if (firstIndex === -1) {
    return undefined;
  }
  return parts.slice(0, firstIndex).join(".");
}

export const getShallowArrayPaths = (group: FieldGroupDescriptor) => {
  return group.fields.flatMap(({ fullPath }) => {
    const result = getShallowArrayPath(fullPath);
    if (result) {
      return [result];
    }
    return [];
  });
}