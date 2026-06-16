import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { awaitCurrentUserId } from "@/lib/authCache";

export type UserMode = "hiring" | "job_seeker";

export const MODE_INFO: Record<
  UserMode,
  { label: string; sidebarLabel: string; description: string; icon: "search" | "briefcase" }
> = {
  job_seeker: {
    label: "Looking for work",
    sidebarLabel: "Job seeker",
    description: "Browse roles, apply, and share your video CV",
    icon: "search",
  },
  hiring: {
    label: "Recruiting talent",
    sidebarLabel: "Employer",
    description: "Post jobs, review candidates, and showcase your company",
    icon: "briefcase",
  },
};

const LS_KEY = "hr_active_mode";
const listeners = new Set<(m: UserMode | null) => void>();
let cached: UserMode | null = null;

const readCached = (): UserMode | null => {
  if (cached) return cached;
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === "hiring" || v === "job_seeker") {
      cached = v;
      return v;
    }
  } catch {}
  return null;
};

const writeCached = (m: UserMode | null) => {
  cached = m;
  try {
    if (m) localStorage.setItem(LS_KEY, m);
    else localStorage.removeItem(LS_KEY);
  } catch {}
  listeners.forEach((fn) => fn(m));
};

export async function fetchActiveMode(): Promise<UserMode | null> {
  const userId = await awaitCurrentUserId();
  if (!userId) return null;
  const { data } = await supabase
    .from("profiles")
    .select("active_mode")
    .eq("user_id", userId)
    .maybeSingle();
  const m = (data?.active_mode as UserMode | undefined) ?? null;
  writeCached(m);
  return m;
}

export async function setActiveMode(mode: UserMode): Promise<{ error: string | null }> {
  const userId = await awaitCurrentUserId();
  if (!userId) return { error: "Not signed in" };
  const { error } = await supabase
    .from("profiles")
    .update({ active_mode: mode })
    .eq("user_id", userId);
  if (error) return { error: error.message };
  writeCached(mode);
  return { error: null };
}

export function useUserMode() {
  const [mode, setMode] = useState<UserMode | null>(readCached());
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    const fn = (m: UserMode | null) => setMode(m);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const m = await fetchActiveMode();
      if (cancelled) return;
      setMode(m);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const switchMode = useCallback(async (next: UserMode) => {
    const prev = cached;
    writeCached(next);
    const { error } = await setActiveMode(next);
    if (error) {
      writeCached(prev);
      return { error };
    }
    return { error: null };
  }, []);

  return { mode, loading, switchMode };
}

export function isHiringMode(m: UserMode | null) {
  return m === "hiring";
}

export function isSeekerMode(m: UserMode | null) {
  return m === "job_seeker" || m === null;
}
