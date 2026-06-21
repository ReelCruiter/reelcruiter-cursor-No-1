/** iPhone, iPad, and iPadOS desktop mode. */
export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Clean PDF URL for native open (no iframe hash params). */
export function resumePreviewUrl(url: string): string {
  return url.split("#")[0];
}

/** Open PDF in the device native viewer (Safari Quick Look, Notes, etc.). */
export function openResumePreview(url: string): void {
  window.location.assign(resumePreviewUrl(url));
}
