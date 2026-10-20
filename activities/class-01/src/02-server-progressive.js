/**
 * 02-server-progressive.js
 * Clase 01 - Leer método y URL
 */
const http = require('http');

const PORT = 4000;

const server = http.createServer((req, res) => {
  const method = req.method;
  const url = req.url;

  console.log(`--- PETICIÓN RECIBIDA ---`);
  console.log(`Método: ${method}`);
  console.log(`URL solicitada: ${url}`);
  console.log(`-------------------------`);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  const respuesta = [
    'Servidor HTTP - Construcción progresiva',
    '',
    `Has solicitado: ${method} ${url}`,
    '',
    '- req.method = método HTTP',
    '- req.url    = ruta solicitada',
  ].join('\n');

  res.end(respuesta);
});

server.listen(PORT, () => {
  console.log(`Escuchando en: http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('Error al iniciar el servidor:', err.message);
});
