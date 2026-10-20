const http = require('http');
const PORT = 9002;
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const data = { status: 'ok', mensaje: 'Content-Type correcto' };
  res.end(JSON.stringify(data, null, 2));
});
server.listen(PORT, () => console.log('[FIXED 02] http://localhost:9002'));
server.on('error', (e)=>console.error(e.message));
