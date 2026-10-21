// The one place where a database row becomes the representation the HTTP contract promises.
//
// A row speaks snake_case (the shape of the table); the contract promises camelCase. If we
// returned the row directly, the contract would break silently: every client reading
// `createdAt` would get `undefined`.
//
// A pure function, in a single file. If the representation gains a field or renames one, the
// change lives here — not scattered across handlers.

// requests row -> HTTP representation.
export function mapRequestRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// request_status_history row -> HTTP representation (for GET /requests/:id/history).
export function mapHistoryRow(row) {
  return {
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    changedAt: row.changed_at
  };
}
