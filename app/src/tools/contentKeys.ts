export const TemplateEditorMiscGroupLabel = "tools.templateEditor.miscGroupLabel" as const;
export const TemplateEditorEmailHint = "tools.templateEditor.emailHint" as const;
export const TemplateEditorUrlHint = "tools.templateEditor.urlHint" as const;
export const TemplateEditorPasswordHint = "tools.templateEditor.passwordHint" as const;
export const TemplateEditorTelHint = "tools.templateEditor.telHint" as const;
export const TemplateEditorNumberHint = "tools.templateEditor.numberHint" as const;

export const toolContentKeys = [
  TemplateEditorMiscGroupLabel,
  TemplateEditorEmailHint,
  TemplateEditorUrlHint,
  TemplateEditorPasswordHint,
  TemplateEditorTelHint,
  TemplateEditorNumberHint,
] as const;

export type ToolContentKey = typeof toolContentKeys[number];