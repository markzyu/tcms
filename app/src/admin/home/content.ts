import { Content, useTemplateStringFactory } from "../../utils/i18n";
import * as Keys from "./contentKeys";

export const adminHomePageContent: Content<Keys.AdminHomePageContentKey> = {
  en: {
    [Keys.InstanceStartBtnLabel]: "Start",
    [Keys.InstanceStopBtnLabel]: "Stop",
    [Keys.InstanceEditBtnLabel]: "Edit",
    [Keys.InstanceEditPageContentBtnAriaLabel]: "Edit Detailed Page Content",
    [Keys.InstanceShareBtnLabel]: "Share",
    [Keys.StatusRunningLabel]: "(Running)",
    [Keys.StatusErrorLabel]: "(Error)",
    [Keys.DebugToolsHeading]: "Debug Tools",
    [Keys.DebugToolsSlugLabel]: "URL Slug",
    [Keys.DebugToolsJsonDataLabel]: "JSON Data",
  },
  ja: {
    [Keys.InstanceStartBtnLabel]: "開始",
    [Keys.InstanceStopBtnLabel]: "停止",
    [Keys.InstanceEditBtnLabel]: "編集",
    [Keys.InstanceEditPageContentBtnAriaLabel]: "詳細ページコンテンツを編集する",
    [Keys.InstanceShareBtnLabel]: "共有",
    [Keys.StatusRunningLabel]: "(実行中)",
    [Keys.StatusErrorLabel]: "(エラー)",
    [Keys.DebugToolsHeading]: "デバッグツール",
    [Keys.DebugToolsSlugLabel]: "URLスラッグ",
    [Keys.DebugToolsJsonDataLabel]: "JSONデータ",
  },
};

export const useAdminHomePageContent = useTemplateStringFactory(adminHomePageContent);