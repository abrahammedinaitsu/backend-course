// Acceso a datos de usuarios, con el mismo patrón que requests.store.js: consultas
// parametrizadas, filas entran y filas salen, `db` opcional para transacciones.
//
// Contratos SQL objetivo:
//   findByEmail(email)          SELECT ... WHERE email = $1      -> fila | null
//   findById(id)                SELECT ... WHERE id = $1         -> fila | null
//   insertUser({ email, passwordHash })
//       INSERT INTO users (email, password_hash) VALUES ($1, $2)
//       RETURNING ...                                            -> fila
//
// Decisiones que ya tomó la migración 003:
//   * id, role y created_at los genera la base;
//   * `role` NO es un parámetro de insertUser — el registro no puede elegirlo. Lo que la
//     función no acepta, ninguna capa puede filtrarlo por error: el DEFAULT de la base decide.
import { pool } from '../../database/pool.js';

// Columnas explícitas. password_hash viaja al mapper, que decide no exponerlo.
const USER_COLUMNS = 'id, email, role, created_at';

export async function findByEmail(email, db = pool) {
  const result = await db.query(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0] ?? null;
}

export async function findById(id, db = pool) {
  const result = await db.query(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function insertUser({ email, passwordHash }, db = pool) {
  // La base genera id, role ('requester' por DEFAULT) y created_at.
  const result = await db.query(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     RETURNING ${USER_COLUMNS}`,
    [email, passwordHash]
  );
  return result.rows[0];
}
