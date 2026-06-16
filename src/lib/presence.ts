import { supabase } from "@/integrations/supabase/client";

export const ACTIVE_NOW_MS = 5 * 60 * 1000;
const PING_THROTTLE_MS = 60 * 1000;

let lastPingAt = 0;

export async function touchLastActive(userId: string): Promise<void> {
  const now = Date.now();
  if (now - lastPingAt < PING_THROTTLE_MS) return;
  lastPingAt = now;

  const iso = new Date().toISOString();
  await supabase.from("profiles").update({ last_active_at: iso }).eq("user_id", userId);
}

export function isActiveNow(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < ACTIVE_NOW_MS;
}

export function formatLastActive(iso: string | null | undefined): string | null {
  if (!iso) return null;

  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Active now";
  if (diff < 3600) return `Active ${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `Active ${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `Active ${Math.floor(diff / 86400)}d ago`;
  return `Last active on ${new Date(iso).toLocaleDateString()}`;
}
