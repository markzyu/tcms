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
export const JsonObjEditorConfirmBackAlertHeader = "tools.jsonObjectsEditor.confirmBackAlertHeader" as const;
export const JsonObjEditorConfirmBackAlertMessage = "tools.jsonObjectsEditor.confirmBackAlertMessage" as const;
export const JsonObjEditorConfirmBackAlertCancelButton = "tools.jsonObjectsEditor.confirmBackAlertCancelButton" as const;
export const JsonObjEditorConfirmBackAlertOKButton = "tools.jsonObjectsEditor.confirmBackAlertOKButton" as const;
export const WorkflowOrchestratorErrorHeader = "tools.workflowOrchestrator.errorHeader" as const;
export const WorkflowOrchestratorErrorDismissBtn = "tools.workflowOrchestrator.errorDismissBtn" as const;
export const WorkflowOrchestratorErrorMessageWrapper = "tools.workflowOrchestrator.errorMessageWrapper" as const;
export const WorkflowOrchestratorLoadingMessageWrapper = "tools.workflowOrchestrator.loadingMessageWrapper" as const;
export const JsonArrEditorOuterGroupNameTemplate = "tools.jsonArraysEditor.outerGroupNameTemplate" as const;
export const JsonArrEditorClickHereForFullOuterItem = "tools.jsonArraysEditor.clickHereForFullOuterItem" as const;

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
  JsonObjEditorConfirmBackAlertHeader,
  JsonObjEditorConfirmBackAlertMessage,
  JsonObjEditorConfirmBackAlertCancelButton,
  JsonObjEditorConfirmBackAlertOKButton,
  WorkflowOrchestratorErrorHeader,
  WorkflowOrchestratorErrorDismissBtn,
  WorkflowOrchestratorErrorMessageWrapper,
  WorkflowOrchestratorLoadingMessageWrapper,
  JsonArrEditorOuterGroupNameTemplate,
  JsonArrEditorClickHereForFullOuterItem,
] as const;

export type ToolContentKey = typeof toolContentKeys[number];