export type UploadTab = "hiring" | "workplace" | "community" | "open_to_work";

export function uploadTabPath(tab: UploadTab): string {
  return `/upload?tab=${tab}`;
}

export const HIRING_UPLOAD_TABS = new Set<UploadTab>(["hiring", "workplace", "community"]);
export const SEEKER_UPLOAD_TABS = new Set<UploadTab>(["open_to_work", "community"]);

export function isUploadTabForMode(tab: string, isHiring: boolean): tab is UploadTab {
  return (isHiring ? HIRING_UPLOAD_TABS : SEEKER_UPLOAD_TABS).has(tab as UploadTab);
}
