const http = require('http');
const PORT = 9004;
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('OK');
});
console.log('[BROKEN 04] Creado pero NO escucha (falta listen)');
server.on('error', (e)=>console.error(e.message));
