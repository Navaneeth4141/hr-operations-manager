// frontend/js/sidebar.js
// Shared sidebar toggle and notification functionality for all dashboard pages

const API_BASE = '/api';

/**
 * Toggle sidebar visibility on mobile
 */
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
}

/**
 * Helper to determine which portal the user is currently in based on URL
 */
function getCurrentPortal() {
  const path = window.location.pathname || '';
  if (path.includes('admin')) return 'admin';
  if (path.includes('hr-') || path.includes('manager-') || path.includes('interviewer-') || path.includes('team-')) return 'company';
  return 'applicant';
}

/**
 * Get stored authentication token
 */
function getToken() {
  return localStorage.getItem('hr_token_' + getCurrentPortal());
}

/**
 * Get stored user info
 */
function getUser() {
  const data = localStorage.getItem('hr_user_' + getCurrentPortal());
  if (data) return JSON.parse(data);
  return null;
}

/**
 * Check if user is authenticated, redirect to login if not
 */
function checkAuth(requiredRole) {
  const user = getUser();
  if (!user) {
    window.location.href = '/login';
    return null;
  }

  if (requiredRole && user.role !== requiredRole) {
    alert('Access denied. You do not have permission to view this page.');
    window.location.href = '/login';
    return null;
  }

  return user;
}

/**
 * Logout - clear storage and redirect
 */
function logout() {
  const portal = getCurrentPortal();
  localStorage.removeItem('hr_token_' + portal);
  localStorage.removeItem('hr_user_' + portal);
  window.location.href = '/';
}

/**
 * Make authenticated API request
 */
async function apiRequest(url, options = {}) {
  const token = getToken();
  const headers = {
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  // Only set Content-Type for JSON requests (not FormData)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(API_BASE + url, { ...options, headers });
  
  if (response.status === 401 || response.status === 403) {
    logout();
    return null;
  }

  return response;
}

/**
 * Set up the top navbar with user info and notifications
 */
function setupNavbar() {
  const user = getUser();
  if (!user) return;

  // Display user info
  const userInfoEl = document.getElementById('userInfo');
  if (userInfoEl) {
    userInfoEl.innerHTML = `<strong>${user.username}</strong>`;
  }

  // Setup logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  // Setup hamburger
  const hamburger = document.getElementById('hamburgerBtn');
  if (hamburger) {
    hamburger.addEventListener('click', toggleSidebar);
  }

  // Load notifications
  loadNotifications();
}

/**
 * Setup dark/light theme toggle
 */
function setupThemeToggle() {
  // Apply saved preference
  const saved = localStorage.getItem('hr_theme');
  if (saved === 'dark') document.body.classList.add('dark-theme');

  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  function updateIcon() {
    btn.textContent = document.body.classList.contains('dark-theme') ? '\u2600\uFE0F' : '\u263A';
    btn.title = document.body.classList.contains('dark-theme') ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  }
  updateIcon();

  btn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('hr_theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    updateIcon();
  });
}

/**
 * Load and display notifications
 */
async function loadNotifications() {
  try {
    // Get unread count
    const countRes = await apiRequest('/notifications/unread-count');
    if (countRes && countRes.ok) {
      const { count } = await countRes.json();
      const badge = document.getElementById('notifBadge');
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline' : 'none';
      }
    }

    // Setup bell click
    const bell = document.getElementById('notifBell');
    const dropdown = document.getElementById('notifDropdown');
    if (bell && dropdown) {
      bell.addEventListener('click', async function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('show');

        if (dropdown.classList.contains('show')) {
          // Mark all as read immediately
          apiRequest('/notifications/read-all', { method: 'PUT' });
          const badge = document.getElementById('notifBadge');
          if (badge) {
            badge.style.display = 'none';
            badge.textContent = '0';
          }

          // Load full notifications list
          const res = await apiRequest('/notifications');
          if (res && res.ok) {
            const notifications = await res.json();
            const listEl = document.getElementById('notifList');
            if (listEl) {
              if (notifications.length === 0) {
                listEl.innerHTML = '<div class="notif-item">No notifications</div>';
              } else {
                listEl.innerHTML = notifications.slice(0, 10).map(n => `
                  <div class="notif-item" 
                       onclick="markNotifRead('${n._id}', this)">
                    <div>${n.message}</div>
                    <div class="notif-time">${new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                `).join('');
              }
            }
          }
        }
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', function() {
        dropdown.classList.remove('show');
      });
    }
  } catch (err) {
    console.error('Failed to load notifications:', err);
  }
}

/**
 * Mark a notification as read
 */
async function markNotifRead(id, element) {
  try {
    await apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
    if (element) {
      element.classList.remove('unread');
    }
    // Refresh badge count
    const countRes = await apiRequest('/notifications/unread-count');
    if (countRes && countRes.ok) {
      const { count } = await countRes.json();
      const badge = document.getElementById('notifBadge');
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline' : 'none';
      }
    }
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
  }
}

/**
 * Get CSS class for status badge
 */
function getStatusBadgeClass(status) {
  const map = {
    'Applied': 'badge-applied',
    'HR Review': 'badge-hr-review',
    'Shortlisted': 'badge-shortlisted',
    'Rejected': 'badge-rejected',
    'Interview Scheduled': 'badge-interview-scheduled',
    'Interview Done': 'badge-interview-done',
    'Selected': 'badge-selected',
    'Offer Sent': 'badge-offer-sent',
    'Offer Accepted': 'badge-offer-accepted',
    'Offer Rejected': 'badge-offer-rejected',
    'Pass': 'badge-pass',
    'Fail': 'badge-fail',
    'Pending': 'badge-pending'
  };
  return map[status] || 'badge-applied';
}

/**
 * Show an alert message on the page
 */
function showAlert(msg, type) {
  const alertEl = document.getElementById('alertMsg');
  if (alertEl) {
    alertEl.textContent = msg;
    alertEl.className = 'alert-msg show ' + type;
    setTimeout(() => {
      alertEl.className = 'alert-msg';
    }, 4000);
  }
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}
