-- 004 · Value constraints and indexes. Separated on purpose so you can see
-- how an existing schema EVOLVES with ALTER TABLE instead of being rebuilt.

ALTER TABLE requests
ADD CONSTRAINT requests_priority_check
CHECK (priority IN ('low', 'medium', 'high'));

ALTER TABLE requests
ADD CONSTRAINT requests_status_check
CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'cancelled'));

ALTER TABLE request_history
ADD CONSTRAINT request_history_status_values_check
CHECK (
  (from_status IS NULL OR from_status IN ('open', 'in_progress', 'resolved', 'closed', 'cancelled')) AND
  (to_status IS NULL OR to_status IN ('open', 'in_progress', 'resolved', 'closed', 'cancelled'))
);

ALTER TABLE request_history
ADD CONSTRAINT request_history_priority_values_check
CHECK (
  (from_priority IS NULL OR from_priority IN ('low', 'medium', 'high')) AND
  (to_priority IS NULL OR to_priority IN ('low', 'medium', 'high'))
);

-- A requester's list is always scoped by owner; agents filter by status.
CREATE INDEX idx_requests_created_by ON requests (created_by);
CREATE INDEX idx_requests_status ON requests (status);

-- The history read is "all events of one request, in chronological order":
-- this index matches that exact access pattern (including the tie-breaker).
CREATE INDEX idx_request_history_request_order
ON request_history (request_id, created_at, id);
