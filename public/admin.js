// UI Elements
const statTotal = document.getElementById('stat-total');
const statPending = document.getElementById('stat-pending');
const statAccepted = document.getElementById('stat-accepted');
const pendingList = document.getElementById('pendingList');
const historyList = document.getElementById('historyList');
const adminSearch = document.getElementById('adminSearch');
const btnRefresh = document.getElementById('btnRefresh');
const toastContainer = document.getElementById('toastContainer');

// State
let allRequests = [];
let searchQuery = '';

// 1. Toast Notifications
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
  
  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s ease-in reverse';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 280);
  }, 3000);
}

// 2. Fetch Requests from server
async function fetchRequests(isManual = false) {
  try {
    const res = await fetch('/api/requests');
    if (!res.ok) throw new Error('Không thể kết nối máy chủ');
    
    allRequests = await res.json();
    renderDashboard();
    
    if (isManual) {
      showToast('Đã cập nhật dữ liệu mới nhất!', 'info');
    }
  } catch (error) {
    console.error('Error fetching admin requests:', error);
    if (isManual) {
      showToast('Lỗi cập nhật dữ liệu!', 'error');
    }
  }
}

// 3. Render Dashboard stats and lists
function renderDashboard() {
  // Filter by search query
  const filtered = allRequests.filter(req => 
    req.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Calculate Statistics
  const total = allRequests.length;
  const pending = allRequests.filter(req => req.status === 'pending').length;
  const accepted = allRequests.filter(req => req.status === 'accepted').length;
  
  statTotal.textContent = total;
  statPending.textContent = pending;
  statAccepted.textContent = accepted;
  
  // Render Pending table
  const pendingItems = filtered.filter(req => req.status === 'pending');
  if (pendingItems.length === 0) {
    pendingList.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 14 14"></polyline>
          </svg>
          <p>Không có yêu cầu nào đang chờ duyệt</p>
        </td>
      </tr>
    `;
  } else {
    pendingList.innerHTML = pendingItems.map(req => {
      const typeText = req.type === 'check-in' ? 'Vào Ca' : 'Ra Ca';
      const typeColor = req.type === 'check-in' ? 'var(--secondary)' : 'var(--accent)';
      const timeStr = new Date(req.timestamp).toLocaleString('vi-VN');
      
      return `
        <tr style="animation: slideIn 0.3s ease-out;">
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="avatar">${req.name.charAt(0)}</div>
              <span style="font-weight: 600;">${req.name}</span>
            </div>
          </td>
          <td>
            <span style="color: ${typeColor}; font-weight: 600;">${typeText}</span>
          </td>
          <td>${timeStr}</td>
          <td>
            <span class="status-badge status-pending">Chờ duyệt</span>
          </td>
          <td>
            <div class="action-group">
              <button class="btn-action btn-accept" onclick="acceptRequest('${req.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Duyệt &amp; Lưu
              </button>
              <button class="btn-action btn-reject" onclick="rejectRequest('${req.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                Từ chối
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Render History table (Accepted & Rejected)
  const historyItems = filtered.filter(req => req.status !== 'pending');
  if (historyItems.length === 0) {
    historyList.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <p>Chưa có lịch sử yêu cầu được xử lý</p>
        </td>
      </tr>
    `;
  } else {
    historyList.innerHTML = historyItems.map(req => {
      const typeText = req.type === 'check-in' ? 'Vào Ca' : 'Ra Ca';
      const typeColor = req.type === 'check-in' ? 'var(--secondary)' : 'var(--accent)';
      const timeStr = new Date(req.timestamp).toLocaleString('vi-VN');
      const processedStr = req.processedAt ? new Date(req.processedAt).toLocaleString('vi-VN') : '---';
      
      let statusClass = 'status-accepted';
      let statusText = 'Đã duyệt &amp; Lưu';
      if (req.status === 'rejected') {
        statusClass = 'status-rejected';
        statusText = 'Từ chối';
      }

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="avatar" style="opacity: 0.7;">${req.name.charAt(0)}</div>
              <span style="font-weight: 500;">${req.name}</span>
            </div>
          </td>
          <td>
            <span style="color: ${typeColor}; font-weight: 500;">${typeText}</span>
          </td>
          <td>${timeStr}</td>
          <td>${processedStr}</td>
          <td>
            <span class="status-badge ${statusClass}">${statusText}</span>
          </td>
        </tr>
      `;
    }).join('');
  }
}

// 4. Accept / Approve Request (Save Locally on Server)
window.acceptRequest = async function(id) {
  try {
    const res = await fetch(`/api/requests/${id}/accept`, {
      method: 'POST'
    });
    const data = await res.json();
    
    if (res.ok) {
      showToast(`Đã phê duyệt và lưu yêu cầu của nhân viên!`, 'success');
      fetchRequests();
    } else {
      showToast(data.error || 'Lỗi phê duyệt yêu cầu', 'error');
    }
  } catch (error) {
    showToast('Lỗi kết nối máy chủ!', 'error');
    console.error('Accept error:', error);
  }
};

// 5. Reject Request
window.rejectRequest = async function(id) {
  try {
    const res = await fetch(`/api/requests/${id}/reject`, {
      method: 'POST'
    });
    const data = await res.json();
    
    if (res.ok) {
      showToast(`Đã từ chối yêu cầu thành công.`, 'info');
      fetchRequests();
    } else {
      showToast(data.error || 'Lỗi từ chối yêu cầu', 'error');
    }
  } catch (error) {
    showToast('Lỗi kết nối máy chủ!', 'error');
    console.error('Reject error:', error);
  }
};

// Search Filter Input
adminSearch.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderDashboard();
});

// Refresh Button click
btnRefresh.addEventListener('click', () => {
  fetchRequests(true);
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  fetchRequests();
  // Poll database every 5 seconds for new requests
  setInterval(fetchRequests, 5000);
});
