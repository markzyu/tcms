import { Content, useTemplateStringFactory } from "../../utils/i18n";
import * as Keys from "./contentKeys";

export const adminHomePageContent: Content<Keys.AdminHomePageContentKey> = {
  en: {
    [Keys.InstanceStartBtnLabel]: "Start",
    [Keys.InstanceStopBtnLabel]: "Stop",
    [Keys.InstanceEditBtnLabel]: "Edit",
    [Keys.InstanceShareBtnLabel]: "Share",
    [Keys.DebugToolsHeading]: "Debug Tools",
    [Keys.DebugToolsSlugLabel]: "URL Slug",
    [Keys.DebugToolsJsonDataLabel]: "JSON Data",
  },
  ja: {
    [Keys.InstanceStartBtnLabel]: "開始",
    [Keys.InstanceStopBtnLabel]: "停止",
    [Keys.InstanceEditBtnLabel]: "編集",
    [Keys.InstanceShareBtnLabel]: "共有",
    [Keys.DebugToolsHeading]: "デバッグツール",
    [Keys.DebugToolsSlugLabel]: "URLスラッグ",
    [Keys.DebugToolsJsonDataLabel]: "JSONデータ",
  },
};

export const useAdminHomePageContent = useTemplateStringFactory(adminHomePageContent);