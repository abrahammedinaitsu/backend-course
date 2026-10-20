/**
 * 03-routes.js
 * Clase 01 - Una URL, una decisión
 */
const http = require('http');

const PORT = 5000;

function logPeticion(method, url) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] Petición: ${method} ${url}`);
}

const server = http.createServer((req, res) => {
  const method = req.method;
  const url = req.url;

  logPeticion(method, url);

  if (url === '/') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(
      '<h1>Servidor Backend - Clase 01</h1>' +
        '<p>¡Funciona!</p>' +
        '<ul>' +
        '<li>GET /</li>' +
        '<li>GET /health</li>' +
        '<li>GET /api/info</li>' +
        '</ul>'
    );
  } else if (url === '/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const health = {
      status: 'ok',
      service: 'backend-class-01',
      timestamp: new Date().toISOString(),
    };
    res.end(JSON.stringify(health, null, 2));
  } else if (url === '/api/info') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const info = {
      name: 'Backend Fundamentals - Class 01',
      version: '1.0.0',
      nodeVersion: process.version,
    };
    res.end(JSON.stringify(info, null, 2));
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const notFound = {
      error: 'Not Found',
      status: 404,
      message: `La ruta solicitada no existe: ${url}`,
    };
    res.end(JSON.stringify(notFound, null, 2));
  }
});

server.listen(PORT, () => {
  console.log(`Escuchando en: http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('Error al iniciar el servidor:', err.message);
});
