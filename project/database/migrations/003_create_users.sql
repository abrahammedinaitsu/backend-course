-- 003 · Users: one row per account. The database generates the UUID and
-- the timestamps; the role can only be one of the two workshop roles and
-- defaults to 'requester' — nobody chooses a role at registration time.
-- Run after 001 and 002.

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'requester',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_role_check
    CHECK (role IN ('requester', 'agent'))
);
