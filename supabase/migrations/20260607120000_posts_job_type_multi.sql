-- Open-to-work posts can store multiple availability types (comma-separated).
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_job_type_check;

ALTER TABLE public.posts ADD CONSTRAINT posts_job_type_check CHECK (
  job_type IS NULL
  OR job_type ~ '^(full-time|part-time|contract|freelance|internship)(,(full-time|part-time|contract|freelance|internship))*$'
);
