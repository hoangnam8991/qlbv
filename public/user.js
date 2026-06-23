// UI Elements
const clockTime = document.getElementById('clock-time');
const clockDate = document.getElementById('clock-date');
const requestForm = document.getElementById('requestForm');
const employeeNameInput = document.getElementById('employeeName');
const btnSubmit = document.getElementById('btnSubmit');
const recentRequestsList = document.getElementById('recentRequestsList');
const requestCount = document.getElementById('request-count');
const toastContainer = document.getElementById('toastContainer');

// State
let allRequests = [];

// 1. Live Clock
function updateClock() {
  const now = new Date();
  
  // Format Time: HH:MM:SS
  const hrs = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');
  clockTime.textContent = `${hrs}:${mins}:${secs}`;
  
  // Format Date (Vietnamese style)
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = days[now.getDay()];
  const dateStr = `Ngày ${now.getDate()} tháng ${now.getMonth() + 1}, ${now.getFullYear()}`;
  clockDate.textContent = `${dayName}, ${dateStr}`;
}

// 2. Toast Notifications
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--status-accepted)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--status-rejected)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
  } else {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  toast.innerHTML = `
    ${iconSvg}
    <span>${message}</span>
  `;
  
  toastContainer.appendChild(toast);
  
  // Auto remove toast after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s ease-in reverse';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 280);
  }, 3000);
}

// 3. Fetch Recent Requests
async function fetchRequests() {
  try {
    const res = await fetch('/api/requests');
    if (!res.ok) throw new Error('Không thể tải danh sách yêu cầu');
    
    allRequests = await res.json();
    renderRequests();
  } catch (error) {
    console.error('Error fetching requests:', error);
  }
}

// 4. Render Requests List
function renderRequests() {
  if (allRequests.length === 0) {
    recentRequestsList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>Chưa có yêu cầu nào được gửi hôm nay</p>
      </div>
    `;
    requestCount.textContent = '0';
    return;
  }

  requestCount.textContent = allRequests.length;
  
  recentRequestsList.innerHTML = allRequests.map(req => {
    // Get status class & text
    let statusClass = 'status-pending';
    let statusText = 'Chờ duyệt';
    if (req.status === 'accepted') {
      statusClass = 'status-accepted';
      statusText = 'Đã duyệt';
    } else if (req.status === 'rejected') {
      statusClass = 'status-rejected';
      statusText = 'Từ chối';
    }

    // Format Request Type text
    const typeText = req.type === 'check-in' ? 'Vào Ca' : 'Ra Ca';
    const typeColor = req.type === 'check-in' ? 'var(--secondary)' : 'var(--accent)';
    
    // Format timestamp
    const dateObj = new Date(req.timestamp);
    const timeStr = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Icon badge based on type
    const avatarChar = req.name.charAt(0).toUpperCase();

    return `
      <div class="request-item">
        <div class="item-left">
          <div class="avatar">${avatarChar}</div>
          <div class="item-info">
            <span class="employee-name">${req.name}</span>
            <span class="request-time-type">
              <span style="color: ${typeColor}; font-weight: 500;">${typeText}</span>
              &bull;
              <span>${timeStr}</span>
            </span>
          </div>
        </div>
        <div class="status-badge ${statusClass}">
          ${statusText}
        </div>
      </div>
    `;
  }).join('');
}

// 5. Handle Form Submission
requestForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = employeeNameInput.value.trim();
  const type = document.querySelector('input[name="requestType"]:checked').value;
  
  if (!name) {
    showToast('Vui lòng nhập tên đầy đủ!', 'error');
    return;
  }
  
  // Disable button while submitting
  btnSubmit.disabled = true;
  btnSubmit.querySelector('span').textContent = 'Đang gửi...';

  try {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, type })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      showToast(data.message || 'Gửi yêu cầu thành công!', 'success');
      
      // Save name to localStorage for future use
      localStorage.setItem('employeeName', name);
      
      // Refresh request list
      await fetchRequests();
    } else {
      showToast(data.error || 'Có lỗi xảy ra', 'error');
    }
  } catch (error) {
    showToast('Lỗi kết nối tới máy chủ!', 'error');
    console.error('Submission error:', error);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.querySelector('span').textContent = 'Gửi Yêu Cầu Chấm Công';
  }
});

// Init
document.addEventListener('DOMContentLoaded', () => {
  // Set up clock
  updateClock();
  setInterval(updateClock, 1000);
  
  // Load saved employee name
  const savedName = localStorage.getItem('employeeName');
  if (savedName) {
    employeeNameInput.value = savedName;
  }
  
  // Initial fetch and start polling every 5 seconds
  fetchRequests();
  setInterval(fetchRequests, 5000);
});
