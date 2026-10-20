const http = require('http');
const PORT = 9005;
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('ÚNICA RESPUESTA - OK');
});
server.listen(PORT, () => console.log('[FIXED 05] http://localhost:9005'));
server.on('error', (e)=>console.error(e.message));
