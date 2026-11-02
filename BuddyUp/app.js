/* ============================================================
   BuddyUp — Shared App Utilities (auth, routing, UI helpers)
   ============================================================ */

// ============================================================
// AUTH GUARD
// ============================================================
function requireAuth(allowedRole) {
  const user = loadSession();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  if (allowedRole && user.role !== allowedRole) {
    // redirect to correct dashboard
    redirectToDashboard(user.role);
    return null;
  }
  return user;
}

function redirectToDashboard(role) {
  const map = { employee: 'dashboard-employee.html', buddy: 'dashboard-buddy.html', admin: 'dashboard-admin.html' };
  window.location.href = map[role] || 'index.html';
}

// ============================================================
// SIDEBAR + NAVIGATION
// ============================================================
function initSidebar(currentUser) {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  const hamburger= document.getElementById('hamburgerBtn');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }

  // populate user info
  const nameEl   = document.getElementById('sidebarUserName');
  const roleEl   = document.getElementById('sidebarUserRole');
  const avatarEl = document.getElementById('sidebarAvatar');
  const hNameEl  = document.getElementById('headerUserName');
  const hAvatEl  = document.getElementById('headerAvatar');

  const roleLabel = { employee: 'New Employee', buddy: 'Onboarding Buddy', admin: 'HR / Admin' };
  if (nameEl)   nameEl.textContent   = currentUser.name;
  if (roleEl)   roleEl.textContent   = roleLabel[currentUser.role] || currentUser.role;
  if (avatarEl) avatarEl.textContent = currentUser.avatar || currentUser.name.slice(0,2).toUpperCase();
  if (hNameEl)  hNameEl.textContent  = currentUser.name.split(' ')[0];
  if (hAvatEl)  hAvatEl.textContent  = currentUser.avatar || currentUser.name.slice(0,2).toUpperCase();

  // nav items
  document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      navigateTo(section);
      // close sidebar on mobile
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  });
}

function navigateTo(sectionId) {
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  const target = document.getElementById('section-' + sectionId);
  if (target) { target.classList.add('active'); target.classList.add('fade-in'); }

  const navBtn = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
  if (navBtn) navBtn.classList.add('active');

  // update header title
  const titleEl = document.getElementById('headerTitle');
  if (titleEl && navBtn) {
    const span = navBtn.querySelector('span');
    if (span) titleEl.textContent = span.textContent;
  }

  // store active
  sessionStorage.setItem('buddyup_section_' + window.location.pathname, sectionId);
}

function restoreSection(fallback) {
  const key = 'buddyup_section_' + window.location.pathname;
  const stored = sessionStorage.getItem(key);
  navigateTo(stored || fallback);
}

// ============================================================
// NOTIFICATIONS
// ============================================================
function initNotifications(userId) {
  const btn   = document.getElementById('notifBtn');
  const panel = document.getElementById('notifPanel');
  const dot   = document.getElementById('notifDot');

  function updateBadge() {
    const unread = getNotifications(userId).filter(n => !n.read);
    if (dot) dot.style.display = unread.length > 0 ? 'block' : 'none';
    // also update nav badge if present
    const navBadge = document.getElementById('notifNavBadge');
    if (navBadge) {
      navBadge.textContent = unread.length;
      navBadge.style.display = unread.length > 0 ? 'inline-block' : 'none';
    }
  }

  function renderPanel() {
    if (!panel) return;
    const notifs = getNotifications(userId).slice(0, 8);
    const icons = { meeting:'📅', task:'✅', resource:'📚', admin:'🔔', default:'🔔' };
    panel.innerHTML = `
      <div class="notif-header">
        <span>Notifications</span>
        <button class="btn btn-ghost btn-sm" onclick="markAllNotifsRead('${userId}'); renderNotifPanel(); updateNotifBadge();">Mark all read</button>
      </div>
      ${notifs.length === 0 ? '<div class="empty-state" style="padding:1.5rem;"><div class="empty-icon">🔔</div><div class="empty-msg">No notifications</div></div>' : ''}
      ${notifs.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifRead('${n.id}'); this.classList.remove('unread'); document.getElementById('notifDot') && updateNotifBadge();">
          <div class="notif-dot-indicator" style="${n.read ? 'opacity:0' : ''}"></div>
          <div>
            <div class="notif-text">${n.text}</div>
            <div class="notif-time">${n.time}</div>
          </div>
        </div>
      `).join('')}
    `;
  }

  // expose for re-use
  window.renderNotifPanel  = renderPanel;
  window.updateNotifBadge  = updateBadge;

  if (btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) renderPanel();
    });
  }

  document.addEventListener('click', () => { if (panel) panel.classList.remove('open'); });
  if (panel) panel.addEventListener('click', e => e.stopPropagation());

  updateBadge();
}

// ============================================================
// LOGOUT
// ============================================================
function initLogout() {
  document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      clearSession();
      window.location.href = 'index.html';
    });
  });
}

// ============================================================
// TOAST
// ============================================================
function showToast(title, msg, type = 'info', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { info:'ℹ️', success:'✅', warning:'⚠️', error:'❌' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
    </div>
    <button class="toast-close" onclick="this.closest('.toast').remove()">✕</button>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// ============================================================
// MODAL HELPERS
// ============================================================
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
}

function closeModalOnOverlay(id) {
  const m = document.getElementById(id);
  if (m) {
    m.addEventListener('click', e => { if (e.target === m) closeModal(id); });
  }
}

// ============================================================
// DATE HELPERS
// ============================================================
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function daysAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff} days ago`;
}

