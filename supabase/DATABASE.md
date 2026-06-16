# ReelCruiter — Supabase Database Reference

**Project ref:** `qubhkwpuqkmezvvphsvw`  
**Source of truth:** `supabase/migrations/` (27 migration files, applied in timestamp order)  
**TypeScript types:** `src/integrations/supabase/types.ts`  
**Last documented:** 2026-06-07

---

## Push schema to Supabase

The schema lives in this repo. It is **not** transferred automatically — you must push it once to your Supabase project.

```powershell
# 1. Authenticate (opens browser)
npx supabase login

# 2. Link this repo to your project
npm run db:link

# 3. Apply all 27 migrations
npm run db:push

# 4. Regenerate TypeScript types from the live schema
npm run db:types

# 5. Verify every table and bucket exists
npm run db:verify
```

### Deploy edge function (account deletion)

```powershell
npm run db:deploy-functions
```

---

## Tables (19)

All tables are in the `public` schema with **Row Level Security (RLS)** enabled.

| Table | Purpose | Key relationships |
|-------|---------|-------------------|
| `profiles` | User profile, employer company fields, active mode | `user_id` → `auth.users` |
| `posts` | Video job posts (hiring + job-seeker) | `user_id` → `auth.users` |
| `experiences` | Work history with optional video | `user_id` → `auth.users` |
| `post_likes` | Likes on posts | `post_id` → `posts`, `user_id` |
| `post_comments` | Comments (supports nested via `parent_id`) | `post_id` → `posts` |
| `comment_likes` | Likes on comments | `comment_id` → `post_comments` |
| `user_follows` | Follow relationships | `follower_id`, `following_id` |
| `notifications` | In-app notifications | `recipient_id`, `actor_id`, optional `post_id` |
| `conversations` | DM threads between two users | `user1_id`, `user2_id`, `role_context` |
| `messages` | Messages within a conversation | `conversation_id` → `conversations` |
| `conversation_deletes` | Per-user conversation hide | `conversation_id`, `user_id` |
| `saved_jobs` | Bookmarked job posts | `user_id`, `post_id` |
| `job_applications` | Applications to hiring posts | `applicant_id`, `post_id`, `status` |
| `user_blocks` | Blocked users | `blocker_user_id`, `blocked_user_id` |
| `user_reports` | User/content reports | `reporter_user_id` |
| `support_messages` | Support contact form submissions | `user_id` |
| `user_skills` | Profile skills list | `user_id` |
| `user_education` | Profile education entries | `user_id` |
| `user_certificates` | Profile certificates | `user_id` |

---

## Storage buckets (3)

| Bucket | Visibility | Used for |
|--------|------------|----------|
| `post-videos` | Private (auth required to read) | Feed and profile video posts |
| `chat-attachments` | Private | Message file attachments |
| `resumes` | Public read | User resume PDF uploads |

Folder convention: `{user_id}/{filename}` — RLS policies enforce ownership by folder name.

---

## Database functions & triggers

| Function | Purpose |
|----------|---------|
| `handle_new_user()` | Auto-creates `profiles` row on `auth.users` insert |
| `update_updated_at_column()` | Sets `updated_at` on profile/post updates |
| `validate_active_mode()` | Ensures `profiles.active_mode` is valid |
| `validate_application_status()` | Validates job application status transitions |
| `validate_post_kind()` | Validates `posts.post_kind` values |
| `validate_address_visibility()` | Validates hiring post address visibility |
| `validate_role_context()` | Validates conversation `role_context` |
| `validate_notification_role_context()` | Validates notification `role_context` |
| `notify_post_like()` | Creates notification on post like |
| `notify_post_comment()` | Creates notification on comment |
| `notify_job_application()` | Creates notification on new application |

**Auth trigger:** `on_auth_user_created` → `handle_new_user()`

**Realtime:** `job_applications` is added to `supabase_realtime` publication.

---

## Migration history

Migrations are applied in filename order. Do not reorder or edit applied migrations.

