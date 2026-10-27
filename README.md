# Backend Course

Repositorio de actividades y proyectos para aprender desarrollo backend de
forma progresiva: desde el recorrido de una petición HTTP hasta una API con
autenticación, autorización, persistencia, pruebas y una interfaz cliente.

## Mapa del repositorio

| Ruta | Contenido |
| --- | --- |
| [`activities/class-01/`](activities/class-01/) | Fundamentos de HTTP, servidores Node.js y diagnóstico de fallas. |
| [`activities/class-02/`](activities/class-02/) | Contratos HTTP y comparación entre una API Lite y una API modular. |
| [`activities/class-03/`](activities/class-03/) | Diseño de recursos, estados, transiciones y contratos. |
| [`activities/class-04/`](activities/class-04/) | Persistencia con PostgreSQL, integridad, transacciones e historial. |
| [`activities/class-05/`](activities/class-05/) | Autenticación, propiedad, autorización y evidencias del taller. |
| [`project/`](project/) | API transversal desarrollada durante las clases 03–05. |
| [`project-class-06/`](project-class-06/) | Proyecto de la clase 06: primeros tickets en una API existente. |
| [`project-class-07/`](project-class-07/) | Proyecto de la clase 07: diagnóstico de errores y observabilidad. |
| [`project-class-08/`](project-class-08/) | Proyecto de la clase 08: refactor y asignación de solicitudes. |
| [`project-class-09/`](project-class-09/) | Proyecto de la clase 09: incorporación y corrección de un defecto. |
| [`frontend/`](frontend/) | Interfaz para la API y material interactivo sobre autenticación. |

Cada `project-class-*` es una versión autónoma del taller correspondiente;
`project/` es el proyecto transversal. Consulta el `README.md` de la carpeta
que elijas antes de instalar dependencias o ejecutar comandos.

## Requisitos

- Node.js 20 o posterior para los proyectos más recientes.
- npm, incluido con Node.js.
- PostgreSQL/Supabase y configuración local para los proyectos que lo
  requieran. Los valores de conexión y las credenciales se obtienen y
  configuran por cuenta propia.

## Empezar

No hay un `package.json` en la raíz: instala dependencias y ejecuta comandos
desde la carpeta del proyecto que quieras usar. Por ejemplo, en Windows:

```powershell
Set-Location .\project-class-09
npm ci
Copy-Item .env.example .env
```

Completa `.env` siguiendo las instrucciones de ese proyecto y, después,
ejecuta su suite:

```powershell
npm test
```

Los proyectos de las clases 06–09 requieren `DATABASE_URL` y `JWT_SECRET`;
sus pruebas de integración usan la base configurada. La interfaz también se
puede compilar por separado:

```powershell
Set-Location .\frontend
npm ci
npm run build
```

Revisa el README del proyecto para conocer migraciones, seed, validadores,
pruebas específicas y requisitos de cada actividad.

## Protección de datos

- No compartas ni confirmes archivos `.env`, tokens ni cadenas de conexión.
- Usa `.env.example` como plantilla y datos sintéticos en las pruebas.
- No ejecutes migraciones o seed contra una base que no sea tuya.

