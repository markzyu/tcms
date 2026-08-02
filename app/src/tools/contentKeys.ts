export const TemplateEditorMiscGroupLabel = "tools.templateEditor.miscGroupLabel" as const;
export const TemplateEditorEmailHint = "tools.templateEditor.emailHint" as const;
export const TemplateEditorUrlHint = "tools.templateEditor.urlHint" as const;
export const TemplateEditorPasswordHint = "tools.templateEditor.passwordHint" as const;
export const TemplateEditorTelHint = "tools.templateEditor.telHint" as const;
export const TemplateEditorNumberHint = "tools.templateEditor.numberHint" as const;
export const TemplateEditorAddFlatArray = "tools.templateEditor.addFlatArray" as const;
export const TemplateEditorCancelButton = "tools.templateEditor.cancelButton" as const;
export const TemplateEditorSaveButton = "tools.templateEditor.saveButton" as const;
export const JsonObjEditorEditDetailsButton = "tools.jsonObjectsEditor.editDetailsButton" as const;
export const JsonObjEditorDeleteButton = "tools.jsonObjectsEditor.deleteButton" as const;
export const JsonObjEditorDeleteConfirmButton = "tools.jsonObjectsEditor.deleteConfirmButton" as const;
export const JsonObjEditorValidationRequiredField = "tools.jsonObjectsEditor.validation.requiredField" as const;
export const JsonObjEditorValidationInvalidValue = "tools.jsonObjectsEditor.validation.invalidValue" as const;
export const JsonObjEditorFallbackTitle = "tools.jsonObjectsEditor.fallbackTitle" as const;

export const toolContentKeys = [
  TemplateEditorMiscGroupLabel,
  TemplateEditorEmailHint,
  TemplateEditorUrlHint,
  TemplateEditorPasswordHint,
  TemplateEditorTelHint,
  TemplateEditorNumberHint,
  TemplateEditorAddFlatArray,
  TemplateEditorCancelButton,
  TemplateEditorSaveButton,
  JsonObjEditorEditDetailsButton,
  JsonObjEditorDeleteButton,
  JsonObjEditorDeleteConfirmButton,
  JsonObjEditorValidationRequiredField,
  JsonObjEditorValidationInvalidValue,
  JsonObjEditorFallbackTitle,
] as const;

export type ToolContentKey = typeof toolContentKeys[number];