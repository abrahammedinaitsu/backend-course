-- 005 · Request assignment (FEATURE-801). The schema EVOLVES: we add on
-- top of what exists, we never rewrite an applied migration (001-004 may
-- already live in dozens of databases).

-- Who is responsible for attending the request. NULL means "nobody yet":
-- every existing row stays valid without touching a single record.
ALTER TABLE requests
ADD COLUMN assigned_to UUID REFERENCES users(id);

-- "Requests assigned to me" is the query this column exists for.
CREATE INDEX idx_requests_assigned_to ON requests (assigned_to);

-- The history gains a THIRD event type. The CHECK from migration 003 is
-- replaced by a wider one — replacing a constraint is compatible;
-- rewriting migration 003 is not.
ALTER TABLE request_history
DROP CONSTRAINT request_history_type_check;

ALTER TABLE request_history
ADD CONSTRAINT request_history_type_check
CHECK (type IN ('status_changed', 'priority_changed', 'request_claimed'));

-- NOTE: the foreign key guarantees the user EXISTS — it cannot guarantee
-- the user is an agent. That rule belongs to the application (the claim
-- policy), where roles are known and testable.
