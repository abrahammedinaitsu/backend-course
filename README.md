# Backend Course

Repositorio de la materia **Desarrollo Backend** del ITSU, correspondiente
al tercer trimestre.

**Estudiante:** Abraham Medina · `abrahammedina.itsu@gmail.com`

Este repositorio reúne el progreso del curso por clase. Cada actividad
incluye sus instrucciones, materiales, evidencia y, cuando corresponde, el
proyecto ejecutable. Una entrega debe quedar registrada en Git y publicada
en el repositorio remoto.

## Descripción

Curso teórico-práctico sobre el funcionamiento de una aplicación web: desde
el recorrido de una petición HTTP hasta el diseño de APIs, la persistencia,
la autenticación, la autorización, las pruebas y la observabilidad.

**Stack:** JavaScript, Node.js, Express, PostgreSQL, Git y GitHub.

## Índice de actividades

| Clase | Entrega | Contenido principal | Tag |
| --- | --- | --- | --- |
| [01](activities/class-01/) | El viaje de una petición | Servidores HTTP con Node.js, ciclo petición-respuesta y diagnóstico de fallas. | `class-01-submission` |
| [02](activities/class-02/) | HTTP como contrato | Análisis de la API Lite y construcción de la API Full con contrato HTTP. | `class-02-lite-analysis` · `class-02-submission` |
| [03](activities/class-03/) | Recursos, estado y reglas | Diseño de recursos, máquina de estados, `PATCH`, filtros y errores. | `class-03-design` · `class-03-submission` |
| [04](activities/class-04/) | De SQL al backend persistente | PostgreSQL, transacciones, historial de estados y rollback. | `class-04-design` · `class-04-submission` |
| [05](activities/class-05/) | Seguridad, identidad y frontend | Registro, contraseñas, JWT, propiedad, permisos y entregas de frontend 05A/05B. | `class-05-access-design` · `class-05-submission` |
| [06](activities/class-06/) | Primer ticket en backend existente | BUG-106 y FEATURE-206: colección vacía e historial de solicitudes. | `class-06-submission` |
| [07](activities/class-07/) | Cuando el backend falla | INC-701, INC-702 y OPS-703: validación, errores y observabilidad. | `class-07-submission` |
| [08](activities/class-08/) | Refactoring y responsabilidades | Refactor seguro y FEATURE-801: asignación de solicitudes. | `class-08-submission` |
| [09](activities/class-09/) | Entrar, entender y cambiar sin romper | Dossier técnico, análisis de impacto y corrección de BUG-901. | `class-09-submission` |

El proyecto transversal de las clases 03–05 está en
[`activities/class-05/project/`](activities/class-05/project/). La interfaz
05A y el material interactivo 05B comparten el proyecto de
[`activities/class-05/frontend/`](activities/class-05/frontend/).

Los materiales de consulta generales están en
[`resources-notes/`](resources-notes/).

## Requisitos

- Node.js 20 o posterior para los proyectos de las clases más recientes.
- npm, incluido con Node.js.
- PostgreSQL/Supabase y configuración local para las actividades que lo
  requieran.

No hay un `package.json` en la raíz. Instala dependencias y ejecuta los
comandos desde la carpeta del proyecto correspondiente. Los ejemplos de
esta guía usan PowerShell desde la raíz del repositorio.

## Instrucciones de ejecución

Las API escuchan normalmente en el puerto `3000`; detén un servidor antes
de iniciar otro que use el mismo puerto.

### Clase 01 — servidores HTTP con Node.js

```powershell
node .\activities\class-01\src\01-hello-world.js
```

La carpeta `activities/class-01/src/` contiene cuatro ejemplos
progresivos. Consulta su README para ejecutar cada uno y el laboratorio de
fallas.

### Clase 02 — APIs Lite y Full

API Lite:

```powershell
Set-Location .\activities\class-02\lite-api
npm ci
npm start
```

API Full, en otra terminal después de detener el servidor anterior:

```powershell
Set-Location .\activities\class-02\project
npm ci
npm start
```

