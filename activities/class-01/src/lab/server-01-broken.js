const http = require('http');
const PORT = 9001;
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.write('Servidor 01 - RESPUESTA INCOMPLETA\n');
  // FALTA res.end()
});
server.listen(PORT, () => console.log('[BROKEN 01] http://localhost:9001'));
server.on('error', (e)=>console.error(e.message));