function daysSince(dateStr) {
  return Math.floor((new Date() - new Date(dateStr)) / 86400000);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function isUpcoming(dateStr) { return new Date(dateStr) >= new Date(); }

// ============================================================
// MISC UI
// ============================================================
function initTabs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // find tab panels within nearest parent with data-tab-panels
      const panels = container.parentElement.querySelectorAll('.tab-panel');
      panels.forEach(p => { p.style.display = p.dataset.tab === target ? 'block' : 'none'; });
    });
  });
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getCategoryColor(cat) {
  const map = { admin:'badge-blue', technical:'badge-purple', social:'badge-cyan', learning:'badge-green' };
  return map[cat] || 'badge-gray';
}

function getStatusBadge(status) {
  const map = {
    verified:   { cls:'badge-green',  label:'Verified'   },
    submitted:  { cls:'badge-amber',  label:'Submitted'  },
    pending:    { cls:'badge-gray',   label:'Pending'    },
    upcoming:   { cls:'badge-blue',   label:'Upcoming'   },
    completed:  { cls:'badge-green',  label:'Completed'  },
    active:     { cls:'badge-green',  label:'Active'     },
    inactive:   { cls:'badge-gray',   label:'Inactive'   },
  };
  const s = map[status] || { cls:'badge-gray', label: status };
  return `<span class="badge ${s.cls}">${s.label}</span>`;
}

// Calendar mini
function renderMiniCalendar(containerId, events) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const dayNames = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  const eventDates = new Set((events || []).map(e => e.date));

  let html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;">
      <span style="font-weight:700;font-size:.9rem;">${monthName}</span>
    </div>
    <div class="calendar-grid">
      ${dayNames.map(d => `<div class="calendar-header-cell">${d}</div>`).join('')}
      ${Array(firstDay).fill('<div></div>').join('')}
      ${Array.from({length: daysInMonth}, (_, i) => {
        const day = i + 1;
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const isToday = day === now.getDate();
        const hasEvent = eventDates.has(dateStr);
        return `<div class="calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}" title="${hasEvent ? 'Event on this day' : ''}">${day}</div>`;
      }).join('')}
    </div>
  `;
  container.innerHTML = html;
}

// Progress ring (SVG)
function progressRing(percent, size = 80, strokeWidth = 8) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;
  const color = percent >= 75 ? '#10b981' : percent >= 40 ? '#2563eb' : '#f59e0b';
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="${strokeWidth}"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"
        stroke-dasharray="${dash} ${circ}" stroke-dashoffset="0"
        transform="rotate(-90 ${size/2} ${size/2})" stroke-linecap="round"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="Plus Jakarta Sans, sans-serif" font-size="${size/5}px" font-weight="700" fill="#0f172a">${percent}%</text>
    </svg>
  `;
}
