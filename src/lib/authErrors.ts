import type { AuthError } from "@supabase/supabase-js";

export function formatAuthError(error: AuthError | Error, provider?: string): string {
  const message = error.message ?? String(error);
  if (message.includes("provider is not enabled")) {
    const name = provider ?? "OAuth";
    return `${name} sign in is not enabled in Supabase yet. Use email sign in, or enable ${name} under Dashboard → Authentication → Providers.`;
  }
  return message;
}

export const oauthEnabled = import.meta.env.VITE_ENABLE_OAUTH === "true";
