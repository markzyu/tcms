export const LibraryPageTitle = "admin.libraryPage.title" as const;

export const TemplateAddNewBtnLabel = "admin.libraryPage.templateAddNewBtnLabel" as const;

export const libraryPageContentKeys = [
  LibraryPageTitle,
  TemplateAddNewBtnLabel,
] as const;

export type LibraryPageContentKey = typeof libraryPageContentKeys[number];