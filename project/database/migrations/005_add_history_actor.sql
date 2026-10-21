-- 005 · History actor: every NEW transition records who produced it.
-- Nullable for the same legacy reason as created_by: transitions recorded
-- before class 5 have no actor. New transitions always set changed_by
-- from the authenticated actor — the value never comes from the body.
-- Run after 003.

ALTER TABLE request_status_history
ADD COLUMN changed_by UUID;

ALTER TABLE request_status_history
ADD CONSTRAINT request_status_history_changed_by_fk
FOREIGN KEY (changed_by)
REFERENCES users(id)
ON DELETE RESTRICT;
