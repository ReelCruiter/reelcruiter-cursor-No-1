import { useState } from "react";
import { Smartphone, X } from "lucide-react";
import { isPushSupported, isStandalonePwa } from "@/lib/pushNotifications";

const DISMISS_KEY = "reelcruiter:pwa-install-dismissed";

/** Hint for iPhone/Android users to install the PWA for reliable push notifications. */
const PushInstallBanner = () => {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed || isStandalonePwa() || !isPushSupported()) return null;

  const isIos =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent || "");

  return (
    <div className="mx-4 mt-3 lg:mx-6 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 flex gap-3 items-start">
      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
        <Smartphone className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0 text-sm">
        <p className="font-semibold text-foreground">Get alerts on your phone</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {isIos
            ? "Tap Share in Safari, then Add to Home Screen. Then turn on push notifications in Settings."
            : "Add ReelCruiter to your home screen, then enable push notifications in Settings for alerts when the app is closed."}
        </p>
      </div>
      <button
        type="button"
        className="p-1 text-muted-foreground hover:text-foreground shrink-0"
        aria-label="Dismiss"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {
            /* ignore */
          }
        }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default PushInstallBanner;
