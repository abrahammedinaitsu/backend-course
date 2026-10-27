// Application setup: middlewares and module mounting. It does not open any
// port. The ORDER matters and is part of what class 7 teaches:
//
//   1. CORS            preflights must be answered before anything else
//   2. request id      everything after this point can identify the request
//   3. request logger  subscribes to 'finish' now, logs when it knows the status
//   4. JSON parser     a broken body becomes an error the handler translates
//   5. health routes   public: no token, no business rules
//   6. modules         /auth, /requests
//   7. not found       only reached when NO route matched
//   8. error handler   sees every error produced above it — and only those
import express from 'express';
import { corsPolicy } from './middleware/cors.js';
import { requestId } from './middleware/request-id.js';
import { requestLogger } from './middleware/request-logger.js';
import { authenticate } from './middleware/authenticate.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRoutes } from './routes/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import requestsRoutes from './modules/requests/requests.routes.js';

const app = express();

app.use(corsPolicy);
app.use(requestId);
app.use(requestLogger);
app.use(express.json());

app.use(healthRoutes);

// /auth mixes public routes (register, login) and one protected route
// (/me), so the module applies `authenticate` internally where needed.
app.use('/auth', authRoutes);

// Every requests route needs a trusted actor: authenticate runs first and
// builds req.auth, or forwards a 401 error and the router never runs.
app.use('/requests', authenticate, requestsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
