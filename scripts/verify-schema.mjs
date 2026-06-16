/**
 * Verifies that all ReelCruiter tables exist on the linked Supabase project.
 * Usage: node scripts/verify-schema.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const TABLES = [
  "profiles",
  "posts",
  "experiences",
  "post_likes",
  "post_comments",
  "comment_likes",
  "user_follows",
  "notifications",
  "conversations",
  "messages",
  "conversation_deletes",
  "saved_jobs",
  "support_messages",
  "user_blocks",
  "user_reports",
  "job_applications",
  "user_skills",
  "user_education",
  "user_certificates",
];

const BUCKETS = ["post-videos", "chat-attachments", "resumes"];

function loadEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) {
    throw new Error("Missing .env file. Copy .env.example and fill in Supabase values.");
  }
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function tableExists(url, key, table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=0`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (res.ok) return { table, ok: true };
  const body = await res.text();
  return { table, ok: false, status: res.status, body };
}

async function listBuckets(url, key) {
  const res = await fetch(`${url}/storage/v1/bucket`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!res.ok) return { ok: false, status: res.status, names: [] };
  const data = await res.json();
  const names = Array.isArray(data) ? data.map((b) => b.name ?? b.id) : [];
  return { ok: true, names };
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

console.log(`Checking Supabase project: ${env.VITE_SUPABASE_PROJECT_ID ?? url}\n`);

const tableResults = await Promise.all(TABLES.map((t) => tableExists(url, key, t)));

let bucketNames = [];
const bucketList = await listBuckets(url, key);
if (bucketList.ok && bucketList.names.length > 0) {
  bucketNames = bucketList.names;
} else {
  try {
    const out = execSync("npx supabase storage ls --experimental", {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    bucketNames = out
      .split(/\r?\n/)
      .map((line) => line.replace(/\/$/, "").trim())
      .filter(Boolean);
  } catch {
    bucketNames = [];
  }
}

const bucketResults = BUCKETS.map((bucket) => ({
  bucket,
  ok: bucketNames.includes(bucket),
}));

const missingTables = tableResults.filter((r) => !r.ok);
const missingBuckets = bucketResults.filter((r) => !r.ok);

console.log("Tables:");
for (const r of tableResults) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.table}${r.ok ? "" : ` (${r.status})`}`);
}

console.log("\nStorage buckets:");
for (const r of bucketResults) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.bucket}${r.ok ? "" : ` (${r.status})`}`);
}

if (missingTables.length || missingBuckets.length) {
  console.log("\nSchema incomplete. Push migrations:");
  console.log("  npx supabase login");
  console.log("  npm run db:link");
  console.log("  npm run db:push");
  process.exit(1);
}

console.log("\nAll tables and storage buckets are present.");
