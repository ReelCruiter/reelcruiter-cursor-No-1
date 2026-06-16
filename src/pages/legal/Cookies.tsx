import LegalLayout from "@/components/LegalLayout";

export default function Cookies() {
  return (
    <LegalLayout title="Cookie Policy">
      <p><strong>Last updated:</strong> June 2026</p>
      <p>
        ReelCruiter uses cookies and similar technologies to keep you signed in and remember preferences.
      </p>
      <h2 className="text-xl font-heading font-bold text-foreground pt-4">Essential cookies</h2>
      <p>Authentication tokens stored in local storage so you remain signed in between visits.</p>
      <h2 className="text-xl font-heading font-bold text-foreground pt-4">Preference cookies</h2>
      <p>Theme selection (light/dark) and UI mode preferences may be stored locally on your device.</p>
      <h2 className="text-xl font-heading font-bold text-foreground pt-4">Managing cookies</h2>
      <p>You can clear site data in your browser settings. Clearing auth cookies will sign you out.</p>
    </LegalLayout>
  );
}
