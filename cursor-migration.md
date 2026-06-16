# ReelCruiter — Cursor Migration Guide

This document explains what this codebase is, how it is organized, and how to disconnect it from [Lovable.dev](https://lovable.dev) so you can develop and deploy it independently in Cursor (or any local IDE).

---

## What is ReelCruiter?

**ReelCruiter** is a video-first hiring platform. Job seekers post experience and profile videos; employers post hiring videos and review applications. The app supports:

- Email/password and OAuth sign-in (Google, Apple)
- Dual user modes: **job seeker** and **employer** (hiring)
- Video posts, likes, comments, follows, notifications
- Direct messaging with attachments
- Job applications, saved jobs, and employer job management
- User profiles with skills, education, certificates, and experiences

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite 5 |
| Routing | React Router v6 |
| UI | shadcn/ui (Radix primitives), Tailwind CSS, Lucide icons |
| State / data fetching | TanStack React Query, Zustand, module-level caches in `src/lib/` |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Testing | Vitest, Testing Library |
| Animation | Framer Motion |

**Dev server:** Vite runs on **port 8080** (configured in `vite.config.ts`).

---

## Project Structure

```
reelcruiter-for-cursor-main/
├── src/
│   ├── main.tsx              # App entry; initializes auth cache
│   ├── App.tsx               # Routes and global providers
│   ├── pages/                # Route-level screens
│   ├── components/           # App components + shadcn/ui primitives
│   ├── hooks/                # Shared React hooks
│   ├── lib/                  # Business logic, Supabase data access, utilities
│   ├── integrations/
│   │   ├── supabase/         # Supabase client + generated DB types
│   │   └── lovable/          # ⚠️ Lovable-only OAuth wrapper (remove)
│   ├── assets/               # Static images (logo, etc.)
│   └── test/                 # Vitest setup
├── supabase/
│   ├── migrations/           # SQL schema, RLS policies, storage buckets
│   ├── functions/            # Edge Functions (e.g. delete-account)
│   └── config.toml           # Supabase project ID
├── public/                   # Static public assets
├── .env                      # Supabase env vars (VITE_*)
├── vite.config.ts
├── tailwind.config.ts
├── components.json           # shadcn/ui config
└── package.json
```

---

## Application Architecture

### Routing (`src/App.tsx`)

| Path | Page | Auth required |
|------|------|---------------|
| `/` | Index — redirects to `/signup` or `/feed` | No |
| `/signup`, `/signin` | Registration and login | No |
| `/feed` | Main video feed | Yes |
| `/profile` | Current user's profile | Yes |
| `/upload` | Create a video post | Yes |
| `/messages` | Messaging inbox | Yes |
| `/notifications` | Notifications | Yes |
| `/post/:id` | Post detail | No |
| `/user/:userId` | Public user profile | No |
| `/settings` | Account settings | Yes |
| `/saved` | Saved jobs | Yes |
| `/applications` | Job seeker applications | Yes |
| `/my-jobs` | Employer job posts | Yes |
| `/my-jobs/:postId/applications` | Applications for a job | Yes |

Protected routes use `RequireAuth` (`src/components/RequireAuth.tsx`), which redirects unauthenticated users to `/signin`.

### Auth (`src/lib/authCache.ts`)

A global in-memory auth cache avoids dozens of redundant `getUser()` network calls on page load. It:

- Hydrates from `supabase.auth.getSession()` once on import
- Subscribes to `onAuthStateChange` for the whole app
- Exposes `useAuth()`, `getCurrentUserId()`, and `awaitCurrentUserId()`

Email/password auth already uses Supabase directly. **Only Google/Apple OAuth goes through Lovable.**

### Data layer (`src/lib/`)

Business logic lives in focused modules that talk to Supabase:

| Module | Responsibility |
|--------|----------------|
| `posts.ts` | Video posts (create, fetch, storage upload) |
| `applications.ts` | Job applications |
| `messaging.ts` | Conversations and messages |
| `follows.ts` | Follow/unfollow |
| `interactions.ts` | Likes and comments |
| `experiences.ts` | Work experience entries |
| `profileStore.ts` | Profile read/update |
| `savedJobs.ts` | Saved job bookmarks |
| `notificationsCount.ts` | Notification counts |
| `userMode.ts` | Hiring vs job-seeker mode switch |
| `videoCompress.ts`, `videoUrl.ts` | Client-side video handling |
| `mockData.ts` | Shared TypeScript types and shapes |

### Supabase backend

**Database tables** (from migrations): `profiles`, `posts`, `experiences`, `post_likes`, `post_comments`, `comment_likes`, `user_follows`, `notifications`, `conversations`, `messages`, `conversation_deletes`, `saved_jobs`, `job_applications`, `user_blocks`, `user_reports`, `support_messages`, `user_skills`, `user_education`, `user_certificates`.

**Storage buckets:** `post-videos`, `chat-attachments`, `resumes` (private buckets with RLS).

**Edge Functions:** `delete-account` — server-side account deletion using the service role key.

**Generated types:** `src/integrations/supabase/types.ts` (regenerate after schema changes).

---

## Lovable Dependencies (What to Remove)

Lovable left a small footprint. Everything else (React, Vite, Supabase, shadcn) is standard and portable.

| Item | Location | Purpose | Action |
|------|----------|---------|--------|
| `@lovable.dev/cloud-auth-js` | `package.json` | Proxies OAuth through Lovable's cloud auth | **Remove** — use Supabase OAuth |
| `lovable-tagger` | `package.json`, `vite.config.ts` | Tags components for the Lovable editor | **Remove** — dev-only, not needed locally |
| `src/integrations/lovable/index.ts` | Auto-generated | Wraps OAuth + sets Supabase session | **Delete** after migrating OAuth |
| `SignIn.tsx`, `SignUp.tsx` | Import `lovable` for Google/Apple | OAuth entry points | **Update** to use `supabase.auth.signInWithOAuth` |
| `index.html` | OG/Twitter images | Points to `lovable.dev` CDN | **Replace** with your own image URLs |
| `README.md` | Placeholder | Lovable boilerplate | **Rewrite** for your project |
| `bun.lock` | Lockfile | May reference Lovable's npm proxy | **Optional** — delete and use `npm` + `package-lock.json` |

**Not Lovable-specific (keep):**

- `@supabase/supabase-js` — your real backend
- `src/integrations/supabase/client.ts` — standard Supabase client
- All `supabase/migrations/` — your schema
- shadcn/ui components — industry-standard, not Lovable-owned

---

## Database Setup (Required)

The app expects **19 tables**, **3 storage buckets**, and **1 edge function** on Supabase. Schema is defined in `supabase/migrations/` (27 files). Full reference: **`supabase/DATABASE.md`**.

**Current project:** `qubhkwpuqkmezvvphsvw`

Push the schema (one-time, requires Supabase login):

```powershell
npx supabase login
npm run db:link
npm run db:push
npm run db:types
npm run db:verify
```

`npm run db:verify` checks all tables and buckets. If any show ✗, migrations have not been applied yet.

> **Note:** Migrations create schema only — they do not copy data from the old Lovable Supabase project. See `supabase/DATABASE.md` for a data migration note.

---

## Step-by-Step: Disconnect from Lovable

### Phase 1 — Get the app running locally (minimal changes)

You can run the app **before** removing Lovable packages. Email/password auth and most features work with only Supabase env vars.

#### 1. Prerequisites

- **Node.js 18+** (20 LTS recommended)
- **npm** (comes with Node)
- Optional: [Supabase CLI](https://supabase.com/docs/guides/cli) if you want a fully local backend

#### 2. Install dependencies

```bash
cd reelcruiter-for-cursor-main
npm install
```

> If you hit issues with `bun.lock`, delete `bun.lock` and run `npm install` again so `package-lock.json` is the single source of truth.

#### 3. Environment variables

Copy `.env.example` to `.env` and fill in your Supabase project values:

```env
VITE_SUPABASE_PROJECT_ID="qubhkwpuqkmezvvphsvw"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
VITE_SUPABASE_URL="https://qubhkwpuqkmezvvphsvw.supabase.co"
```

**Recommended:** Create `.env.example` with placeholder values, add `.env` to `.gitignore`, and never commit real keys.

The client reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `src/integrations/supabase/client.ts`.

#### 4. Start the dev server

```bash
npm run dev
```

Open **http://localhost:8080**.

#### 5. Verify core flows

- [ ] Landing page redirects to `/signup`
- [ ] Email sign-up and sign-in work
- [ ] Feed loads after login
- [ ] Profile and settings are reachable

Google/Apple buttons may still work via Lovable's proxy until Phase 2 — or may fail if Lovable disconnects the project.

---

### Phase 2 — Remove Lovable packages and tooling

#### 6. Remove `lovable-tagger` from Vite

Edit `vite.config.ts`:

```diff
- import { componentTagger } from "lovable-tagger";
  ...
- plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
+ plugins: [react()],
```

#### 7. Uninstall Lovable npm packages

```bash
npm uninstall @lovable.dev/cloud-auth-js lovable-tagger
```

#### 8. Replace OAuth with native Supabase auth

**Configure providers in Supabase Dashboard** (Authentication → Providers):

- Enable **Google** and/or **Apple**
- Add redirect URLs:
  - `http://localhost:8080/**`
  - Your production domain (e.g. `https://yourdomain.com/**`)

**Update `SignIn.tsx` and `SignUp.tsx`** — replace Lovable calls with Supabase:

```typescript
// Before (Lovable)
import { lovable } from "@/integrations/lovable/index";
const result = await lovable.auth.signInWithOAuth("google", {
  redirect_uri: window.location.origin + from,
});

// After (Supabase)
const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: window.location.origin + from,
  },
});
if (error) {
  toast({ title: "Google sign in failed", description: error.message, variant: "destructive" });
}
```

Do the same for Apple (`provider: "apple"`). OAuth redirects the browser; you do not need to handle `result.redirected` manually — Supabase handles the redirect flow.

#### 9. Delete the Lovable integration folder

```bash
rm -rf src/integrations/lovable
```

Remove any remaining imports of `@/integrations/lovable`.

#### 10. Clean up branding

In `index.html`, replace Lovable OG/Twitter image URLs with your own assets (e.g. `/og-image.png` in `public/`).

Update `README.md` with project-specific setup instructions.

---

### Phase 3 — Own your Supabase project

The bundled `.env` points at the Supabase project Lovable created. For full independence:

#### Option A — Keep the existing Supabase project (fastest)

1. In [Supabase Dashboard](https://supabase.com/dashboard), open project `sialbsdzasadavdhhfsb` (or your project ID from `.env`).
2. Ensure you have **owner access** (transfer ownership from Lovable if needed).
3. Rotate the **anon key** if the repo was ever shared publicly.
4. Configure OAuth providers and redirect URLs (Phase 2, step 8).
5. Deploy the `delete-account` edge function if not already deployed:

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_ID
   npx supabase functions deploy delete-account
   ```

#### Option B — New Supabase project (full reset)

1. Create a new project at [supabase.com](https://supabase.com).
2. Install and link Supabase CLI:

   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref YOUR_NEW_PROJECT_ID
   ```

3. Apply all migrations:

   ```bash
   supabase db push
   ```

4. Update `.env` with the new project's URL and anon key.
5. Regenerate TypeScript types:

   ```bash
   supabase gen types typescript --linked > src/integrations/supabase/types.ts
   ```

6. Configure Auth (email confirmation on/off, OAuth providers, site URL = `http://localhost:8080`).
7. Deploy edge functions (`supabase functions deploy delete-account`).

---

### Phase 4 — Production readiness

#### 11. Build and preview

```bash
npm run build
npm run preview
```

#### 12. Lint and test

```bash
npm run lint
npm test
```

#### 13. Deployment

This is a static Vite SPA. Deploy the `dist/` folder to Vercel, Netlify, Cloudflare Pages, etc.

Set the same `VITE_*` env vars in your hosting provider. Add your production URL to Supabase **Authentication → URL Configuration** (Site URL and Redirect URLs).

#### 14. Security checklist

- [ ] `.env` is in `.gitignore` and not committed
- [ ] Only the **anon** key is in the frontend (never the service role key)
- [ ] Supabase RLS policies are enabled (already defined in migrations)
- [ ] OAuth redirect URLs are restricted to your domains
- [ ] Storage buckets remain private where migrations set `public = false`

---

## npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on port 8080 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve production build locally |
| `npm run lint` | ESLint |
| `npm test` | Run Vitest once |
| `npm run test:watch` | Vitest in watch mode |

---

## Key Files Reference

| File | Role |
|------|------|
| `src/integrations/supabase/client.ts` | Supabase client singleton |
| `src/lib/authCache.ts` | Global session cache and `useAuth` hook |
| `src/components/RequireAuth.tsx` | Route guard |
| `src/lib/posts.ts` | Post CRUD and video uploads |
| `supabase/migrations/*.sql` | Database schema source of truth |
| `supabase/functions/delete-account/index.ts` | Account deletion API |
| `vite.config.ts` | Vite config, `@/` path alias, port 8080 |

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| Blank page / Supabase errors | Missing or wrong `.env` | Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` |
| OAuth redirect loop | Redirect URL not whitelisted | Add `http://localhost:8080/**` in Supabase Auth settings |
| Google/Apple sign-in fails after migration | Provider not configured | Enable provider in Supabase + set client IDs/secrets |
| Videos won't play | Private storage bucket | App uses signed URLs via `SecureVideo` — ensure user is authenticated |
| `npm install` errors with bun.lock | Mixed package managers | Delete `bun.lock`, use `npm install` |
| Port already in use | Another process on 8080 | Change `server.port` in `vite.config.ts` or stop the other process |

---

## Migration Checklist

Use this as a quick tracker:

- [ ] `npm install` && `npm run dev` works on localhost:8080
- [ ] Email sign-up / sign-in verified
- [ ] Removed `lovable-tagger` from `vite.config.ts`
- [ ] Uninstalled `@lovable.dev/cloud-auth-js` and `lovable-tagger`
- [ ] Replaced OAuth in `SignIn.tsx` and `SignUp.tsx` with `supabase.auth.signInWithOAuth`
- [ ] Deleted `src/integrations/lovable/`
- [ ] Updated `index.html` social preview images
- [ ] Confirmed Supabase project ownership and rotated keys if needed
- [ ] OAuth providers configured with correct redirect URLs
- [ ] `delete-account` edge function deployed
- [ ] `.env` gitignored; `.env.example` added
- [ ] `npm run build` succeeds
- [ ] Production deployment configured

---

## Working in Cursor

Once migrated, this repo is a standard Vite + React + Supabase project. Suggested Cursor setup:

1. Open the project folder in Cursor.
2. Keep `.env` local; reference `.env.example` for required vars.
3. Use the integrated terminal for `npm run dev`.
4. Point the browser MCP or your own browser at `http://localhost:8080` for UI testing.
5. After schema changes, run `supabase db push` and regenerate `types.ts`.

No Lovable account, CLI, or hosting is required after this migration.
