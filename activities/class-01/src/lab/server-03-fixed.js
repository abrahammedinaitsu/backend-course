const http = require('http');
const PORT = 9003;
const server = http.createServer((req, res) => {
  const url = req.url;
  if (url === '/') {
    res.statusCode = 200; res.setHeader('Content-Type', 'text/plain'); res.end('HOME');
  } else if (url === '/health') {
    res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({status:'ok'}, null, 2));
  } else if (url === '/api/info') {
    res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ok:true}, null, 2));
  } else {
    res.statusCode = 404; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({error:'Not Found', requested:url}, null, 2));
  }
});
server.listen(PORT, () => console.log('[FIXED 03] http://localhost:9003'));
server.on('error', (e)=>console.error(e.message));
