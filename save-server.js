const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const OUT = 'C:/Users/manoj/OneDrive/Desktop/Parosa/Company Design/Logo';

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method === 'POST') {
    const q = url.parse(req.url, true).query;
    const name = String(q.name || 'out.png').replace(/[^a-zA-Z0-9._-]/g, '');
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const b64 = body.replace(/^data:image\/png;base64,/, '');
        fs.writeFileSync(path.join(OUT, name), Buffer.from(b64, 'base64'));
        res.writeHead(200); res.end('ok ' + name);
        console.log('wrote', name, 'bytes:', Math.round(b64.length * 0.75));
      } catch (e) { res.writeHead(500); res.end(String(e)); console.log('err', e); }
    });
    return;
  }
  res.writeHead(200); res.end('parosa save server');
}).listen(4545, () => console.log('save server on http://localhost:4545'));
