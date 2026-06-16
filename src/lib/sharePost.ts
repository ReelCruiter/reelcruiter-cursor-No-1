import { toast } from "sonner";
import type { VideoPost } from "@/lib/models";

const APP_NAME = "ReelCruiter";

export function postShareUrl(postId: string): string {
  return `${window.location.origin}/post/${postId}`;
}

/**
 * Opens the native device share sheet (Web Share API) when available.
 * Only falls back to copying the link if the Web Share API is unsupported
 * or the browser rejects the share for non-user-cancel reasons.
 */
export async function sharePost(
  post: Pick<VideoPost, "id" | "jobTitle" | "description" | "userName">,
) {
  const url = postShareUrl(post.id);
  const title = post.jobTitle || `Check out this post on ${APP_NAME}`;
  const text = post.description
    ? `${title} on ${APP_NAME}\n${post.description.slice(0, 140)}`
    : `${title} on ${APP_NAME}`;
  const shareData: ShareData = { title, text, url };

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(shareData);
      return;
    } catch (err) {
      const name = (err as DOMException)?.name;
      // User dismissed the native sheet — do nothing, do NOT copy.
      if (name === "AbortError" || name === "CanceledError") return;
      // Real failure (NotAllowed in iframes, SecurityError, etc.) → fall through to clipboard.
      console.warn("[sharePost] navigator.share failed, falling back to clipboard", err);
    }
  }

  await copyPostLink(post.id);
}

export async function copyPostLink(postId: string) {
  const url = postShareUrl(postId);
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  } catch {
    toast.error("Could not copy link");
  }
}