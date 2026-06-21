import LegalLayout from "@/components/LegalLayout";

export default function Terms() {
  return (
    <LegalLayout title="User Agreement">
      <p><strong>Last updated:</strong> June 2026</p>
      <p>
        By using ReelCruiter, you agree to these terms. ReelCruiter provides a video first platform connecting job seekers and employers.
      </p>
      <h2 className="text-xl font-heading font-bold text-foreground pt-4">Your account</h2>
      <p>You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.</p>
      <h2 className="text-xl font-heading font-bold text-foreground pt-4">Acceptable use</h2>
      <p>You may not post unlawful, discriminatory, harassing, or misleading content. Employers and candidates must provide accurate information about roles and qualifications.</p>
      <h2 className="text-xl font-heading font-bold text-foreground pt-4">Content</h2>
      <p>You retain ownership of videos and content you upload. You grant ReelCruiter a license to host, display, and distribute that content as needed to operate the service.</p>
      <h2 className="text-xl font-heading font-bold text-foreground pt-4">Service communications</h2>
      <p>
        By creating an account, you agree that ReelCruiter may send you activity notifications by email
        and, where your device and browser support it, by push notification. These alerts cover messages,
        followers, applications, likes, comments, and other important activity on the platform.
      </p>
      <p>
        Notifications are turned on by default. You can turn them off at any time in Settings. Push
        notifications also require permission from your operating system or browser; you may decline that
        permission while still using ReelCruiter, and email alerts will continue unless you disable
        notifications in Settings.
      </p>
      <h2 className="text-xl font-heading font-bold text-foreground pt-4">Limitation of liability</h2>
      <p>ReelCruiter is provided &ldquo;as is.&rdquo; We are not responsible for hiring decisions made by users of the platform.</p>
    </LegalLayout>
  );
}
