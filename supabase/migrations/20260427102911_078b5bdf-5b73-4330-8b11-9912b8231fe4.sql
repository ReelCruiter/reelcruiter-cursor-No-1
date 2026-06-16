-- Development reset: wipe all data, keep schema/auth intact.

TRUNCATE TABLE
  public.comment_likes,
  public.post_comments,
  public.post_likes,
  public.job_applications,
  public.saved_jobs,
  public.notifications,
  public.messages,
  public.conversation_deletes,
  public.conversations,
  public.user_blocks,
  public.user_reports,
  public.user_follows,
  public.experiences,
  public.support_messages,
  public.posts,
  public.profiles
RESTART IDENTITY CASCADE;

DELETE FROM auth.users;
