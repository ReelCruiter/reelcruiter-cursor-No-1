/** Fetch resume PDF bytes and return a URL safe for inline preview (no forced download). */
export async function loadResumePdfPreviewSrc(url: string): Promise<string> {
  if (!url) throw new Error("No resume URL");

  if (url.startsWith("blob:") || url.startsWith("data:")) {
    return url.split("#")[0];
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load PDF");

  const blob = await res.blob();
  const pdfBlob =
    blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });

  return URL.createObjectURL(pdfBlob);
}

export function resumePreviewIframeSrc(url: string): string {
  return url.includes("#") ? url : `${url}#view=FitH&toolbar=1`;
}
