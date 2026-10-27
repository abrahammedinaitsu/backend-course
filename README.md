# Backend Course

Repositorio de actividades y proyectos para aprender desarrollo backend de
forma progresiva: fundamentos de HTTP, diseño de APIs, persistencia,
autenticación, autorización, pruebas y una interfaz cliente.

## Estructura

| Ruta | Contenido |
| --- | --- |
| [`activities/class-01/`](activities/class-01/) | Fundamentos de HTTP y servidores Node.js. |
| [`activities/class-02/`](activities/class-02/) | Contratos HTTP y APIs Lite y Full. |
| [`activities/class-03/`](activities/class-03/) | Recursos, estados, transiciones y reglas. |
| [`activities/class-04/`](activities/class-04/) | PostgreSQL, persistencia e historial. |
| [`activities/class-05/`](activities/class-05/) | Autenticación, autorización, API transversal e interfaz. |
| [`activities/class-06/`](activities/class-06/) | Primeros tickets en un backend existente. |
| [`activities/class-07/`](activities/class-07/) | Diagnóstico de incidentes y observabilidad. |
| [`activities/class-08/`](activities/class-08/) | Refactor y asignación de solicitudes. |
| [`activities/class-09/`](activities/class-09/) | Incorporación al sistema y corrección de un defecto. |
| [`activities/class-10/`](activities/class-10/) | Carpeta reservada para la clase 10. |
| [`m24-class-autoguide/`](m24-class-autoguide/) | Guías y materiales del módulo M24. |
| [`resources-notes/`](resources-notes/) | Recursos y notas generales del curso. |

Cada clase contiene sus materiales y, cuando corresponde, su proyecto
ejecutable. La API transversal desarrollada entre las clases 03–05 y el
frontend asociado están en `activities/class-05/project/` y
`activities/class-05/frontend/`.

## Requisitos

- Node.js y npm. Los proyectos más recientes requieren Node.js 20 o posterior.
- PostgreSQL/Supabase y configuración local para los proyectos que lo
  indiquen en su README.

No hay un `package.json` en la raíz: instala dependencias y ejecuta comandos
desde la carpeta del proyecto que quieras utilizar. Por ejemplo, en Windows:

```powershell
Set-Location .\activities\class-09
npm ci
Copy-Item .env.example .env
```

Completa `.env` siguiendo la guía de esa clase y ejecuta las pruebas desde
esa carpeta:

```powershell
npm test
```

Para compilar la interfaz:

```powershell
Set-Location .\activities\class-05\frontend
npm ci
npm run build
```

Consulta el README de cada clase antes de configurar la base de datos,
ejecutar migraciones o cargar datos de ejemplo.

## Protección de datos

- No compartas ni confirmes archivos `.env`, tokens ni cadenas de conexión.
- Usa `.env.example` como plantilla y datos sintéticos en las pruebas.
- No ejecutes migraciones o seed contra una base que no sea tuya.

