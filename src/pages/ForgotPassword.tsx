import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Check your email for a reset link");
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email on your account and we'll send you a reset link."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link to="/signin" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="rounded-xl border border-border bg-muted/40 p-6 text-center space-y-3">
          <p className="font-medium text-foreground">Email sent</p>
          <p className="text-sm text-muted-foreground">
            If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
          </p>
          <Button variant="outline" asChild className="mt-2">
            <Link to="/signin">Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-12 rounded-full">
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
