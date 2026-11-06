/**
 * Sainath Bus Reservation System
 * Frontend API Client & Global Helpers
 */

const API_BASE = '/api';

// Toast Notification Helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Global API Object
const api = {
  // Generic request wrapper
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json'
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Network request failed');
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  },

  // Auth Endpoints
  auth: {
    async me() {
      try {
        return await api.request('/auth/me', { method: 'GET' });
      } catch {
        return { authenticated: false, user: null };
      }
    },
    async login(email, password) {
      return await api.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
    },
    async register(userData) {
      return await api.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
    },
    async logout() {
      return await api.request('/auth/logout', { method: 'POST' });
    }
  },

  // User Profile Endpoints
  user: {
    async getProfile() {
      return await api.request('/user/profile', { method: 'GET' });
    },
    async updateProfile(name, phone) {
      return await api.request('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, phone })
      });
    },
    async changePassword(currentPassword, newPassword, confirmPassword) {
      return await api.request('/user/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });
    }
  },

  // Bus Endpoints
  buses: {
    async getCities() {
      return await api.request('/buses/cities', { method: 'GET' });
    },
    async search(params = {}) {
      const qs = new URLSearchParams();
      if (params.source) qs.append('source', params.source);
      if (params.destination) qs.append('destination', params.destination);
      if (params.date) qs.append('date', params.date);
      if (params.busType) qs.append('busType', params.busType);

      return await api.request(`/buses/search?${qs.toString()}`, { method: 'GET' });
    },
    async getDetails(busId) {
      return await api.request(`/buses/${busId}`, { method: 'GET' });
    },
    async getSeats(busId) {
      return await api.request(`/buses/${busId}/seats`, { method: 'GET' });
    }
  },

  // Booking Endpoints
  bookings: {
    async create(busId, passengers) {
      return await api.request('/bookings', {
        method: 'POST',
        body: JSON.stringify({ bus_id: busId, passengers })
      });
    },
    async getMyBookings() {
      return await api.request('/bookings/my-bookings', { method: 'GET' });
    },
    async getTicket(bookingRef) {
      return await api.request(`/bookings/ticket/${encodeURIComponent(bookingRef)}`, { method: 'GET' });
    },
    async cancel(bookingRef) {
      return await api.request(`/bookings/${encodeURIComponent(bookingRef)}/cancel`, { method: 'POST' });
    }
  },

  // Admin Endpoints
  admin: {
    async getDashboard() {
      return await api.request('/admin/dashboard', { method: 'GET' });
    },
    async addBus(bus) {
      return await api.request('/admin/buses', {
        method: 'POST',
        body: JSON.stringify(bus)
      });
    },
    async updateBus(busId, bus) {
      return await api.request(`/admin/buses/${busId}`, {
        method: 'PUT',
        body: JSON.stringify(bus)
      });
    },
    async removeBus(busId) {
      return await api.request(`/admin/buses/${busId}`, { method: 'DELETE' });
    },
    async restoreBus(busId) {
      return await api.request(`/admin/buses/${busId}/restore`, { method: 'PATCH' });
    },
    async updateBooking(bookingId, booking) {
      return await api.request(`/admin/bookings/${bookingId}`, {
        method: 'PUT',
        body: JSON.stringify(booking)
      });
    },
    async updateMember(memberId, member) {
      return await api.request(`/admin/members/${memberId}`, {
        method: 'PUT',
        body: JSON.stringify(member)
      });
    }
  }
};

// Update Navbar Authentication State
async function updateNavbarUser() {
  const authContainer = document.getElementById('navbar-auth');
  if (!authContainer) return;

  try {
    const res = await api.auth.me();
    if (res.authenticated && res.user) {
      const accountLink = res.user.role === 'ADMIN'
        ? '<a href="admin.html" class="nav-link" id="nav-admin-dashboard">📊 Admin Dashboard</a>'
        : '<a href="my-bookings.html" class="nav-link" id="nav-my-bookings"><span>🎫</span> My Bookings</a>';
      authContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 16px;">
          ${accountLink}
          <a href="profile.html" class="nav-link" id="nav-profile">
            <span>👤</span> Hi, ${escapeHtml(res.user.name.split(' ')[0])}
          </a>
          <button id="nav-logout-btn" class="btn btn-outline btn-sm">
            Logout
          </button>
        </div>
      `;

      document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
        try {
          await api.auth.logout();
          showToast('Logged out successfully', 'success');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 600);
        } catch (e) {
          showToast('Error logging out', 'error');
        }
      });
    } else {
      authContainer.innerHTML = `
        <a href="login.html" class="btn btn-outline btn-sm" id="nav-login-link">Login</a>
        <a href="register.html" class="btn btn-primary btn-sm" id="nav-register-link">Register</a>
      `;
    }
  } catch (err) {
    console.error('Navbar auth update failed', err);
  }
}

// String escaping helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Format currency in Indian Rupees
function formatINR(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

// Format 24-hr time to 12-hr with AM/PM
function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  let h = parseInt(hours, 10);
  const m = minutes || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // '0' -> 12
  return `${h}:${m} ${ampm}`;
}

// Format Date e.g. "Wed, 22 Oct 2026"
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// Auto-run on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  updateNavbarUser();
});
