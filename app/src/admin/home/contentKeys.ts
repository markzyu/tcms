export const InstanceStartBtnLabel = "admin.homePage.instanceStartBtnLabel" as const;
export const InstanceStopBtnLabel = "admin.homePage.instanceStopBtnLabel" as const;
export const InstanceEditBtnLabel = "admin.homePage.instanceEditBtnLabel" as const;
export const InstanceShareBtnLabel = "admin.homePage.instanceShareBtnLabel" as const;

export const DebugToolsHeading = "admin.homePage.debugToolsHeading" as const;
export const DebugToolsSlugLabel = "admin.homePage.debugToolsSlugLabel" as const;
export const DebugToolsJsonDataLabel = "admin.homePage.debugToolsJsonDataLabel" as const;

export const adminHomePageContentKeys = [
  InstanceStartBtnLabel,
  InstanceStopBtnLabel,
  InstanceEditBtnLabel,
  InstanceShareBtnLabel,
  DebugToolsHeading,
  DebugToolsSlugLabel,
  DebugToolsJsonDataLabel,
] as const;

export type AdminHomePageContentKey = typeof adminHomePageContentKeys[number];