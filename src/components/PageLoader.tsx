import { Loader2 } from "lucide-react";

const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden />
    <span className="sr-only">Loading page</span>
  </div>
);

export default PageLoader;
