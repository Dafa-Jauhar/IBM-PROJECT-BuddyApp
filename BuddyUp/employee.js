/* ============================================================
   BuddyUp — Employee Dashboard JS
   ============================================================ */

let CURRENT_USER = null;
let TASK_FILTER  = 'all';
let SUBMIT_TASK_ID = null;

document.addEventListener('DOMContentLoaded', () => {
  CURRENT_USER = requireAuth('employee');
  if (!CURRENT_USER) return;

  initSidebar(CURRENT_USER);
  initLogout();
  initNotifications(CURRENT_USER.id);
  closeModalOnOverlay('requestMeetingModal');
  closeModalOnOverlay('taskSubmitModal');

  renderOverview();
  renderProgressSection();
  renderTasksSection();
  renderScheduleSection();
  renderResourcesSection();
  renderBuddySection();
  renderMessagesSection();
  renderAnnouncementsSection();
  renderProfileSection();

  // Task filter tabs
  document.getElementById('taskFilterTabs').querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#taskFilterTabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      TASK_FILTER = btn.dataset.filter;
      renderTasksList();
    });
  });

  // Resource search
  document.getElementById('resourceSearch').addEventListener('input', e => {
    renderResourcesGrid(e.target.value.toLowerCase());
  });

  // Meeting request submit
  document.getElementById('reqMeetSubmitBtn').addEventListener('click', submitMeetingRequest);

  // Task submit confirm
  document.getElementById('taskSubmitConfirmBtn').addEventListener('click', confirmTaskSubmit);

  // Chat send
  document.getElementById('chatSendBtn').addEventListener('click', sendChatMessage);
  document.getElementById('chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendChatMessage(); });

  restoreSection('overview');
});

