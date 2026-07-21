import { Content, useTemplateStringFactory } from "../utils/i18n";
import * as Keys from "./contentKeys";

export const toolsContent: Content<Keys.ToolContentKey> = {
  en: {
    [Keys.TemplateEditorMiscGroupLabel]: "Miscellaneous Questions",
  },
  ja: {
    [Keys.TemplateEditorMiscGroupLabel]: "その他",
  },
};

export const useToolsContent = useTemplateStringFactory(toolsContent);