Ambas utilizan el puerto `3000`; sus contratos y casos manuales están
documentados en `activities/class-02/`.

### Clases 03–05 — API transversal

El backend evolutivo está en `activities/class-05/project/`. Necesita una
base PostgreSQL/Supabase y variables locales configuradas en `.env`.
Consulta su README antes de aplicar migraciones o ejecutar el seed.

```powershell
Set-Location .\activities\class-05\project
npm ci
Copy-Item .env.example .env
npm run db:check
npm start
```

El validador de la entrega 05 incluye etapas y una validación integral:

```powershell
npm run validate:class-05 -- --stage access-design
npm run validate:class-05
```

Para compilar o iniciar las entregas del frontend:

```powershell
Set-Location .\activities\class-05\frontend
npm ci
npm run build
# npm run dev inicia el servidor local de desarrollo
```

### Clase 06 — primer ticket

```powershell
Set-Location .\activities\class-06
npm ci
Copy-Item .env.example .env
npm run class-06:doctor
npm run db:migrate
npm run db:seed
npm test
npm run validate:class-06
```

### Clase 07 — incidentes y observabilidad

```powershell
Set-Location .\activities\class-07
npm ci
Copy-Item .env.example .env
npm run class-07:doctor
npm run db:migrate
npm run db:seed
npm test
npm run incidents:reproduce
npm run validate:class-07
```

### Clase 08 — refactor y asignación

```powershell
Set-Location .\activities\class-08
npm ci
Copy-Item .env.example .env
npm run class-08:doctor
npm run db:migrate
npm run db:seed
npm test
npm run validate:class-08
```

El checkpoint acumulativo de las clases 01–07 se prepara con
`npm run progress:checkpoint`.

### Clase 09 — incorporación y corrección de BUG-901

```powershell
Set-Location .\activities\class-09
npm ci
Copy-Item .env.example .env
npm run doctor
npm run db:migrate
npm run db:seed
npm test
npm run validate:class-09
```

La evaluación conversacional es personal. Para preparar la tarjeta utiliza
el correo del curso; el script conserva solo la parte anterior a `@`:

```powershell
npm run assessment:prepare -- --student=abrahammedina.itsu@gmail.com
npm run assessment:validate
```

En las clases 06–09, completa `.env` con credenciales propias antes de
ejecutar comandos que requieran conexión a la base de datos. No uses una
base que no te pertenezca o para la que no tengas autorización.

## Estado de las entregas

| Entrega | Estado | Evidencia principal |
| --- | --- | --- |
| 01 · El viaje de una petición | Entregada | Tag `class-01-submission`. |
| 02 · HTTP como contrato | Entregada | Tags `class-02-lite-analysis` y `class-02-submission`. |
| 03 · Recursos, estado y reglas | Entregada | Diseño y entrega etiquetados; matriz en `activities/class-03/test-matrix.md`. |
| 04 · De SQL al backend persistente | Entregada | Diseño y entrega etiquetados; evidencia en `activities/class-04/`. |
| 05 · Seguridad, identidad y frontend | Entregada | Validación integral registrada; entregas 05A y 05B en `activities/class-05/`. |
| 06 · Primer ticket en backend existente | Entregada | BUG-106, FEATURE-206 y validador final. |
| 07 · Cuando el backend falla | Entregada | INC-701, INC-702, OPS-703 y validador final. |
| 08 · Refactoring y responsabilidades | Entregada | FEATURE-801, pruebas de políticas y validador final. |
| 09 · Entrar, entender y cambiar sin romper | Taller entregado | BUG-901, dossier técnico y validador; la evaluación personal se completa según `activities/class-09/assessment/README.md`. |

## Reglas del curso

- Los commits deben describir el cambio y conservar la historia de cada
  entrega.
- La IA puede ayudar, pero no sustituye la comprensión, la evidencia ni la
  verificación de los cambios.
- No se comparten ni se publican archivos `.env`, contraseñas, tokens o
  cadenas de conexión.
- No se ejecutan migraciones ni seeds contra bases de datos ajenas.
- No se reescribe el historial compartido ni se hace `force push`.
