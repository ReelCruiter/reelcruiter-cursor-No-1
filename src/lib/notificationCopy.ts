export type AppNotificationType = "follow" | "message" | "like" | "comment" | "application";

export function notificationHeadline(type: AppNotificationType, actorName: string): string {
  switch (type) {
    case "follow":
      return `${actorName} started following you`;
    case "message":
      return `${actorName} sent you a message`;
    case "like":
      return `${actorName} liked your post`;
    case "comment":
      return `${actorName} commented on your post`;
    case "application":
      return `${actorName} applied to your job`;
  }
}

export function notificationPath(
  type: AppNotificationType,
  actorId: string,
  postId: string | null,
): string {
  if (type === "message") return `/messages?to=${actorId}`;
  if (type === "application") return postId ? `/my-jobs/${postId}/applications` : "/my-jobs";
  if ((type === "like" || type === "comment") && postId) return `/post/${postId}`;
  return `/user/${actorId}`;
}
