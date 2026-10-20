const http = require('http');
const PORT = 9004;
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Servidor 04 - Escuchando');
});
server.listen(PORT, () => console.log('[FIXED 04] http://localhost:9004'));
server.on('error', (e)=>console.error(e.message));
