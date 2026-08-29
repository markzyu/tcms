import { Content, useTemplateStringFactory } from "../../utils/i18n";
import * as Keys from "./contentKeys";

export const libraryPageContent: Content<Keys.LibraryPageContentKey> = {
  en: {
    [Keys.LibraryPageTitle]: "Library",
    [Keys.TemplateAddNewBtnLabel]: "Add New",
  },
  ja: {
    [Keys.LibraryPageTitle]: "ライブラリ",
    [Keys.TemplateAddNewBtnLabel]: "追加",
  },
};

export const useLibraryPageContent = useTemplateStringFactory(libraryPageContent);