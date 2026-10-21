// El único puente entre las filas de usuario y su representación HTTP.
// Contrato: mapUserRow(row) -> { id, email, role, createdAt }
//
// La fila también trae password_hash. Todo el sentido de este mapper es que el hash NO
// sobreviva al cruce: ninguna ruta puede filtrar lo que el mapper nunca expone. Nada de
// spread (`{ ...row }`) — eso sería justo el descuido que deja salir el hash.
export function mapUserRow(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at
  };
}
