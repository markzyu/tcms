import { Content, useTemplateStringFactory } from "../utils/i18n";
import * as Keys from "./contentKeys";

export const toolsContent: Content<Keys.ToolContentKey> = {
  en: {
    [Keys.TemplateEditorMiscGroupLabel]: "Miscellaneous Questions",
    [Keys.TemplateEditorEmailHint]: "email@domain.com",
    [Keys.TemplateEditorUrlHint]: "https://www.example.com",
    [Keys.TemplateEditorPasswordHint]: "********",
    [Keys.TemplateEditorTelHint]: "888-888-8888",
    [Keys.TemplateEditorNumberHint]: "000",
    [Keys.TemplateEditorAddFlatArray]: "Add \"{name}\"",
    [Keys.TemplateEditorCancelButton]: "Cancel",
    [Keys.TemplateEditorSaveButton]: "Save",
    [Keys.JsonObjEditorEditDetailsButton]: "Edit Details",
    [Keys.JsonObjEditorDeleteButton]: "Delete",
    [Keys.JsonObjEditorDeleteConfirmButton]: "Confirm deletion",
    [Keys.JsonObjEditorValidationRequiredField]: "Missing information",
    [Keys.JsonObjEditorValidationInvalidValue]: "Invalid information",
    [Keys.JsonObjEditorFallbackTitle]: "Page Content Editor",
    [Keys.JsonObjEditorConfirmBackAlertHeader]: "Confirm",
    [Keys.JsonObjEditorConfirmBackAlertMessage]: "Are you sure you want to leave this page? Any unsaved changes will be lost.",
    [Keys.JsonObjEditorConfirmBackAlertCancelButton]: "Cancel",
    [Keys.JsonObjEditorConfirmBackAlertOKButton]: "OK",
    [Keys.WorkflowOrchestratorErrorHeader]: "Error",
    [Keys.WorkflowOrchestratorErrorDismissBtn]: "Go back",
    [Keys.WorkflowOrchestratorErrorMessageWrapper]:
      "An internal error occurred while loading the workflow. Details: {errorMessage}",
    [Keys.WorkflowOrchestratorLoadingMessageWrapper]:
      "Loading workflow: {workflowId}...",
    [Keys.JsonArrEditorOuterGroupNameTemplate]: "\"{valueAtKey}\" {arrayLabel}",
    [Keys.JsonArrEditorClickHereForFullOuterItem]: "Click here for full {outerArraySingularName}",
  },
  ja: {
    [Keys.TemplateEditorMiscGroupLabel]: "その他の質問",
    [Keys.TemplateEditorEmailHint]: "name@example.com",
    [Keys.TemplateEditorUrlHint]: "https://www.example.com",
    [Keys.TemplateEditorPasswordHint]: "********",
    [Keys.TemplateEditorTelHint]: "(00) 0000-0000",
    [Keys.TemplateEditorNumberHint]: "000",
    [Keys.TemplateEditorAddFlatArray]: "「{name}」を追加",
    [Keys.TemplateEditorCancelButton]: "キャンセル",
    [Keys.TemplateEditorSaveButton]: "保存",
    [Keys.JsonObjEditorEditDetailsButton]: "詳細を編集",
    [Keys.JsonObjEditorDeleteButton]: "削除",
    [Keys.JsonObjEditorDeleteConfirmButton]: "削除を確定",
    [Keys.JsonObjEditorValidationRequiredField]: "情報が不足しています",
    [Keys.JsonObjEditorValidationInvalidValue]: "無効な情報です",
    [Keys.JsonObjEditorFallbackTitle]: "ページ編集",
    [Keys.JsonObjEditorConfirmBackAlertHeader]: "確認",
    [Keys.JsonObjEditorConfirmBackAlertMessage]: "このページを離れますか？未保存の変更は失われます。",
    [Keys.JsonObjEditorConfirmBackAlertCancelButton]: "キャンセル",
    [Keys.JsonObjEditorConfirmBackAlertOKButton]: "OK",
    [Keys.WorkflowOrchestratorErrorHeader]: "エラー",
    [Keys.WorkflowOrchestratorErrorDismissBtn]: "戻る",
    [Keys.WorkflowOrchestratorErrorMessageWrapper]:
      "ワークフローの読み込み中に内部エラーが発生しました。詳細: 「{errorMessage}」",
    [Keys.WorkflowOrchestratorLoadingMessageWrapper]:
      "ワークフローの読み込み中: {workflowId}...",
    [Keys.JsonArrEditorOuterGroupNameTemplate]: "「{valueAtKey}」{arrayLabel}",
    [Keys.JsonArrEditorClickHereForFullOuterItem]: "ここをクリックして全ての{outerArraySingularName}を表示",
  },
};

export const useToolsContent = useTemplateStringFactory(toolsContent);