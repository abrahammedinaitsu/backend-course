# AI usage — Entrega 05B

Uso de IA en «El mundo de la autenticación» (`activities/class-05/frontend/learn/`). La entrega **exige** investigar y
citar fuentes; la IA se usó como apoyo de redacción y de arquitectura de contenido, **no** como
fuente de verdad. Toda afirmación técnica importante se ancló a una fuente primaria o autoritativa
(ver el tema 20 y `content.js`).

## What I asked

1. Organizar los 20 contenidos obligatorios en una estructura que distinga **dato ·
   interpretación · recomendación · decisión**.
2. Proponer al menos tres **interacciones significativas** que transformen el entendimiento (no
   hover ni acordeones decorativos).
3. Redactar las aclaraciones que la especificación pide dejar claras (JWT es formato, decodificar
   no verifica, firmado no es cifrado, OAuth ≠ identidad, API keys identifican apps, authn ≠ authz,
   ocultar botones no protege, no siempre conviene construir auth propio).
4. Un árbol de decisión cuyos nodos apunten a fuentes.

## What the AI proposed

- Cinco interacciones: inspector de JWT, comparador de estrategias, árbol de decisión, matriz
  «autenticación ≠ autorización» y un quiz.
- Etiquetar cada recuadro con su naturaleza (`kind-data`, `kind-interpretation`,
  `kind-recommendation`, `kind-decision`) para que el lector sepa **qué tipo de afirmación** lee.
- Un JWT de **juguete** construido en el cliente (nunca un token real) para el inspector.
- Anclar el árbol de decisión a los mismos criterios que discutimos en el taller.

## What I accepted

- La estructura de etiquetas por naturaleza de afirmación: hace explícito el criterio de la rúbrica.
- El inspector que contrasta **decodificar** (leer) con **verificar** (confiar): ataca directamente
  la confusión más cara.
- La matriz interactiva que refleja **las mismas decisiones del backend** (dueño edita mientras
  está abierta; agent cambia prioridad/estado; lo ajeno responde `404`, no `403`).
- El árbol con dos ramas (construir vs. delegar) y una pregunta de federación.

## What I rejected

- **Un JWT real de ejemplo** (aunque fuera caducado): aunque técnicamente inofensivo, rompe la
  regla de «ejemplos ficticios» y podría confundir. El token del inspector es 100 % inventado.
- **Bibliotecas de terceros** para el árbol/quiz: habrían añadido dependencias y una caja negra.
  Se implementaron con DOM nativo y `textContent`.
- **Afirmaciones sin fuente.** Rechacé párrafos «suenan bien» que no podía anclar; preferí citar
  NIST/OWASP/RFC.
- **Presentar OAuth 2 como forma de login.** La IA lo propuso de pasada; lo corregí: es autorización
  delegada, y la identidad la añade OpenID Connect.

## Security / accuracy mistakes I detected

- Un borrador afirmaba que «un JWT firmado está cifrado». Es **falso** y es una de las confusiones
  que la entrega pide desmontar. Se corrigió con dos recuadros separados.
- Otro borrador recomendaba «guardar el token en localStorage para persistir la sesión». Se reescribió
  señalando el riesgo de XSS (coherente con la decisión real de la entrega 05A: token en memoria).
- Verifiqué que **no** hubiera ningún texto que sugiriera que ocultar botones protege el backend.

## How I verified

- Los 20 temas renderizan (`document.querySelectorAll('.topic').length === 20`), con 22 recuadros,
  3 tablas y 3 grupos de fuentes (19 enlaces).
- Las cinco interacciones se probaron en el navegador: decodificar/verificar, comparador, recorrido
  completo del árbol hasta un resultado, la matriz para Ana/Carla/Bruno y el quiz (6/6).
- **Cero errores de consola** al interactuar.
- `npm run build` genera las tres páginas sin errores.

## What I still do not understand

- Cómo medir que las interacciones **enseñan** y no solo entretienen. No tengo forma objetiva de
  comprobarlo más allá de mi juicio; un test de comprensión real necesitaría usuarios.
- El equilibrio entre profundidad y legibilidad: cada tema podría ser tres veces más largo. No sé
  dónde está el punto correcto sin retroalimentación de lectores.
- Cómo mantener las fuentes frescas con el tiempo (las RFC y las guías de OWASP cambian de versión).
