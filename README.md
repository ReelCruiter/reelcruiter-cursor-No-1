# ReelCruiter

Video-first hiring platform — job seekers showcase skills on camera; employers post roles and review applications with more context.

## Quick start

```bash
npm install
cp .env.example .env   # add your Supabase credentials
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

## Database

```bash
npx supabase login
npm run db:link
npm run db:push
npm run db:verify
```

See [supabase/DATABASE.md](./supabase/DATABASE.md) and [cursor-migration.md](./cursor-migration.md) for full setup.

## Stack

- React 18 + TypeScript + Vite
- Supabase (Auth, Postgres, Storage)
- shadcn/ui + Tailwind CSS
- TanStack Query + Zustand

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (port 8080) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
