export type EditorUiFieldGroup = {
  name?: string;
  paths: string[];
  isSingleton?: boolean;
  isSingleField?: boolean;
};

export type EditorUiSchema = {
  fieldGroups: EditorUiFieldGroup[];
};

export type ContentSchemaDocument = {
  schemaVersion: string;
  editorUiSchema: EditorUiSchema;
  jsonSchema: Record<string, unknown>;
};
