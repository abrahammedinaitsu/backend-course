-- 001_create_requests.sql
-- Migration 001 · Entrega 04
-- La tabla `requests` del proyecto transversal, traducida a SQL.
-- Ejecutar en el SQL Editor de Supabase (este archivo es la fuente de verdad: el editor es
-- solo el ejecutor).
--
-- Cada línea es una decisión de la clase 3 traducida al idioma de la base:
--   * id GENERATED ALWAYS AS IDENTITY -> la base genera el id y RECHAZA ids enviados
--     (retira el contador en memoria, que se reiniciaba con el proceso).
--   * title NOT NULL -> la invariante "nunca existirá una solicitud sin título",
--     ahora inviolable incluso ante un bug del código.
--   * description nullable -> NULL es una decisión: distingue "no se describió".
--   * DEFAULT 'medium' / 'open' -> los mismos valores que promete el contrato HTTP.
--   * TIMESTAMPTZ -> guarda el instante absoluto (con zona), no un reloj ambiguo.
--   * CHECK -> el conjunto cerrado de valores vive junto a los datos.

CREATE TABLE requests (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  priority    VARCHAR(20) NOT NULL DEFAULT 'medium',
  status      VARCHAR(30) NOT NULL DEFAULT 'open',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT requests_priority_check
    CHECK (priority IN ('low', 'medium', 'high')),
  CONSTRAINT requests_status_check
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'cancelled'))
);
