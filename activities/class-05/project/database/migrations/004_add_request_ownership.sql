-- 004 · Ownership: every NEW request records who created it.
--
-- The column stays NULLABLE on purpose: requests created in classes 3-4
-- predate the users table and have no owner. That is a conscious
-- migration decision, not an oversight:
--   * new requests always receive created_by (the service sets it from
--     the authenticated actor, never from the body);
--   * legacy rows with created_by IS NULL are visible ONLY to agents;
--   * a future migration can backfill owners and then add NOT NULL.
-- Run after 003 — the foreign key needs the users table.

ALTER TABLE requests
ADD COLUMN created_by UUID;

-- RESTRICT: a user who owns requests cannot be deleted silently.
ALTER TABLE requests
ADD CONSTRAINT requests_created_by_fk
FOREIGN KEY (created_by)
REFERENCES users(id)
ON DELETE RESTRICT;
