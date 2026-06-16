/**
 * Centralised rule for which image to display for a user.
 *
 * In Hiring mode the company logo replaces the personal avatar everywhere
 * (feed posts, job cards, messages, profile, etc.). In Job Seeker mode the
 * personal avatar is used.
 *
 * Always falls back to the personal avatar if the logo isn't set, so old
 * accounts keep showing their photo until they upload a logo.
 */
export interface AvatarSource {
  avatar_url?: string | null;
  company_logo_url?: string | null;
  active_mode?: string | null;
  role?: string | null;
}

export function isHiringProfile(src: AvatarSource | null | undefined): boolean {
  if (!src) return false;
  return (
    src.active_mode === "hiring" ||
    (!src.active_mode && (src.role === "hiring" || src.role === "employer"))
  );
}

export function pickDisplayAvatar(src: AvatarSource | null | undefined): string {
  if (!src) return "";
  const isHiring = isHiringProfile(src);
  if (isHiring && src.company_logo_url) return src.company_logo_url;
  return src.avatar_url || "";
}

/**
 * Variant where the caller has already resolved the post/context as a
 * hiring-side post (e.g. tag === "hiring" or post_kind in hiring/workplace).
 * Useful when displaying author avatars on hiring posts regardless of the
 * author's current mode.
 */
export function pickAvatarForHiringContext(src: AvatarSource | null | undefined): string {
  if (!src) return "";
  if (src.company_logo_url) return src.company_logo_url;
  return src.avatar_url || "";
}
