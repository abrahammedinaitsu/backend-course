// Application setup: middlewares and route mounting. It does not open any port.
// Keeping this separate from server.js lets the app be mounted in a test without
// listening on a port, and lets the port change without touching the routes.
import express from 'express';
import requestsRoutes from './routes/requests.routes.js';

const app = express();

// Parses incoming JSON bodies into req.body.
app.use(express.json());

// Every route inside the router is served under /requests.
app.use('/requests', requestsRoutes);

export default app;
