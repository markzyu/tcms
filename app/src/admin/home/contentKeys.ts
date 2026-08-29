export const InstanceStartBtnLabel = "admin.homePage.instanceStartBtnLabel" as const;
export const InstanceStopBtnLabel = "admin.homePage.instanceStopBtnLabel" as const;
export const InstanceEditBtnLabel = "admin.homePage.instanceEditBtnLabel" as const;
export const InstanceEditPageContentBtnAriaLabel = "admin.homePage.instanceEditPageContentBtnAriaLabel" as const;
export const InstanceShareBtnLabel = "admin.homePage.instanceShareBtnLabel" as const;

export const StatusRunningLabel = "admin.homePage.statusRunningLabel" as const;
export const StatusErrorLabel = "admin.homePage.statusErrorLabel" as const;

export const DebugToolsHeading = "admin.homePage.debugToolsHeading" as const;
export const DebugToolsSlugLabel = "admin.homePage.debugToolsSlugLabel" as const;
export const DebugToolsJsonDataLabel = "admin.homePage.debugToolsJsonDataLabel" as const;

export const adminHomePageContentKeys = [
  InstanceStartBtnLabel,
  InstanceStopBtnLabel,
  InstanceEditBtnLabel,
  InstanceEditPageContentBtnAriaLabel,
  InstanceShareBtnLabel,
  StatusRunningLabel,
  StatusErrorLabel,
  DebugToolsHeading,
  DebugToolsSlugLabel,
  DebugToolsJsonDataLabel,
] as const;

export type AdminHomePageContentKey = typeof adminHomePageContentKeys[number];