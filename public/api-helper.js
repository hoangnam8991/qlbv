// Determine if we should use LocalStorage (GitHub Pages or static mode)
// If hostname is NOT localhost/127.0.0.1, we assume GitHub Pages/static mode.
const isStaticMode = !['localhost', '127.0.0.1', ''].includes(window.location.hostname);

const STORAGE_KEY = 'qlbv_requests_db';

// Helper to get requests from LocalStorage
function getLocalRequests() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// Helper to save requests to LocalStorage
function saveLocalRequests(requests) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

// Mock API handler
function handleMockAPI(url, options = {}) {
  const method = options.method || 'GET';
  
  // Normalize checking for requests list and ID operations
  const isRequestsList = url.endsWith('/api/requests');
  const isAccept = url.match(/\/api\/requests\/([a-zA-Z0-9_-]+)\/accept$/);
  const isReject = url.match(/\/api\/requests\/([a-zA-Z0-9_-]+)\/reject$/);

  return new Promise((resolve) => {
    setTimeout(() => {
      let requests = getLocalRequests();

      // 1. GET /api/requests
      if (isRequestsList && method === 'GET') {
        resolve({
          ok: true,
          status: 200,
          json: async () => requests
        });
        return;
      }

      // 2. POST /api/requests
      if (isRequestsList && method === 'POST') {
        const body = JSON.parse(options.body || '{}');
        const { name, type } = body;

        if (!name || !name.trim()) {
          resolve({
            ok: false,
            status: 400,
            json: async () => ({ error: 'Vui lòng nhập tên nhân viên!' })
          });
          return;
        }

        const newRequest = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          name: name.trim(),
          type,
          timestamp: new Date().toISOString(),
          status: 'pending',
          processedAt: null
        };

        requests.unshift(newRequest);
        saveLocalRequests(requests);

        resolve({
          ok: true,
          status: 201,
          json: async () => ({ message: 'Gửi yêu cầu chấm công thành công!', request: newRequest })
        });
        return;
      }

      // 3. POST /api/requests/:id/accept
      if (isAccept && method === 'POST') {
        const id = isAccept[1];
        const index = requests.findIndex(r => r.id === id);

        if (index === -1) {
          resolve({
            ok: false,
            status: 404,
            json: async () => ({ error: 'Không tìm thấy yêu cầu!' })
          });
          return;
        }

        requests[index].status = 'accepted';
        requests[index].processedAt = new Date().toISOString();
        saveLocalRequests(requests);

        resolve({
          ok: true,
          status: 200,
          json: async () => ({ message: 'Đã duyệt và lưu yêu cầu thành công!', request: requests[index] })
        });
        return;
      }

      // 4. POST /api/requests/:id/reject
      if (isReject && method === 'POST') {
        const id = isReject[1];
        const index = requests.findIndex(r => r.id === id);

        if (index === -1) {
          resolve({
            ok: false,
            status: 404,
            json: async () => ({ error: 'Không tìm thấy yêu cầu!' })
          });
          return;
        }

        requests[index].status = 'rejected';
        requests[index].processedAt = new Date().toISOString();
        saveLocalRequests(requests);

        resolve({
          ok: true,
          status: 200,
          json: async () => ({ message: 'Đã từ chối yêu cầu!', request: requests[index] })
        });
        return;
      }

      // Fallback
      resolve({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not Found' })
      });
    }, 100); // Simulate brief network delay
  });
}

// Global fetch wrapper
window.apiFetch = function(url, options = {}) {
  if (isStaticMode) {
    console.log(`[Static Mode] Intercepting fetch to: ${url}`);
    return handleMockAPI(url, options);
  }
  return fetch(url, options);
};
