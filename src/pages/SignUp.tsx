import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatAuthError, oauthEnabled } from "@/lib/authErrors";
import { toast } from "sonner";

const SignUp = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"job_seeker" | "employer" | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      toast.error("Please choose whether you are a job seeker or employer.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/onboarding",
        data: { full_name: fullName, role },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      window.location.replace("/onboarding");
      return;
    }
    toast.success("Check your email for a confirmation link");
    navigate("/verify-email");
  };

  const handleOAuthSignUp = async (provider: "google" | "apple") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + "/onboarding" },
    });
    if (error) {
      const label = provider === "google" ? "Google" : "Apple";
      toast.error(formatAuthError(error, label));
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join as a job seeker or employer. Both sides use video so hiring feels fair from day one."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Already on ReelCruiter?{" "}
          <Link to="/signin" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-12" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password (6+ characters)</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-12 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-primary font-semibold text-sm flex items-center gap-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>I am a</Label>
          <div className="flex gap-3">
            {(["job_seeker", "employer"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-3 px-4 rounded-xl border text-sm font-semibold transition-colors ${
                  role === r ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {r === "job_seeker" ? "Job Seeker" : "Employer"}
              </button>
            ))}
          </div>
          {!role && (
            <p className="text-xs text-muted-foreground">Select one to continue.</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          By clicking Agree & Join, you agree to the ReelCruiter{" "}
          <Link to="/terms" className="text-primary font-semibold hover:underline">User Agreement</Link>,{" "}
          <Link to="/privacy" className="text-primary font-semibold hover:underline">Privacy Policy</Link>, and{" "}
          <Link to="/cookies" className="text-primary font-semibold hover:underline">Cookie Policy</Link>.
        </p>

        <Button type="submit" disabled={loading || !role} className="w-full h-12 rounded-full text-base font-semibold">
          {loading ? "Creating account…" : "Agree & Join"}
        </Button>
      </form>

      {oauthEnabled && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <Button type="button" variant="outline" onClick={() => handleOAuthSignUp("google")} className="w-full h-12 rounded-full gap-3">
            Continue with Google
          </Button>
          <Button type="button" variant="outline" onClick={() => handleOAuthSignUp("apple")} className="w-full h-12 rounded-full gap-3">
            Continue with Apple
          </Button>
        </>
      )}
    </AuthLayout>
  );
};

export default SignUp;
