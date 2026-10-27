-- 003 · Request history: one row per change event. Two event types:
--   status_changed   -> uses from_status / to_status
--   priority_changed -> uses from_priority / to_priority
-- from_status IS NULL marks the birth event (the request was created).
-- Requires 002 (the foreign key needs the requests table).

CREATE TABLE request_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id BIGINT NOT NULL,
  type TEXT NOT NULL,
  from_status VARCHAR(30),
  to_status VARCHAR(30),
  from_priority VARCHAR(20),
  to_priority VARCHAR(20),
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT request_history_request_fk
    FOREIGN KEY (request_id)
    REFERENCES requests(id),
  CONSTRAINT request_history_changed_by_fk
    FOREIGN KEY (changed_by)
    REFERENCES users(id),
  CONSTRAINT request_history_type_check
    CHECK (type IN ('status_changed', 'priority_changed'))
);