| # | File | Summary |
|---|------|---------|
| 1 | `20260416104013_...` | `profiles` table, RLS, `handle_new_user`, `update_updated_at_column` |
| 2 | `20260416110036_...` | `user_blocks`, `user_reports` |
| 3 | `20260418075052_...` | `user_follows`, `notifications` |
| 4 | `20260419094510_...` | `support_messages` |
| 5 | `20260419125040_...` | `saved_jobs` |
| 6 | `20260420185855_...` | `conversations`, `messages`, `conversation_deletes`, `chat-attachments` bucket |
| 7 | `20260420185905_...` | Private read policy for chat attachments |
| 8 | `20260426213654_...` | `posts` table, `post-videos` bucket |
| 9 | `20260427003700_...` | `experiences` |
| 10 | `20260427005843_...` | `post-videos` bucket made private |
| 11 | `20260427011011_...` | `post_likes`, `post_comments` |
| 12 | `20260427012908_...` | `comment_likes`, nested comments (`parent_id`) |
| 13 | `20260427013714_...` | `job_applications`, notification triggers |
| 14 | `20260427015608_...` | Application status default + owner update policy |
| 15 | `20260427022321_...` | `profiles.active_mode`, updated `handle_new_user` |
| 16 | `20260427090658_...` | `role_context`, company fields, notification triggers |
| 17 | `20260427102911_...` | **Dev reset** — truncates all data (safe on empty DB) |
| 18 | `20260427113203_...` | Extended post columns (`post_kind`, hiring fields) |
| 19 | `20260427121639_...` | `validate_post_kind()` |
| 20 | `20260427152711_...` | Realtime on `job_applications` |
| 21 | `20260428092333_...` | Post address fields + validation |
| 22 | `20260503130731_...` | `user_skills`, `user_education`, `user_certificates`, `intro_video_url` |
| 23 | `20260514154720_...` | Company website/industry/size on profiles |
| 24 | `20260514160401_...` | `company_logo_url` |
| 25 | `20260522212702_...` | `resume_url`, `resumes` bucket |
| 26 | `20260601030724_...` | Company social links (LinkedIn, Twitter, etc.) |
| 27 | `20260602025234_...` | Company TikTok, YouTube, WhatsApp |

---

## `profiles` columns (final state)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → auth.users, unique |
| `full_name` | text | |
| `bio` | text | |
| `location` | text | |
| `role` | text | `job_seeker` or `employer` (signup default) |
| `active_mode` | text | Current UI mode, default `job_seeker` |
| `avatar_url` | text | |
| `intro_video_url` | text | |
| `resume_url` | text | |
| `company_name` | text | Employer fields |
| `company_description` | text | |
| `company_website` | text | |
| `company_industry` | text | |
| `company_size` | text | |
| `company_logo_url` | text | |
| `company_linkedin` | text | |
| `company_twitter` | text | |
| `company_instagram` | text | |
| `company_facebook` | text | |
| `company_tiktok` | text | |
| `company_youtube` | text | |
| `company_whatsapp` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

## `posts` columns (final state)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → auth.users |
| `tag` | text | `job-seeker` or `hiring` |
| `post_kind` | text | Extended post type |
| `job_title` | text | Required |
| `description` | text | |
| `category` | text | |
| `job_type` | text | full-time, part-time, etc. |
| `salary` | text | |
| `city`, `country` | text | |
| `full_address` | text | Hiring posts |
| `address_visibility` | text | `full`, `area`, or `hidden` |
| `work_arrangement` | text | remote, hybrid, onsite |
| `experience_level` | text | |
| `openings` | integer | |
| `apply_url` | text | |
| `deadline` | date | |
| `immediate_start` | boolean | |
| `desired_role` | text | Job-seeker posts |
| `preferred_location` | text | |
| `is_workplace_video` | boolean | |
| `video_url` | text | Storage path |
| `thumbnail_url` | text | |
| `is_public` | boolean | Default true |
| `hidden_from_feed` | boolean | Default false |
| `created_at`, `updated_at` | timestamptz | |

---

## Edge functions

| Function | Path | Purpose |
|----------|------|---------|
| `delete-account` | `supabase/functions/delete-account/` | Deletes user data + auth account (requires service role) |

---

## Data migration note

These migrations create **schema only** (tables, policies, buckets, functions). They do **not** copy row data from the old Lovable Supabase project (`sialbsdzasadavdhhfsb`).

To migrate existing user/post data from the old project, you would need a separate data export/import (pg_dump, Supabase dashboard export, or custom script). For a fresh start, `db:push` is sufficient.

---

## Verification

After pushing, run:

```powershell
npm run db:verify
```

Expected output: 19 tables ✓ and 3 buckets ✓.
