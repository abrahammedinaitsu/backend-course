/**
 * 01-hello-world.js
 * Clase 01 - Primer servidor HTTP nativo mínimo
 */
const http = require('http');

const PORT = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('¡Hola Mundo! Este es mi primer servidor HTTP con Node.js.');
});

server.listen(PORT, () => {
  console.log(`Servidor escuchando en: http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('Error al iniciar el servidor:', err.message);
});
