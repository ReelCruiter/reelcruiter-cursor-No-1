import { Link } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmail() {
  return (
    <AuthLayout
      title="Verify your email"
      subtitle="We sent a confirmation link to your inbox. Click it to activate your account."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Already verified?{" "}
          <Link to="/signin" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <div className="rounded-xl border border-border bg-muted/40 p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Mail className="w-7 h-7 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Check your spam folder if you don&apos;t see the email within a few minutes. The link expires after 24 hours.
        </p>
        <Button variant="outline" asChild className="rounded-full">
          <Link to="/signin">Back to sign in</Link>
        </Button>
      </div>
    </AuthLayout>
  );
}
