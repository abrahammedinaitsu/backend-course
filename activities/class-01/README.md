# Actividad Clase 01 – Del clic a la respuesta: ¿qué ocurre detrás de una aplicación web?

## Objetivo

Comprender, paso a paso, qué ocurre cuando una acción del usuario (por ejemplo, "Guardar") llega a un servidor y obtiene una respuesta. 

## Estructura del entregable

```text
activities/class-01/
├── README.md
├── evidence/
│   ├── class-01-journey.md
│   ├── curl-examples.md
│   ├── network-notes.md
│   └── lab-failures-diagnosis.md
└── src/
    ├── 01-hello-world.js
    ├── 02-server-progressive.js
    ├── 03-routes.js
    ├── 04-structured-server.js
    ├── lab/
    │   ├── README-lab.md
    │   ├── server-01-broken.js
    │   ├── server-02-broken.js
    │   ├── server-03-broken.js
    │   ├── server-04-broken.js
    │   ├── server-05-broken.js
    │   ├── server-06-broken.js
    │   ├── server-01-fixed.js
    │   ├── server-02-fixed.js
    │   ├── server-03-fixed.js
    │   ├── server-04-fixed.js
    │   ├── server-05-fixed.js
    │   └── server-06-fixed.js
    └── utils/
        └── logger.js
```

## Cómo ejecutar

Todos los archivos usan el módulo HTTP nativo de Node.js, sin dependencias externas.

```bash
# 1) Servidor mínimo
node src/01-hello-world.js

# 2) Servidor progresivo
node src/02-server-progressive.js

# 3) Rutas con decisiones
node src/03-routes.js

# 4) Servidor estructurado
node src/04-structured-server.js
```

## Casos comprobados

| Caso | Archivo | Ruta | Método | Status esperado | Tipo de respuesta |
|---|---|---|---|---|---|
| Raíz | 03,04 | `/` | GET | 200 | HTML/Texto explicativo |
| Salud | 03,04 | `/health` | GET | 200 | JSON |
| Info API | 03,04 | `/api/info` | GET | 200 | JSON |
| Ruta inexistente | 03,04 | `/*` | Cualquiera | 404 | JSON coherente |

## AI usage

- **Uso de IA:** Sí.
- **Para qué:** Estructurar la actividad, generar servidores comentados, crear laboratorio roto+corregido, redactar evidencias.
- **Aceptado:** Organización, comentarios didácticos, ejemplos reproducibles.
- **Rechazado/modificado:** Se priorizó módulo HTTP nativo, enfoque "evidencia > suposición", respuestas coherentes 404.
- **Verificación:** Todos los archivos revisados lógicamente y comandos curl validados conceptualmente.

## Reflexión

Aprendí a trazar el recorrido petición–respuesta completo, entender `req/res`, cerrar respuestas con `res.end()`, enrutado por URL y diagnóstico con evidencia.

## Entrega

- Carpeta: `activities/class-01/`
- Tag: `class-01-submission`
