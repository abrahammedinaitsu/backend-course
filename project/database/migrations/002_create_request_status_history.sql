-- 002_create_request_status_history.sql
-- Migration 002 · Entrega 04
-- La historia necesita su propia tabla: una columna `status` guarda solo el presente; cada
-- cambio de estado es un HECHO que merece su propia fila (quién estuvo dónde y cuándo).
--
-- Decisiones:
--   * FOREIGN KEY hacia requests -> una fila de historia no puede apuntar a una solicitud
--     inexistente. Primera clave foránea del proyecto: integridad referencial en la base.
--   * previous_status nullable CON razón de dominio: el nacimiento no viene de ningún estado
--     (NULL -> open). NULL con significado documentado es diseño.
--   * Ambos CHECK reutilizan el conjunto cerrado de estados de la clase 3.
--   * changed_at con DEFAULT: el hecho sabe cuándo ocurrió.

CREATE TABLE request_status_history (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id      BIGINT NOT NULL,
  previous_status VARCHAR(30),
  new_status      VARCHAR(30) NOT NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT request_status_history_request_fk
    FOREIGN KEY (request_id) REFERENCES requests(id),
  CONSTRAINT request_status_history_previous_check
    CHECK (previous_status IS NULL OR previous_status IN ('open', 'in_progress', 'resolved', 'closed', 'cancelled')),
  CONSTRAINT request_status_history_new_check
    CHECK (new_status IN ('open', 'in_progress', 'resolved', 'closed', 'cancelled'))
);

-- El historial se consulta siempre por solicitud (GET /requests/:id/history):
-- este índice acompaña esa consulta real. Es el único índice que agrego, y con motivo.
CREATE INDEX request_status_history_request_id_idx
  ON request_status_history (request_id);
