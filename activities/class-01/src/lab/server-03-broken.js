const http = require('http');
const PORT = 9003;
const server = http.createServer((req, res) => {
  const url = req.url;
  if (url === '/') {
    res.statusCode = 200; res.setHeader('Content-Type', 'text/plain'); res.end('HOME');
  } else if (url === '/health') {
    res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({status:'ok'}));
  } else if (url === '/api/infoo') {
    res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({info:'typo'}));
  }
});
server.listen(PORT, () => console.log('[BROKEN 03] http://localhost:9003'));
server.on('error', (e)=>console.error(e.message));
