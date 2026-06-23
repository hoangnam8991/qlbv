const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'database.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Helper functions for database operations
function readDatabase() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      // Create empty DB if not exists
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify({ requests: [] }, null, 2));
      return { requests: [] };
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { requests: [] };
  }
}

function writeDatabase(data) {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing database:', error);
    return false;
  }
}

// Helper to serve static files
function serveStaticFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
}

// Helper to parse JSON body
function getJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Create server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method = req.method;

  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API Endpoints ---

  // 1. GET /api/requests - Get all requests
  if (pathname === '/api/requests' && method === 'GET') {
    const db = readDatabase();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(db.requests));
    return;
  }

  // 2. POST /api/requests - Submit a new request
  if (pathname === '/api/requests' && method === 'POST') {
    try {
      const body = await getJsonBody(req);
      const { name, type } = body;

      if (!name || !name.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Vui lòng nhập tên nhân viên!' }));
        return;
      }

      if (!type || !['check-in', 'check-out'].includes(type)) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Loại yêu cầu không hợp lệ!' }));
        return;
      }

      const db = readDatabase();
      const newRequest = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        name: name.trim(),
        type,
        timestamp: new Date().toISOString(),
        status: 'pending',
        processedAt: null
      };

      db.requests.unshift(newRequest); // Prepend
      const success = writeDatabase(db);

      if (success) {
        res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ message: 'Gửi yêu cầu chấm công thành công!', request: newRequest }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Lỗi lưu trữ dữ liệu!' }));
      }
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Dữ liệu yêu cầu không hợp lệ!' }));
    }
    return;
  }

  // 3. POST /api/requests/:id/accept - Approve a request
  const acceptMatch = pathname.match(/^\/api\/requests\/([a-zA-Z0-9]+)\/accept$/);
  if (acceptMatch && method === 'POST') {
    const id = acceptMatch[1];
    const db = readDatabase();

    const requestIndex = db.requests.findIndex(req => req.id === id);
    if (requestIndex === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Không tìm thấy yêu cầu!' }));
      return;
    }

    if (db.requests[requestIndex].status === 'accepted') {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Yêu cầu này đã được duyệt trước đó!' }));
      return;
    }

    db.requests[requestIndex].status = 'accepted';
    db.requests[requestIndex].processedAt = new Date().toISOString();

    const success = writeDatabase(db);
    if (success) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ message: 'Đã duyệt và lưu yêu cầu thành công!', request: db.requests[requestIndex] }));
    } else {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Lỗi lưu trữ dữ liệu!' }));
    }
    return;
  }

  // 4. POST /api/requests/:id/reject - Reject a request
  const rejectMatch = pathname.match(/^\/api\/requests\/([a-zA-Z0-9]+)\/reject$/);
  if (rejectMatch && method === 'POST') {
    const id = rejectMatch[1];
    const db = readDatabase();

    const requestIndex = db.requests.findIndex(req => req.id === id);
    if (requestIndex === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Không tìm thấy yêu cầu!' }));
      return;
    }

    db.requests[requestIndex].status = 'rejected';
    db.requests[requestIndex].processedAt = new Date().toISOString();

    const success = writeDatabase(db);
    if (success) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ message: 'Đã từ chối yêu cầu!', request: db.requests[requestIndex] }));
    } else {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Lỗi lưu trữ dữ liệu!' }));
    }
    return;
  }

  // --- Static Frontend Routes ---

  // Redirect root / to /user.html or serve user.html directly
  if (pathname === '/' || pathname === '/user') {
    serveStaticFile(res, path.join(PUBLIC_DIR, 'user.html'), 'text/html; charset=utf-8');
    return;
  }

  if (pathname === '/admin') {
    serveStaticFile(res, path.join(PUBLIC_DIR, 'admin.html'), 'text/html; charset=utf-8');
    return;
  }

  // Serve static files (HTML, CSS, JS) from /public
  const ext = path.extname(pathname);
  let contentType = 'text/plain; charset=utf-8';
  if (ext === '.html') contentType = 'text/html; charset=utf-8';
  else if (ext === '.css') contentType = 'text/css';
  else if (ext === '.js') contentType = 'application/javascript';
  else if (ext === '.json') contentType = 'application/json';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.svg') contentType = 'image/svg+xml';

  const filePath = path.join(PUBLIC_DIR, pathname);
  
  // Basic security check to prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    } else {
      serveStaticFile(res, filePath, contentType);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`User page: http://localhost:${PORT}/`);
  console.log(`Admin page: http://localhost:${PORT}/admin`);
});
