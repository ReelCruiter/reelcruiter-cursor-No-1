type ResumePdfViewerProps = {
  url: string;
  fileName: string;
};

/** Native browser PDF view inside the preview dialog (stable, supports pinch zoom on mobile). */
const ResumePdfViewer = ({ url, fileName }: ResumePdfViewerProps) => {
  const src = url.includes("#") ? url : `${url}#view=FitH&toolbar=1`;

  return (
    <iframe
      src={src}
      title={fileName}
      className="w-full flex-1 min-h-0 border-0 bg-muted/30"
    />
  );
};

export default ResumePdfViewer;
