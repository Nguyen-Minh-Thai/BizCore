const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json'
};

const server = http.createServer((req, res) => {
  let pathname = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  try {
    if (pathname.endsWith('/') || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch (e) { /* missing path → 404 below */ }

  const serve = (fp) => {
    const extname = String(path.extname(fp)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';
    fs.readFile(fp, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') { res.writeHead(404); res.end('File not found'); }
        else if (error.code === 'EISDIR') { serve(path.join(fp, 'index.html')); }
        else { res.writeHead(500); res.end('Server error: ' + error.code); }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  };
  serve(filePath);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
