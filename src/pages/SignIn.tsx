import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { clearAuthStorage, useAuth } from "@/lib/authCache";
import { formatAuthError, oauthEnabled } from "@/lib/authErrors";
import { toast } from "sonner";

const POST_LOGIN_PATH = "/feed";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { ready, userId } = useAuth();

  if (ready && userId) {
    return <Navigate to={POST_LOGIN_PATH} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await clearAuthStorage();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        return;
      }
      window.location.replace(POST_LOGIN_PATH);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    await clearAuthStorage();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + POST_LOGIN_PATH },
    });
    if (error) {
      const label = provider === "google" ? "Google" : "Apple";
      toast.error(formatAuthError(error, label));
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your profile, videos, and applications."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          New to ReelCruiter?{" "}
          <Link to="/signup" className="text-primary font-semibold hover:underline">
            Create account
          </Link>
        </p>
      }
    >
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
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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

        <Link to="/forgot-password" className="block text-sm font-semibold text-primary hover:underline">
          Forgot password?
        </Link>

        <Button type="submit" disabled={loading} className="w-full h-12 rounded-full text-base font-semibold">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {oauthEnabled && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <Button type="button" variant="outline" onClick={() => handleOAuthSignIn("google")} className="w-full h-12 rounded-full gap-3">
            Sign in with Google
          </Button>
          <Button type="button" variant="outline" onClick={() => handleOAuthSignIn("apple")} className="w-full h-12 rounded-full gap-3">
            Sign in with Apple
          </Button>
        </>
      )}
    </AuthLayout>
  );
};

export default SignIn;
