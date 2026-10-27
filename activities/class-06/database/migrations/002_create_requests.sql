-- 002 · Requests: the core resource. Every request has an owner, so this
-- migration REQUIRES 001 (the foreign key needs the users table).

CREATE TABLE requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT requests_created_by_fk
    FOREIGN KEY (created_by)
    REFERENCES users(id)
    ON DELETE RESTRICT
);
