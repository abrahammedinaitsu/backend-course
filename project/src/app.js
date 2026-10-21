// Configuración de la aplicación: middlewares, montaje de módulos y manejador de errores
// central. NO abre ningún puerto, para poder montar la app en una prueba sin escuchar.
//
// Cambios de la clase 05:
//   * CORS primero (las preflights se responden antes que nada);
//   * se monta el módulo /auth (público salvo /auth/me, que se protege dentro);
//   * TODAS las rutas de /requests exigen un actor confiable: `authenticate` corre primero y
//     construye req.auth, o responde 401 y el router nunca se ejecuta.
import express from 'express';
import { corsPolicy } from './middleware/cors.js';
import { authenticate } from './middleware/authenticate.js';
import authRoutes from './modules/auth/auth.routes.js';
import requestsRoutes from './modules/requests/requests.routes.js';
import { respondError, errorBody } from './http/respond-error.js';

const app = express();

// CORS primero: responde las preflight y agrega las cabeceras de origen cuando corresponde.
app.use(corsPolicy);

// Convierte el body JSON entrante en req.body.
app.use(express.json());

// /auth mezcla rutas públicas (register, login) y una protegida (/me), así que el módulo
// aplica `authenticate` internamente donde hace falta.
app.use('/auth', authRoutes);

// /requests queda protegido COMPLETO: authenticate corre antes que el router (una línea, cero
// repetición). Sin token válido, el router jamás ve la petición.
app.use('/requests', authenticate, requestsRoutes);

// Ninguna ruta coincidió -> categoría recurso.
app.use((req, res) => {
  res.status(404).json(errorBody('NOT_FOUND', 'Resource not found'));
});

// Manejador de errores central. `respondError` (capa HTTP compartida) clasifica cada falla:
//   * AppError -> por categoría (contract 400, auth 401, forbidden 403, resource 404, domain 409);
//   * errores de pg -> persistencia (500) o infraestructura (503);
//   * desconocidos -> 500 genérico, con el detalle solo en el log.
// Nunca filtra secretos, hosts, SQL ni stack traces al cliente.
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  respondError(res, error);
});

export default app;
