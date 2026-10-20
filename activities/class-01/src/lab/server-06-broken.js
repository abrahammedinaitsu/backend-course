const http = require('http');
const PORT = 9006;
const server = http.createServer((req, res) => {
  const url = req.url;
  if (url === '/health') {
    res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({status:'ok'}));
  } else {
    res.statusCode = 404; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({error:'Not Found'}));
  }
});
server.listen(PORT, () => console.log('[BROKEN 06] http://localhost:9006'));
server.on('error', (e)=>console.error(e.message));
