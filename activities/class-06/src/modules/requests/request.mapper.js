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
  return {
    id: Number(row.id),
    type: row.type,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    createdAt: row.created_at
  };
}
