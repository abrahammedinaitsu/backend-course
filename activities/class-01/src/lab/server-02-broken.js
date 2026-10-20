const http = require('http');
const PORT = 9002;
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  const data = { status: 'ok', mensaje: 'Falta Content-Type' };
  res.end(JSON.stringify(data));
});
server.listen(PORT, () => console.log('[BROKEN 02] http://localhost:9002'));
server.on('error', (e)=>console.error(e.message));
