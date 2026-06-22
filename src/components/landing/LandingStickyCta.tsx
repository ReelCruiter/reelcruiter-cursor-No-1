import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function LandingStickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-background/90 border-t border-border backdrop-blur-md md:hidden shadow-[0_-8px_30px_hsl(var(--primary)/0.08)]">
      <Button asChild className="w-full h-12 rounded-full text-base font-semibold shadow-lg shadow-primary/25">
        <Link to="/signup">Create your profile</Link>
      </Button>
    </div>
  );
}
