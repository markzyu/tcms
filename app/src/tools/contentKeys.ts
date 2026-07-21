export const TemplateEditorMiscGroupLabel = "tools.templateEditor.miscGroupLabel" as const;
export const toolContentKeys = [
  TemplateEditorMiscGroupLabel,
] as const;

export type ToolContentKey = typeof toolContentKeys[number];