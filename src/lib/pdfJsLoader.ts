let pdfJsModule: Promise<typeof import("pdfjs-dist")> | null = null;

export async function getPdfJs() {
  if (!pdfJsModule) {
    pdfJsModule = (async () => {
      const pdfjs = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    })();
  }
  return pdfJsModule;
}

export type PdfTextItem = {
  str: string;
  transform: number[];
  width?: number;
  height?: number;
};
