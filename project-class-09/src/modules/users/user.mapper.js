// The single bridge between user rows and their HTTP representation.
// password_hash exists in the row and deliberately does NOT exist here:
// no route can leak what the mapper never exposes.
export function mapUserRow(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at
  };
}
