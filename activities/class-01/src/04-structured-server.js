/**
 * 04-structured-server.js
 * Clase 01 - Versión estructurada
 */
const http = require('http');
const logger = require('./utils/logger');

const PORT = 8080;
const SERVICE_NAME = 'backend-class-01-structured';

function handleHome(res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<h1>Servidor Estructurado - Clase 01</h1>');
}

function handleHealth(res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const payload = {
    status: 'ok',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
  };
  res.end(JSON.stringify(payload, null, 2));
}

function handleApiInfo(res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const payload = {
    name: 'Backend Fundamentals',
    course: 'Class 01',
    service: SERVICE_NAME,
  };
  res.end(JSON.stringify(payload, null, 2));
}

function handleNotFound(req, res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const payload = {
    error: 'Not Found',
    status: 404,
    message: `La ruta solicitada no existe: ${req.url}`,
  };
  res.end(JSON.stringify(payload, null, 2));
}

function route(req, res) {
  const { url } = req;
  logger.info(`Petición: ${req.method} ${url}`);
  if (url === '/') return handleHome(res);
  if (url === '/health') return handleHealth(res);
  if (url === '/api/info') return handleApiInfo(res);
  return handleNotFound(req, res);
}

const server = http.createServer((req, res) => {
  try {
    route(req, res);
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Internal Server Error', status: 500 }));
  }
});

server.listen(PORT, () => {
  logger.info(`${SERVICE_NAME} escuchando en http://localhost:${PORT}`);
});

server.on('error', (err) => {
  logger.error(`Error al iniciar: ${err.message}`);
});
