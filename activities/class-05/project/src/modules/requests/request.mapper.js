// El único puente entre las filas SQL (snake_case) y la representación HTTP que promete el
// contrato (camelCase). Una fila NO es automáticamente la respuesta HTTP.
//
// Nota de la clase 04 que sigue vigente: `BIGINT` vuelve de pg como STRING (pg evita perder
// precisión en enteros de 64 bits). El contrato promete un NUMBER para `id`, así que el mapper
// lo coerciona. Sin esto, el contrato se rompería en silencio.
//
// Novedad de la clase 05: se exponen `createdBy` (dueño de la solicitud) y `changedBy` (actor
// de cada transición). Son datos del contrato, no material sensible.
export function mapRequestRow(row) {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by
  };
}

export function mapHistoryRow(row) {
  return {
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    changedAt: row.changed_at,
    changedBy: row.changed_by
  };
}
