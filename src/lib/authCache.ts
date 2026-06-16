import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

/**
 * Global, in-memory cache for the current Supabase session.
 *
 * Why this exists:
 *   `supabase.auth.getUser()` makes a network call to /auth/v1/user every time.
 *   The previous codebase called it from ~30 hooks/lib helpers, which created an
 *   avalanche of identical requests on every page load. That made the app feel
 *   stuck on "loading" right after sign-in.
 *
 * What this does:
 *   - Calls `getSession()` (storage-only, no network) once on import.
 *   - Subscribes to `onAuthStateChange` once for the whole app.
 *   - Exposes a synchronous `getCurrentUserId()` that returns the cached value,
 *     and `awaitCurrentUserId()` that waits at most one tick for first hydration.
 *   - Provides `useAuth()` for components that need to react to auth changes.
 */

let cachedSession: Session | null = null;
let cachedUser: User | null = null;
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<(s: Session | null) => void>();

const broadcast = () => listeners.forEach((fn) => fn(cachedSession));

const setSession = (s: Session | null) => {
  const prevId = cachedUser?.id ?? null;
  const nextId = s?.user?.id ?? null;
  cachedSession = s;
  cachedUser = s?.user ?? null;
  broadcast();
  // If the signed-in user actually changed (different account, or sign-out)
  // we must wipe per-user client state so the new user does not inherit
  // anything from the previous one (active mode, cached lists, etc).
  if (initialized && prevId !== nextId) {
    try { localStorage.removeItem("hr_active_mode"); } catch {}
    try { sessionStorage.removeItem("hr_pending_profile"); } catch {}
  }
};

/** Hydrate from local storage (no network). Safe to call repeatedly. */
export function initAuthCache(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error && import.meta.env.DEV) {
        // Session hydration failed — user may need to sign in again
      }
      cachedSession = data.session ?? null;
      cachedUser = cachedSession?.user ?? null;
    } catch {
      cachedSession = null;
      cachedUser = null;
    }
    initialized = true;
    broadcast();
  })();

  // Subscribe once for the whole app.
  supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
  });

  return initPromise;
}

// Kick off hydration immediately when this module is imported.
initAuthCache();

export function getCurrentSession(): Session | null {
  return cachedSession;
}

export function getCurrentUser(): User | null {
  return cachedUser;
}

export function getCurrentUserId(): string | null {
  return cachedUser?.id ?? null;
}

/**
 * Wipe every Supabase auth token from localStorage. Call this BEFORE a fresh
 * sign-in so a previous user's refresh token cannot be silently re-used on
 * the next page load.
 */
export async function clearAuthStorage(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* ignore local sign-out errors */
  }
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("sb-") || k.startsWith("supabase."))) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem("hr_active_mode");
  } catch {}
  cachedSession = null;
  cachedUser = null;
}

/**
 * Resolve the current user id once the cache has hydrated from storage.
 * Returns instantly if already initialized. Use this in lib helpers
 * instead of `supabase.auth.getUser()` (which always hits the network).
 */
export async function awaitCurrentUserId(): Promise<string | null> {
  if (initialized) return cachedUser?.id ?? null;
  await initAuthCache();
  return cachedUser?.id ?? null;
}

/** React hook: returns the current user + a "ready" flag. */
export function useAuth() {
  const [session, setSessionState] = useState<Session | null>(cachedSession);
  const [ready, setReady] = useState(initialized);

  useEffect(() => {
    let mounted = true;
    if (!initialized) {
      initAuthCache().then(() => {
        if (!mounted) return;
        setSessionState(cachedSession);
        setReady(true);
      });
    }
    const listener = (s: Session | null) => {
      if (!mounted) return;
      setSessionState(s);
      setReady(true);
    };
    listeners.add(listener);
    return () => {
      mounted = false;
      listeners.delete(listener);
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    userId: session?.user?.id ?? null,
    ready,
  };
}