// ============================================================
// OVERVIEW
// ============================================================
function renderOverview() {
  const db  = getDB();
  const u   = CURRENT_USER;
  const pct = calcProgressPercent(u.id, u.templateId);
  const prog = getProgress(u.id);
  const template = db.templates.find(t => t.id === u.templateId);
  const allTasks = template ? template.phases.flatMap(p => p.tasks) : [];
  const verified  = allTasks.filter(id => prog[id] === 'verified').length;
  const submitted = allTasks.filter(id => prog[id] === 'submitted').length;
  const pending   = allTasks.filter(id => !prog[id] || prog[id] === 'pending').length;
  const dayIn     = daysSince(u.startDate);
  const buddy     = getUserById(u.buddyId);
  const meetings  = getMeetingsForUser(u.id, 'employee').filter(m => m.status === 'upcoming' && isUpcoming(m.date));

  // Welcome message
  document.getElementById('welcomeMsg').textContent = `Welcome back, ${u.name.split(' ')[0]}! 👋`;
  document.getElementById('welcomeSub').textContent  = `Day ${dayIn} of your onboarding journey. ${pct >= 50 ? "You're doing great!" : "Keep going, you've got this!"}`;

  // Stats
  document.getElementById('overviewStats').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon blue">📅</div>
      <div class="stat-info"><div class="stat-value">${dayIn}</div><div class="stat-label">Days in Company</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green">✅</div>
      <div class="stat-info"><div class="stat-value">${verified}</div><div class="stat-label">Tasks Verified</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon amber">⏳</div>
      <div class="stat-info"><div class="stat-value">${submitted}</div><div class="stat-label">Awaiting Review</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon cyan">📅</div>
      <div class="stat-info"><div class="stat-value">${meetings.length}</div><div class="stat-label">Upcoming Meetings</div></div>
    </div>
  `;

  // Progress ring + next tasks
  document.getElementById('progressRing').innerHTML = progressRing(pct, 90, 9);
  document.getElementById('progressTitle').textContent = pct >= 75 ? 'Almost there!' : pct >= 40 ? 'Keep it up!' : 'Just getting started!';
  document.getElementById('progressDesc').textContent  = `${verified} of ${allTasks.length} tasks completed`;

  const currentPhaseIdx = template ? template.phases.findIndex(p => p.tasks.some(tid => !prog[tid] || prog[tid] === 'pending' || prog[tid] === 'submitted')) : 0;
  document.getElementById('progressPhaseLabel').textContent = template ? `Phase ${currentPhaseIdx + 1} of ${template.phases.length}` : '';

  if (template) {
    const phase = template.phases[Math.max(currentPhaseIdx, 0)];
    const phaseDone = phase ? phase.tasks.filter(tid => prog[tid] === 'verified').length : 0;
    const phaseTotal = phase ? phase.tasks.length : 1;
    document.getElementById('phaseProgress').innerHTML = `
      <div class="progress-label"><span>${phase ? phase.name : ''}</span><span>${phaseDone}/${phaseTotal}</span></div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${Math.round(phaseDone/phaseTotal*100)}%"></div></div>
    `;
  }

  // Next pending tasks
  const nextTasks = allTasks.filter(id => !prog[id] || prog[id] === 'pending').slice(0, 3);
  document.getElementById('nextTasksList').innerHTML = nextTasks.length ? `
    <div style="font-size:.8rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.5rem;">Up next</div>
    ${nextTasks.map(tid => {
      const t = db.tasks[tid];
      return t ? `<div class="task-item">
        <div class="task-check" onclick="openTaskSubmit('${tid}')">+</div>
        <div class="task-content"><div class="task-title">${escapeHtml(t.title)}</div><div class="task-meta"><span class="badge ${getCategoryColor(t.category)}">${t.category}</span></div></div>
      </div>` : '';
    }).join('')}
  ` : '<div class="text-sm text-success" style="padding:.5rem 0;font-weight:600;">🎉 All tasks in current phase complete!</div>';

  // Upcoming meetings
  const upcomingMeetings = meetings.slice(0, 3);
  document.getElementById('upcomingMeetingsList').innerHTML = upcomingMeetings.length ? upcomingMeetings.map(m => `
    <div style="display:flex;align-items:center;gap:.75rem;padding:.7rem 0;border-bottom:1px solid var(--border-light);">
      <div style="width:44px;height:44px;background:var(--primary-pale);border-radius:var(--radius-sm);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
        <span style="font-size:.65rem;font-weight:700;color:var(--primary);text-transform:uppercase;">${new Date(m.date).toLocaleString('en',{month:'short'})}</span>
        <span style="font-size:1rem;font-weight:800;color:var(--primary);line-height:1;">${new Date(m.date).getDate()}</span>
      </div>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:.88rem;">${escapeHtml(m.title)}</div>
        <div style="font-size:.76rem;color:var(--text-muted);">${m.time} · ${m.duration} min</div>
      </div>
      ${getStatusBadge(m.status)}
    </div>
  `).join('') : '<div class="empty-state" style="padding:1.5rem 0;"><div class="empty-icon">📅</div><div class="empty-msg">No upcoming meetings</div></div>';

  // Buddy card
  if (buddy) {
    document.getElementById('buddyCardContent').innerHTML = `
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;">
        <div class="avatar avatar-lg">${buddy.avatar}</div>
        <div>
          <div style="font-weight:700;">${escapeHtml(buddy.name)}</div>
          <div class="text-muted text-sm">${buddy.department}</div>
          <div style="margin-top:.3rem;"><span class="badge badge-green">Your Buddy</span></div>
        </div>
      </div>
      <div class="divider"></div>
      <div style="font-size:.84rem;color:var(--text-muted);line-height:1.6;">
        <div>📧 ${buddy.email}</div>
        <div style="margin-top:.3rem;">🏢 ${buddy.department} Department</div>
      </div>
      <div style="margin-top:1rem;display:flex;gap:.5rem;">
        <button class="btn btn-primary btn-sm" onclick="navigateTo('messages')">💬 Message</button>
        <button class="btn btn-secondary btn-sm" onclick="navigateTo('schedule')">📅 Schedule</button>
      </div>
    `;
  } else {
    document.getElementById('buddyCardContent').innerHTML = '<div class="empty-state" style="padding:1rem 0;"><div class="empty-icon">👤</div><div class="empty-msg">No buddy assigned yet. Contact HR.</div></div>';
  }

  // Announcements preview
  const anns = getAnnouncements().slice(0, 2);
  document.getElementById('announcementsPreview').innerHTML = anns.map(a => `
    <div style="padding:.75rem;background:var(--surface-2);border-radius:var(--radius-sm);border:1px solid var(--border-light);margin-bottom:.5rem;">
      ${a.pinned ? '<span class="badge badge-blue" style="margin-bottom:.35rem;">📌 Pinned</span>' : ''}
      <div style="font-weight:600;font-size:.9rem;">${escapeHtml(a.title)}</div>
      <div style="font-size:.78rem;color:var(--text-muted);margin-top:.2rem;">${escapeHtml(a.text.slice(0, 80))}…</div>
      <div style="font-size:.72rem;color:var(--text-light);margin-top:.3rem;">${formatDate(a.date)} · ${a.by}</div>
    </div>
  `).join('');
}

// ============================================================
// PROGRESS SECTION
// ============================================================
function renderProgressSection() {
  const db   = getDB();
  const u    = CURRENT_USER;
  const pct  = calcProgressPercent(u.id, u.templateId);
  const prog = getProgress(u.id);
  const template = db.templates.find(t => t.id === u.templateId);

  document.getElementById('progressHeaderRing').innerHTML = progressRing(pct, 80, 8);

  if (!template) {
    document.getElementById('progressPhasesContainer').innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No Template Assigned</div><div class="empty-msg">Contact HR to assign an onboarding template.</div></div>';
    return;
  }

  document.getElementById('progressPhasesContainer').innerHTML = template.phases.map((phase, pi) => {
    const totalPhase = phase.tasks.length;
    const donePh = phase.tasks.filter(tid => prog[tid] === 'verified').length;
    const phPct  = Math.round((donePh / totalPhase) * 100);
    const isActive = phase.tasks.some(tid => !prog[tid] || prog[tid] === 'pending' || prog[tid] === 'submitted');

    return `
      <div class="card mb-3">
        <div class="card-header">
          <div>
            <div class="card-title" style="display:flex;align-items:center;gap:.5rem;">
              ${isActive ? '<span style="color:var(--primary);">▶</span>' : ''} Phase ${pi + 1}: ${escapeHtml(phase.name)}
            </div>
            <div class="card-subtitle">${donePh} / ${totalPhase} tasks complete</div>
          </div>
          <div style="display:flex;align-items:center;gap:.75rem;">
            <div style="width:120px;">
              <div class="progress-bar-wrap"><div class="progress-bar-fill ${phPct === 100 ? 'success' : ''}" style="width:${phPct}%"></div></div>
            </div>
            <span style="font-size:.85rem;font-weight:700;color:${phPct===100?'var(--success)':'var(--primary)'};">${phPct}%</span>
          </div>
        </div>
        <div class="card-body">
          ${phase.tasks.map(tid => {
            const t  = db.tasks[tid];
            const st = prog[tid] || 'pending';
            if (!t) return '';
            const checkIcon = st === 'verified' ? '✓' : st === 'submitted' ? '⏳' : '';
            return `
              <div class="task-item">
                <div class="task-check ${st === 'verified' ? 'checked' : st === 'submitted' ? 'pending-verify' : ''}"
                  ${st === 'pending' ? `onclick="openTaskSubmit('${tid}')"` : ''}
                  title="${st === 'pending' ? 'Click to submit' : st}">${checkIcon}</div>
                <div class="task-content">
                  <div class="task-title" style="${st==='verified'?'text-decoration:line-through;color:var(--text-muted);':''}">${escapeHtml(t.title)}</div>
                  <div class="task-meta">
                    <span class="badge ${getCategoryColor(t.category)}">${t.category}</span>
                    ${t.resourceId ? `<span class="text-xs text-primary" style="margin-left:.4rem;">📎 Resource available</span>` : ''}
                  </div>
                </div>
                <div class="task-actions">
                  ${getStatusBadge(st)}
                  ${st === 'pending' ? `<button class="btn btn-primary btn-sm" onclick="openTaskSubmit('${tid}')">Submit</button>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// TASKS SECTION
// ============================================================
function renderTasksSection() { renderTasksList(); }

function renderTasksList() {
  const db   = getDB();
  const u    = CURRENT_USER;
  const prog = getProgress(u.id);
  const template = db.templates.find(t => t.id === u.templateId);
  if (!template) { document.getElementById('tasksListContainer').innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-msg">No template assigned.</div></div>'; return; }

  const allTasks = template.phases.flatMap(p => p.tasks.map(tid => ({ tid, phName: p.name })));

  const filtered = allTasks.filter(({ tid }) => {
    const st = prog[tid] || 'pending';
    if (TASK_FILTER === 'all') return true;
    return st === TASK_FILTER;
  });

  document.getElementById('tasksListContainer').innerHTML = filtered.length ? filtered.map(({ tid, phName }) => {
    const t  = db.tasks[tid];
    const st = prog[tid] || 'pending';
    if (!t) return '';
    const checkIcon = st === 'verified' ? '✓' : st === 'submitted' ? '⏳' : '';
    return `
      <div class="task-item">
        <div class="task-check ${st === 'verified' ? 'checked' : st === 'submitted' ? 'pending-verify' : ''}"
          ${st === 'pending' ? `onclick="openTaskSubmit('${tid}')"` : ''}>${checkIcon}</div>
        <div class="task-content">
          <div class="task-title">${escapeHtml(t.title)}</div>
          <div class="task-meta">
            <span class="badge ${getCategoryColor(t.category)}">${t.category}</span>
            <span class="text-xs text-muted" style="margin-left:.4rem;">· ${phName}</span>
          </div>
        </div>
        <div class="task-actions">
          ${getStatusBadge(st)}
          ${st === 'pending' ? `<button class="btn btn-primary btn-sm" onclick="openTaskSubmit('${tid}')">Submit</button>` : ''}
        </div>
      </div>
    `;
  }).join('') : `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">No tasks here</div><div class="empty-msg">Try a different filter.</div></div>`;
}

function openTaskSubmit(taskId) {
  const db = getDB();
  const t  = db.tasks[taskId];
  SUBMIT_TASK_ID = taskId;
  document.getElementById('taskSubmitName').textContent = t ? t.title : taskId;
  document.getElementById('taskSubmitNotes').value = '';
  openModal('taskSubmitModal');
}

function confirmTaskSubmit() {
  if (!SUBMIT_TASK_ID) return;
  setTaskStatus(CURRENT_USER.id, SUBMIT_TASK_ID, 'submitted');
  closeModal('taskSubmitModal');
  showToast('Task Submitted!', 'Waiting for your buddy to verify.', 'success');
  SUBMIT_TASK_ID = null;
  renderTasksList();
  renderProgressSection();
  renderOverview();
}

// ============================================================
// SCHEDULE
// ============================================================
function renderScheduleSection() {
  const meetings = getMeetingsForUser(CURRENT_USER.id, 'employee');
  renderMiniCalendar('miniCalendarEmployee', meetings);

  const sorted = [...meetings].sort((a, b) => new Date(a.date) - new Date(b.date));
  document.getElementById('scheduleListEmployee').innerHTML = sorted.length ? sorted.map(m => `
    <div style="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 0;border-bottom:1px solid var(--border-light);">
      <div style="width:44px;height:44px;background:${m.status==='completed'?'var(--border-light)':'var(--primary-pale)'};border-radius:var(--radius-sm);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
        <span style="font-size:.6rem;font-weight:700;color:${m.status==='completed'?'var(--text-muted)':'var(--primary)'};text-transform:uppercase;">${new Date(m.date).toLocaleString('en',{month:'short'})}</span>
        <span style="font-size:.95rem;font-weight:800;color:${m.status==='completed'?'var(--text-muted)':'var(--primary)'};line-height:1;">${new Date(m.date).getDate()}</span>
      </div>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:.9rem;">${escapeHtml(m.title)}</div>
        <div style="font-size:.76rem;color:var(--text-muted);">${m.time} · ${m.duration} min</div>
        ${m.notes ? `<div style="font-size:.76rem;color:var(--text-muted);margin-top:.2rem;font-style:italic;">"${escapeHtml(m.notes)}"</div>` : ''}
      </div>
      ${getStatusBadge(m.status)}
    </div>
  `).join('') : '<div class="empty-state" style="padding:1.5rem 0;"><div class="empty-icon">📅</div><div class="empty-msg">No meetings yet</div></div>';
}

function submitMeetingRequest() {
  const title    = document.getElementById('reqMeetTitle').value.trim();
  const date     = document.getElementById('reqMeetDate').value;
  const time     = document.getElementById('reqMeetTime').value;
  const duration = document.getElementById('reqMeetDuration').value;
  if (!title || !date || !time) { showToast('Missing Info', 'Please fill in all fields.', 'warning'); return; }

  addMeeting({
    title, date, time, duration: Number(duration),
    buddyId: CURRENT_USER.buddyId,
    employeeId: CURRENT_USER.id,
    type: 'checkin',
    status: 'upcoming',
    notes: ''
  });
  closeModal('requestMeetingModal');
  showToast('Meeting Requested!', 'Your buddy will confirm the time.', 'success');
  document.getElementById('reqMeetTitle').value = '';
  renderScheduleSection();
}

// ============================================================
// RESOURCES
// ============================================================
function renderResourcesSection() { renderResourcesGrid(''); }

function renderResourcesGrid(query) {
  const user = CURRENT_USER;
  const resources = getResources(user.department).filter(r =>
    !query || r.title.toLowerCase().includes(query) || r.category.toLowerCase().includes(query)
  );
  const typeIcon = { document:'📄', video:'🎬', slides:'📊' };
  document.getElementById('resourcesGrid').innerHTML = resources.length ? resources.map(r => `
    <div class="card" style="cursor:pointer;" onclick="showToast('Opening Resource','${escapeHtml(r.title)}','info')">
      <div class="card-body">
        <div style="font-size:2rem;margin-bottom:.75rem;">${typeIcon[r.type] || '📎'}</div>
        <div style="font-weight:700;margin-bottom:.3rem;">${escapeHtml(r.title)}</div>
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.75rem;">
          <span class="badge badge-blue">${r.category}</span>
          <span class="badge badge-gray">${r.type}</span>
        </div>
        <div style="font-size:.76rem;color:var(--text-muted);">${r.downloads} downloads</div>
        <button class="btn btn-primary btn-sm" style="margin-top:.75rem;width:100%;" onclick="event.stopPropagation();showToast('Download Started','${escapeHtml(r.title)}','success')">⬇ Download</button>
      </div>
    </div>
  `).join('') : '<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-title">No resources found</div></div>';
}

// ============================================================
// BUDDY SECTION
// ============================================================
function renderBuddySection() {
  const buddy    = CURRENT_USER.buddyId ? getUserById(CURRENT_USER.buddyId) : null;
  const meetings = getMeetingsForUser(CURRENT_USER.id, 'employee').filter(m => m.status === 'completed');

  if (buddy) {
    document.getElementById('buddyProfileCard').innerHTML = `
      <div class="card">
        <div class="card-body">
          <div style="text-align:center;padding:1rem 0 1.25rem;">
            <div class="avatar avatar-xl" style="margin:0 auto 1rem;">${buddy.avatar}</div>
            <div style="font-size:1.1rem;font-weight:800;">${escapeHtml(buddy.name)}</div>
            <div class="text-muted text-sm">${buddy.department}</div>
            <div style="margin:.75rem 0;"><span class="badge badge-green">Active Buddy</span></div>
          </div>
          <div class="divider"></div>
          <div style="display:flex;flex-direction:column;gap:.6rem;font-size:.85rem;">
            <div style="display:flex;justify-content:space-between;"><span class="text-muted">Email</span><span style="font-weight:500;">${buddy.email}</span></div>
            <div style="display:flex;justify-content:space-between;"><span class="text-muted">Department</span><span style="font-weight:500;">${buddy.department}</span></div>
            <div style="display:flex;justify-content:space-between;"><span class="text-muted">With Company</span><span style="font-weight:500;">${daysSince(buddy.startDate)} days</span></div>
          </div>
          <div style="margin-top:1.25rem;display:flex;gap:.5rem;">
            <button class="btn btn-primary" style="flex:1;" onclick="navigateTo('messages')">💬 Message</button>
            <button class="btn btn-secondary" style="flex:1;" onclick="navigateTo('schedule')">📅 Meet</button>
          </div>
        </div>
      </div>
    `;
  } else {
    document.getElementById('buddyProfileCard').innerHTML = `
      <div class="card">
        <div class="card-body">
          <div class="empty-state"><div class="empty-icon">👤</div><div class="empty-title">No Buddy Assigned</div><div class="empty-msg">Contact HR to get paired with a buddy.</div></div>
        </div>
      </div>
    `;
  }

  document.getElementById('buddyMeetingHistory').innerHTML = meetings.length ? meetings.map(m => `
    <div style="padding:.75rem 0;border-bottom:1px solid var(--border-light);">
      <div style="font-weight:600;font-size:.88rem;">${escapeHtml(m.title)}</div>
      <div style="font-size:.76rem;color:var(--text-muted);">${formatDate(m.date)} · ${m.duration} min</div>
      ${m.notes ? `<div style="font-size:.78rem;color:var(--text-muted);margin-top:.3rem;font-style:italic;">"${escapeHtml(m.notes)}"</div>` : ''}
    </div>
  `).join('') : '<div class="empty-state" style="padding:1.5rem 0;"><div class="empty-icon">📝</div><div class="empty-msg">No completed meetings yet</div></div>';
}

// ============================================================
// MESSAGES
// ============================================================
function renderMessagesSection() {
  const buddy = CURRENT_USER.buddyId ? getUserById(CURRENT_USER.buddyId) : null;
  if (!buddy) {
    document.getElementById('chatMessages').innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><div class="empty-msg">No buddy assigned yet.</div></div>';
    return;
  }

  document.getElementById('chatHeader').innerHTML = `
    <div style="display:flex;align-items:center;gap:.75rem;">
      <div class="avatar">${buddy.avatar}</div>
      <div>
        <div class="card-title">${escapeHtml(buddy.name)}</div>
        <div style="font-size:.75rem;color:var(--text-muted);">${buddy.department}</div>
      </div>
    </div>
    <span class="badge badge-green">● Online</span>
  `;

  renderChatMessages();
  markMessagesRead(CURRENT_USER.id, buddy.id);
}

function renderChatMessages() {
  const buddy = getUserById(CURRENT_USER.buddyId);
  if (!buddy) return;
  const msgs = getConversation(CURRENT_USER.id, buddy.id);
  const chatEl = document.getElementById('chatMessages');

  chatEl.innerHTML = msgs.map(m => {
    const isMe = m.from === CURRENT_USER.id;
    const sender = isMe ? CURRENT_USER : buddy;
    return `
      <div style="display:flex;align-items:flex-end;gap:.5rem;${isMe ? 'flex-direction:row-reverse;' : ''}">
        <div class="avatar avatar-sm">${sender.avatar}</div>
        <div style="max-width:70%;background:${isMe ? 'var(--primary)' : 'var(--surface)'};color:${isMe ? 'white' : 'var(--text)'};
          border-radius:${isMe ? '12px 12px 0 12px' : '12px 12px 12px 0'};
          padding:.6rem .9rem;border:1px solid ${isMe ? 'transparent' : 'var(--border)'};
          box-shadow:var(--shadow);font-size:.87rem;line-height:1.5;">
          ${escapeHtml(m.text)}
          <div style="font-size:.65rem;margin-top:.3rem;opacity:${isMe?'.7':'1'};color:${isMe?'rgba(255,255,255,.7)':'var(--text-light)'};">${formatTime(m.timestamp)}</div>
        </div>
      </div>
    `;
  }).join('');

  chatEl.scrollTop = chatEl.scrollHeight;
}

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const text  = input.value.trim();
  if (!text || !CURRENT_USER.buddyId) return;
  sendMessage(CURRENT_USER.id, CURRENT_USER.buddyId, text);
  input.value = '';
  renderChatMessages();
}

// ============================================================
// ANNOUNCEMENTS
// ============================================================
function renderAnnouncementsSection() {
  const anns = getAnnouncements();
  document.getElementById('announcementsList').innerHTML = anns.map(a => `
    <div class="card">
      <div class="card-body">
        ${a.pinned ? '<span class="badge badge-blue" style="margin-bottom:.5rem;">📌 Pinned</span>' : ''}
        <div style="font-size:1rem;font-weight:700;margin-bottom:.35rem;">${escapeHtml(a.title)}</div>
        <div style="font-size:.9rem;color:var(--text-muted);line-height:1.6;margin-bottom:.5rem;">${escapeHtml(a.text)}</div>
        <div style="font-size:.75rem;color:var(--text-light);">${formatDate(a.date)} · Posted by ${a.by}</div>
      </div>
    </div>
  `).join('');
}

// ============================================================
// PROFILE SECTION — Employee
// ============================================================
const EMP_PROFILE_EXTRAS_KEY = 'buddyup_profile_employee_';

function getEmpProfileExtras() {
  try { return JSON.parse(localStorage.getItem(EMP_PROFILE_EXTRAS_KEY + CURRENT_USER.id) || '{}'); } catch { return {}; }
}
function saveEmpProfileExtras(data) {
  localStorage.setItem(EMP_PROFILE_EXTRAS_KEY + CURRENT_USER.id, JSON.stringify(data));
}

function renderProfileSection() {
  const u      = CURRENT_USER;
  const db     = getDB();
  const extras = getEmpProfileExtras();
  const pct    = calcProgressPercent(u.id, u.templateId);
  const prog   = getProgress(u.id);
  const template = db.templates.find(t => t.id === u.templateId);
  const allTasks = template ? template.phases.flatMap(p => p.tasks) : [];
  const verified  = allTasks.filter(id => prog[id] === 'verified').length;
  const buddy     = u.buddyId ? getUserById(u.buddyId) : null;
  const meetings  = getMeetingsForUser(u.id, 'employee');
  const roleLabel = { employee: 'New Employee', buddy: 'Onboarding Buddy', admin: 'HR / Admin' };

  // Banner
  document.getElementById('empProfileBanner').innerHTML = `
    <div class="profile-banner-inner">
      <div class="profile-avatar-wrap">
        <div class="profile-avatar">${u.avatar}</div>
        <div class="profile-avatar-edit" title="Change avatar" onclick="showToast('Avatar','Photo upload is not available in demo.','info')">✏️</div>
      </div>
      <div class="profile-banner-info">
        <div class="profile-banner-name">${escapeHtml(extras.name || u.name)}</div>
        <div class="profile-banner-role">${roleLabel[u.role]} · ${u.department}</div>
        <div class="profile-banner-meta">
          <span>📧 ${escapeHtml(u.email)}</span>
          <span>🗓 Joined ${formatDate(u.startDate)}</span>
          <span>📍 Day ${daysSince(u.startDate)} of onboarding</span>
          ${extras.phone ? `<span>📞 ${escapeHtml(extras.phone)}</span>` : ''}
        </div>
      </div>
      <div class="profile-banner-actions">
        <button class="btn btn-white btn-sm" onclick="navigateTo('messages')">💬 Message Buddy</button>
        <button class="btn btn-white btn-sm" onclick="navigateTo('progress')">📊 My Progress</button>
      </div>
    </div>
  `;

  // Stats bar
  document.getElementById('empProfileStats').innerHTML = [
    { value: daysSince(u.startDate),   label: 'Days at Company' },
    { value: `${pct}%`,                label: 'Onboarding Progress' },
    { value: verified,                  label: 'Tasks Verified' },
    { value: meetings.length,           label: 'Total Meetings' },
    { value: buddy ? buddy.name.split(' ')[0] : 'None', label: 'My Buddy' },
  ].map(s => `
    <div class="profile-stat-cell">
      <div class="profile-stat-value">${s.value}</div>
      <div class="profile-stat-label">${s.label}</div>
    </div>
  `).join('');

  // Account info rows
  document.getElementById('empProfileInfo').innerHTML = `
    <div class="profile-info-list">
      <div class="profile-info-row"><span class="profile-info-key">Full Name</span><span class="profile-info-val">${escapeHtml(extras.name || u.name)}</span></div>
      <div class="profile-info-row"><span class="profile-info-key">Email</span><span class="profile-info-val">${escapeHtml(u.email)}</span></div>
      <div class="profile-info-row"><span class="profile-info-key">Department</span><span class="profile-info-val">${u.department}</span></div>
      <div class="profile-info-row"><span class="profile-info-key">Role</span><span class="profile-info-val">${roleLabel[u.role]}</span></div>
      <div class="profile-info-row"><span class="profile-info-key">Start Date</span><span class="profile-info-val">${formatDate(u.startDate)}</span></div>
      <div class="profile-info-row"><span class="profile-info-key">Phone</span><span class="profile-info-val">${extras.phone || '—'}</span></div>
      <div class="profile-info-row"><span class="profile-info-key">Status</span><span class="profile-info-val">${getStatusBadge(u.status)}</span></div>
      ${extras.bio ? `<div class="profile-info-row" style="flex-direction:column;align-items:flex-start;gap:.4rem;"><span class="profile-info-key">About</span><span style="font-size:.85rem;color:var(--text-muted);font-style:italic;line-height:1.5;">"${escapeHtml(extras.bio)}"</span></div>` : ''}
    </div>
  `;

  // Pre-fill edit form
  document.getElementById('empEditName').value  = extras.name  || u.name;
  document.getElementById('empEditBio').value   = extras.bio   || '';
  document.getElementById('empEditPhone').value = extras.phone || '';

  // Tags / interests
  const defaultTags = ['Communication', 'Problem Solving', 'Teamwork', u.department];
  const tags = extras.skills || defaultTags;
  document.getElementById('empProfileTags').innerHTML = `
    <div class="tag-group">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
    <div style="font-size:.78rem;color:var(--text-muted);">These skills are visible to your buddy and HR.</div>
  `;

  // Journey (template phases)
  if (template) {
    document.getElementById('empProfileJourney').innerHTML = `
      <div style="margin-bottom:1rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem;">
          <span style="font-weight:600;font-size:.9rem;">Overall Progress</span>
          <span style="font-weight:800;font-size:1.1rem;color:var(--primary);">${pct}%</span>
        </div>
        <div class="progress-bar-wrap" style="height:10px;">
          <div class="progress-bar-fill" style="width:${pct}%;"></div>
        </div>
      </div>
      ${template.phases.map((ph, i) => {
        const done  = ph.tasks.filter(tid => prog[tid] === 'verified').length;
        const phPct = Math.round(done / ph.tasks.length * 100);
        return `
          <div style="padding:.65rem 0;border-bottom:1px solid var(--border-light);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.3rem;">
              <span style="font-size:.85rem;font-weight:600;">${i+1}. ${escapeHtml(ph.name)}</span>
              <span style="font-size:.8rem;font-weight:700;color:${phPct===100?'var(--success)':'var(--primary)'};">${phPct}%</span>
            </div>
            <div class="progress-bar-wrap">
              <div class="progress-bar-fill ${phPct===100?'success':''}" style="width:${phPct}%;"></div>
            </div>
          </div>
        `;
      }).join('')}
    `;
  } else {
    document.getElementById('empProfileJourney').innerHTML = '<div class="empty-state" style="padding:1rem 0;"><div class="empty-icon">📋</div><div class="empty-msg">No template assigned.</div></div>';
  }

  // Activity
  const activities = [
    { icon:'✅', color:'green', title:'Task verified by buddy',       time: 'Recently' },
    { icon:'📅', color:'blue',  title:'Meeting scheduled with buddy', time: `${daysSince(u.startDate)} days ago` },
    { icon:'🎓', color:'purple',title:'Started onboarding journey',   time: formatDate(u.startDate) },
    { icon:'📋', color:'amber', title:'Onboarding template assigned', time: formatDate(u.startDate) },
  ];
  document.getElementById('empProfileActivity').innerHTML = activities.map(a => `
    <div class="profile-activity-item">
      <div class="activity-dot ${a.color}">${a.icon}</div>
      <div class="activity-info">
        <div class="activity-title">${a.title}</div>
        <div class="activity-time">${a.time}</div>
      </div>
    </div>
  `).join('');
}

let EMP_PROFILE_EDITING = false;
function toggleProfileEdit() {
  EMP_PROFILE_EDITING = !EMP_PROFILE_EDITING;
  document.getElementById('empProfileEditForm').style.display = EMP_PROFILE_EDITING ? 'block' : 'none';
}

function saveProfileEdit() {
  const name  = document.getElementById('empEditName').value.trim();
  const bio   = document.getElementById('empEditBio').value.trim();
  const phone = document.getElementById('empEditPhone').value.trim();
  if (!name) { showToast('Name Required', 'Display name cannot be empty.', 'warning'); return; }
  const extras = getEmpProfileExtras();
  Object.assign(extras, { name, bio, phone });
  saveEmpProfileExtras(extras);
  // update sidebar name live
  const nameEl = document.getElementById('sidebarUserName');
  if (nameEl) nameEl.textContent = name;
  toggleProfileEdit();
  renderProfileSection();
  showToast('Profile Updated!', 'Your changes have been saved.', 'success');
}
