const http = require('http');
const PORT = 9006;
const server = http.createServer((req, res) => {
  const url = req.url ? req.url.toLowerCase() : '/';
  if (url === '/health') {
    res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({status:'ok'}, null, 2));
  } else if (url === '/') {
    res.statusCode = 200; res.setHeader('Content-Type', 'text/plain'); res.end('OK');
  } else {
    res.statusCode = 404; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({error:'Not Found', requested:req.url}, null, 2));
  }
});
server.listen(PORT, () => console.log('[FIXED 06] http://localhost:9006'));
server.on('error', (e)=>console.error(e.message));
