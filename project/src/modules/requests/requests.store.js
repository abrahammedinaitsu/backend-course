// El store: SQL entra, filas salen. NO habla HTTP (ni 404 ni códigos) y no decide
// transiciones. Devuelve filas o null; el service decide qué significa eso.
//
// Dos hábitos desde la clase 04, que siguen vigentes en la clase 05:
//   * columnas explícitas (nunca `SELECT *`): la representación no debe cambiar sola cuando
//     alguien agrega una columna;
//   * todo valor del cliente viaja como parámetro ($1, $2…) — jamás concatenado en el SQL.
//
// Novedad de la clase 05 (estación 6): la PROPIEDAD vive en el SQL. El filtro por
// `created_by` se agrega al WHERE en vez de traer todo y filtrar en JavaScript — traer filas
// ajenas al proceso ya es un problema antes de mirarlas.
import { pool } from '../../database/pool.js';

// Columnas de `requests`, explícitas y reutilizadas por cada lectura/escritura.
// `created_by` se suma en la clase 05 (migración 004): quién creó la solicitud.
const REQUEST_COLUMNS = `
  id,
  title,
  description,
  priority,
  status,
  created_at,
  updated_at,
  created_by
`;

// SELECT con filtros opcionales. Los valores van parametrizados; el número de parámetro se
// deriva de values.length para que los filtros combinados nunca se desnumeren.
//
// `filters.createdBy` es la propiedad del solicitante: cuando llega, la colección se acota en
// SQL (no en JS). Un requester siempre lo recibe; un agent no (ve todo, incluidas las
// solicitudes heredadas con created_by IS NULL).
export async function findAll(filters = {}, db = pool) {
  const conditions = [];
  const values = [];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  if (filters.priority) {
    values.push(filters.priority);
    conditions.push(`priority = $${values.length}`);
  }
  if (filters.createdBy !== undefined) {
    values.push(filters.createdBy);
    conditions.push(`created_by = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(
    `SELECT ${REQUEST_COLUMNS} FROM requests ${where} ORDER BY id`,
    values
  );
  return result.rows;
}

// Una fila o null. `rows[0] ?? null` hace explícito el caso "no existe": es una respuesta
// válida (el service la traduce a 404) y no una falla de infraestructura.
export async function findById(id, db = pool) {
  const result = await db.query(
    `SELECT ${REQUEST_COLUMNS} FROM requests WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

// Insertar una solicitud y devolver su fila en un solo viaje (RETURNING evita un SELECT
// extra). `status` y las fechas usan los DEFAULT de la tabla ('open', CURRENT_TIMESTAMP).
//
// `createdBy` (clase 05) lo entrega el service tomándolo del actor autenticado — NUNCA del
// body. La columna es nullable por compatibilidad con las filas heredadas (migración 004),
// pero una solicitud nueva siempre nace con dueño.
export async function insertRequest({ title, description, priority, createdBy }, db = pool) {
  const result = await db.query(
    `INSERT INTO requests (title, description, priority, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING ${REQUEST_COLUMNS}`,
    [title, description ?? null, priority ?? 'medium', createdBy ?? null]
  );
  return result.rows[0];
}

// UPDATE parcial armado desde una allowlist de columnas. Los NOMBRES de columna salen de este
// código (nunca del cliente); solo los VALORES van parametrizados.
const UPDATABLE_COLUMNS = ['title', 'description', 'priority', 'status'];

export async function updateRequest(id, changes, db = pool) {
  const assignments = [];
  const values = [];

  for (const column of UPDATABLE_COLUMNS) {
    if (changes[column] !== undefined) {
      values.push(changes[column]);
      assignments.push(`${column} = $${values.length}`);
    }
  }

  // Sin campos actualizables: devolver la fila actual sin correr un UPDATE roto.
  if (assignments.length === 0) {
    return findById(id, db);
  }

  values.push(id);
  const result = await db.query(
    `UPDATE requests
     SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${values.length}
     RETURNING ${REQUEST_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

// Anexar un evento de historia. `previousStatus` puede ser null: el nacimiento (NULL -> open).
// `changedBy` (clase 05) es el actor que produjo el cambio, tomado del token — nunca del body.
// Requiere un cliente a propósito: debe correr dentro de la MISMA transacción que el UPDATE.
//
// INYECCIÓN DE FALLO (solo para la demo de rollback de la Entrega 04): si INJECT_HISTORY_FAILURE
// está activa, lanza un fallo simulado justo aquí — entre el UPDATE y el INSERT de historia —
// para que la transacción deba revertir el cambio de estado ya aplicado. Está APAGADA por
// defecto y es un gancho temporal de demostración, no parte de la lógica real.
export async function insertStatusHistory(requestId, previousStatus, newStatus, changedBy, db = pool) {
  if (process.env.INJECT_HISTORY_FAILURE === 'true') {
    const injected = new Error('Injected failure in history insert (rollback demo)');
    injected.code = '23514'; // parece una violación de CHECK para el manejador de errores
    throw injected;
  }
  await db.query(
    `INSERT INTO request_status_history (request_id, previous_status, new_status, changed_by)
     VALUES ($1, $2, $3, $4)`,
    [requestId, previousStatus, newStatus, changedBy ?? null]
  );
}

// Toda la historia de una solicitud, de la más antigua a la más reciente. Devuelve [] si no hay.
// `changed_by` se suma en la clase 05 (migración 005): quién produjo cada transición.
export async function findHistory(requestId, db = pool) {
  const result = await db.query(
    `SELECT id, request_id, previous_status, new_status, changed_at, changed_by
     FROM request_status_history
     WHERE request_id = $1
     ORDER BY id`,
    [requestId]
  );
  return result.rows;
}
