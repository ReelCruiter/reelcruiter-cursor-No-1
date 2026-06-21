import LegalLayout from "@/components/LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p><strong>Last updated:</strong> June 2026</p>
      <p>
        ReelCruiter respects your privacy. This policy describes what data we collect and how we use it.
      </p>
      <h2 className="text-xl font-heading font-bold text-foreground pt-4">Data we collect</h2>
      <p>Account information (name, email), profile data, videos you upload, messages, and usage data necessary to operate the service.</p>
      <h2 className="text-xl font-heading font-bold text-foreground pt-4">How we use data</h2>
      <p>To provide hiring features, authenticate users, improve the product, and communicate about your account.</p>
      <h2 className="text-xl font-heading font-bold text-foreground pt-4">Sharing</h2>
      <p>Profile and video content you mark as public is visible to other users. We use Supabase for secure data storage and do not sell personal data.</p>
      <h2 className="text-xl font-heading font-bold text-foreground pt-4">Notifications</h2>
      <p>
        We send email and push notifications about activity on your account, such as messages, new
        followers, job applications, likes, and comments. When you sign up, you consent to these
        service communications as described in our User Agreement. Notifications are enabled by default;
        you may opt out anytime under Settings → Notifications.
      </p>
      <p>
        For push notifications, we store a device subscription identifier and use it only to deliver
        alerts you have not opted out of. Your browser or device may ask for separate permission before
        push alerts can be shown.
      </p>
      <h2 className="text-xl font-heading font-bold text-foreground pt-4">Your rights</h2>
      <p>You may update your profile, export data, or delete your account from Settings.</p>
    </LegalLayout>
  );
}
