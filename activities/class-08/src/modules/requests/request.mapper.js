// The single bridge between SQL rows (snake_case) and the HTTP
// representation the contract promises (camelCase). A row is not
// automatically the HTTP response.

export function mapRequestRow(row) {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    createdBy: row.created_by,
    // FEATURE-801: NULL means "nobody is responsible yet". The column
    // arrived in migration 005; exposing it is what makes the claim's
    // result observable.
    assignedTo: row.assigned_to ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapHistoryEventRow(row) {
  // Each event type exposes ONLY its own fields. changed_by stays internal:
  // the contract of FEATURE-206 does not include it.
  if (row.type === 'priority_changed') {
    return {
      id: Number(row.id),
      type: row.type,
      fromPriority: row.from_priority,
      toPriority: row.to_priority,
      createdAt: row.created_at
    };
  }
  // A status_changed event (open -> in_progress) and a request_claimed
  // event (FEATURE-801) share the same shape: they carry a status
  // transition. The claim is a status change with a business meaning.
  return {
    id: Number(row.id),
    type: row.type,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    createdAt: row.created_at
  };
}
