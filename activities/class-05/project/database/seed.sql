-- seed.sql
-- Datos de ejemplo · Entrega 04
-- Idempotente-ish: inserta tres solicitudes con su primer evento de historia (NULL -> open).
-- No usa ids explícitos: los genera la base (GENERATED ALWAYS AS IDENTITY).
-- Ejecutar en el SQL Editor DESPUÉS de las migraciones 001 y 002.

WITH nueva AS (
  INSERT INTO requests (title, description, priority, status)
  VALUES
    ('Projector does not turn on',
     'The projector in room 204 shows no image during class.', 'high', 'open'),
    ('Broken chair in the lab',
     'One chair in the computer lab has a loose back rest.', 'medium', 'open'),
    ('Wi-Fi drops in the library',
     'The connection drops every few minutes on the second floor.', 'low', 'open')
  RETURNING id, status
)
INSERT INTO request_status_history (request_id, previous_status, new_status)
SELECT id, NULL, status FROM nueva;
