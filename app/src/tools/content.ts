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
    [Keys.JsonObjEditorDeleteConfirmButton]: "Confirm?",
    [Keys.JsonObjEditorValidationRequiredField]: "Missing information",
    [Keys.JsonObjEditorValidationInvalidValue]: "Invalid information",
  },
  ja: {
    [Keys.TemplateEditorMiscGroupLabel]: "その他",
    [Keys.TemplateEditorEmailHint]: "name@example.com",
    [Keys.TemplateEditorUrlHint]: "https://www.example.com",
    [Keys.TemplateEditorPasswordHint]: "********",
    [Keys.TemplateEditorTelHint]: "(00) 0000-0000",
    [Keys.TemplateEditorNumberHint]: "000",
    [Keys.TemplateEditorAddFlatArray]: "\"{name}\" を追加",
    [Keys.TemplateEditorCancelButton]: "戻る",
    [Keys.TemplateEditorSaveButton]: "保存",
    [Keys.JsonObjEditorEditDetailsButton]: "詳細",
    [Keys.JsonObjEditorDeleteButton]: "削除",
    [Keys.JsonObjEditorDeleteConfirmButton]: "確認？",
    [Keys.JsonObjEditorValidationRequiredField]: "情報が不足しています",
    [Keys.JsonObjEditorValidationInvalidValue]: "無効な情報です",
  },
};

export const useToolsContent = useTemplateStringFactory(toolsContent);