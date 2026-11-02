/* ============================================================
   BuddyUp — Buddy Dashboard JS
   ============================================================ */

let CURRENT_USER     = null;
let VERIFY_FILTER    = 'all';
let VERIFY_TASK_ID   = null;
let VERIFY_EMP_ID    = null;
let ACTIVE_CHAT_EMP  = null;

document.addEventListener('DOMContentLoaded', () => {
  CURRENT_USER = requireAuth('buddy');
  if (!CURRENT_USER) return;

  initSidebar(CURRENT_USER);
  initLogout();
  initNotifications(CURRENT_USER.id);
  closeModalOnOverlay('scheduleMeetingModal');
  closeModalOnOverlay('evalModal');
  closeModalOnOverlay('verifyTaskModal');

  renderOverview();
  renderMenteesSection();
  renderVerifySection();
  renderScheduleSection();
  renderMessagesSection();
  renderEvaluationsSection();
  renderBuddyProfileSection();

  // Verify filter tabs
  document.getElementById('verifyFilterTabs').querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#verifyFilterTabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      VERIFY_FILTER = btn.dataset.filter;
      renderVerifyList();
    });
  });

  // Schedule meeting submit
  document.getElementById('scheduleMeetSubmit').addEventListener('click', scheduleMeeting);

  // Eval submit
  document.getElementById('evalSubmitBtn').addEventListener('click', submitEvaluation);

  // Chat send
  document.getElementById('buddyChatSend').addEventListener('click', sendBuddyMessage);
  document.getElementById('buddyChatInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendBuddyMessage(); });

  restoreSection('overview');
});

// ============================================================
// HELPERS
// ============================================================
function getMentees() {
  const db = getDB();
  const menteeIds = CURRENT_USER.menteeIds || [];
  return db.users.filter(u => menteeIds.includes(u.id));
}

function populateMenteeSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const mentees = getMentees();
  sel.innerHTML = mentees.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
}

// ============================================================
// OVERVIEW
// ============================================================
function renderOverview() {
  const mentees  = getMentees();
  const allMeets = getMeetingsForUser(CURRENT_USER.id, 'buddy');
  const upcoming = allMeets.filter(m => m.status === 'upcoming' && isUpcoming(m.date));

  // Pending verifications count
  const db = getDB();
  let pendingCount = 0;
  mentees.forEach(emp => {
    const template = db.templates.find(t => t.id === emp.templateId);
    if (!template) return;
    const allTasks = template.phases.flatMap(p => p.tasks);
    const prog = getProgress(emp.id);
    pendingCount += allTasks.filter(tid => prog[tid] === 'submitted').length;
  });

  document.getElementById('buddyWelcome').textContent = `Welcome back, ${CURRENT_USER.name.split(' ')[0]}! 🤝`;

  // Stats
  document.getElementById('buddyStats').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon blue">👥</div>
      <div class="stat-info"><div class="stat-value">${mentees.length}</div><div class="stat-label">Active Mentees</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon amber">⏳</div>
      <div class="stat-info"><div class="stat-value">${pendingCount}</div><div class="stat-label">Tasks to Verify</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon cyan">📅</div>
      <div class="stat-info"><div class="stat-value">${upcoming.length}</div><div class="stat-label">Upcoming Meetings</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green">📋</div>
      <div class="stat-info"><div class="stat-value">${getEvaluations(CURRENT_USER.id, null).length}</div><div class="stat-label">Evaluations Done</div></div>
    </div>
  `;

  // Pending verify badge
  const badge = document.getElementById('pendingVerifyBadge');
  if (badge) { badge.textContent = pendingCount; badge.style.display = pendingCount > 0 ? 'inline-block' : 'none'; }
  const countEl = document.getElementById('pendingVerifyCount');
  if (countEl) countEl.textContent = pendingCount;

  // Mentee summary
  document.getElementById('menteeSummaryList').innerHTML = mentees.length ? mentees.map(emp => {
    const pct = calcProgressPercent(emp.id, emp.templateId);
    return `
      <div style="display:flex;align-items:center;gap:.85rem;padding:.75rem 0;border-bottom:1px solid var(--border-light);">
        <div class="avatar">${emp.avatar}</div>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:.9rem;">${escapeHtml(emp.name)}</div>
          <div style="font-size:.76rem;color:var(--text-muted);">Day ${daysSince(emp.startDate)}</div>
          <div style="margin-top:.35rem;">
            <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
          </div>
        </div>
        <span style="font-size:.85rem;font-weight:700;color:var(--primary);">${pct}%</span>
      </div>
    `;
  }).join('') : '<div class="empty-state" style="padding:1rem 0;"><div class="empty-icon">👥</div><div class="empty-msg">No mentees assigned yet.</div></div>';

  // Pending verifications
  let pendingHtml = '';
  mentees.forEach(emp => {
    const template = db.templates.find(t => t.id === emp.templateId);
    if (!template) return;
    const allTasks = template.phases.flatMap(p => p.tasks);
    const prog = getProgress(emp.id);
    allTasks.filter(tid => prog[tid] === 'submitted').slice(0, 3).forEach(tid => {
      const t = db.tasks[tid];
      if (!t) return;
      pendingHtml += `
        <div style="display:flex;align-items:center;gap:.75rem;padding:.7rem 0;border-bottom:1px solid var(--border-light);">
          <div class="avatar avatar-sm">${emp.avatar}</div>
          <div style="flex:1;">
            <div style="font-size:.85rem;font-weight:600;">${escapeHtml(t.title)}</div>
            <div style="font-size:.75rem;color:var(--text-muted);">${escapeHtml(emp.name)}</div>
          </div>
          <button class="btn btn-success btn-sm" onclick="openVerifyModal('${tid}','${emp.id}')">Verify</button>
        </div>
      `;
    });
  });
  document.getElementById('pendingVerifyList').innerHTML = pendingHtml || '<div class="empty-state" style="padding:1rem 0;"><div class="empty-icon">✅</div><div class="empty-msg">All tasks verified!</div></div>';

  // Upcoming meetings
  document.getElementById('buddyUpcomingMeetings').innerHTML = upcoming.slice(0, 4).map(m => {
    const emp = getUserById(m.employeeId);
    return `
      <div style="display:flex;align-items:center;gap:.75rem;padding:.7rem 0;border-bottom:1px solid var(--border-light);">
        <div style="width:40px;height:40px;background:var(--primary-pale);border-radius:var(--radius-sm);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
          <span style="font-size:.6rem;font-weight:700;color:var(--primary);text-transform:uppercase;">${new Date(m.date).toLocaleString('en',{month:'short'})}</span>
          <span style="font-size:.9rem;font-weight:800;color:var(--primary);line-height:1;">${new Date(m.date).getDate()}</span>
        </div>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:.88rem;">${escapeHtml(m.title)}</div>
          <div style="font-size:.75rem;color:var(--text-muted);">${emp ? escapeHtml(emp.name) : '—'} · ${m.time}</div>
        </div>
      </div>
    `;
  }).join('') || '<div class="empty-state" style="padding:1rem 0;"><div class="empty-icon">📅</div><div class="empty-msg">No meetings scheduled</div></div>';
}

// ============================================================
// MENTEES SECTION
// ============================================================
function renderMenteesSection() {
  const db      = getDB();
  const mentees = getMentees();

  document.getElementById('menteeCardsGrid').innerHTML = mentees.length ? mentees.map(emp => {
    const pct      = calcProgressPercent(emp.id, emp.templateId);
    const prog     = getProgress(emp.id);
    const template = db.templates.find(t => t.id === emp.templateId);
    const allTasks = template ? template.phases.flatMap(p => p.tasks) : [];
    const verified  = allTasks.filter(id => prog[id] === 'verified').length;
    const submitted = allTasks.filter(id => prog[id] === 'submitted').length;
    const evals    = getEvaluations(CURRENT_USER.id, emp.id);
    const lastEval = evals[evals.length - 1];

    return `
      <div class="person-card">
        <div class="person-card-top">
          <div class="avatar avatar-lg">${emp.avatar}</div>
          <div class="person-info">
            <div class="person-name">${escapeHtml(emp.name)}</div>
            <div class="person-role">${emp.department}</div>
            <div style="margin-top:.25rem;">${getStatusBadge(emp.status)}</div>
          </div>
        </div>
        <div>
          <div class="progress-label"><span>Progress</span><span>${pct}%</span></div>
          <div class="progress-bar-wrap"><div class="progress-bar-fill ${pct===100?'success':''}" style="width:${pct}%"></div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem;text-align:center;background:var(--surface-2);border-radius:var(--radius-sm);padding:.75rem;">
          <div><div style="font-weight:800;font-size:1.1rem;color:var(--success);">${verified}</div><div style="font-size:.7rem;color:var(--text-muted);">Verified</div></div>
          <div><div style="font-weight:800;font-size:1.1rem;color:var(--warning);">${submitted}</div><div style="font-size:.7rem;color:var(--text-muted);">Pending</div></div>
          <div><div style="font-weight:800;font-size:1.1rem;color:var(--text-muted);">${daysSince(emp.startDate)}</div><div style="font-size:.7rem;color:var(--text-muted);">Days in</div></div>
        </div>
        ${lastEval ? `<div style="background:var(--primary-pale);border-radius:var(--radius-sm);padding:.6rem .85rem;font-size:.8rem;"><span class="text-muted">Last eval:</span> <span style="font-weight:600;">Wk ${lastEval.week} · ⭐ ${lastEval.rating.toFixed(1)}</span></div>` : ''}
        <div style="display:flex;gap:.5rem;">
          <button class="btn btn-primary btn-sm" style="flex:1;" onclick="setActiveChatEmp('${emp.id}');navigateTo('messages')">💬 Message</button>
          <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="openEvalModalForEmp('${emp.id}')">📋 Evaluate</button>
        </div>
      </div>
    `;
  }).join('') : '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">No Mentees Yet</div><div class="empty-msg">You will be assigned mentees soon.</div></div>';
}

// ============================================================
// TASK VERIFICATION
// ============================================================
function renderVerifySection() { renderVerifyList(); }

function renderVerifyList() {
  const db      = getDB();
  const mentees = getMentees();
  let html = '';

  mentees.forEach(emp => {
    const template = db.templates.find(t => t.id === emp.templateId);
    if (!template) return;
    const allTasks = template.phases.flatMap(p => p.tasks.map(tid => ({ tid, phName: p.name })));
    const prog     = getProgress(emp.id);

    const filtered = allTasks.filter(({ tid }) => {
      const st = prog[tid] || 'pending';
      if (VERIFY_FILTER === 'submitted') return st === 'submitted';
      if (VERIFY_FILTER === 'verified')  return st === 'verified';
      return st === 'submitted' || st === 'verified';
    });

    if (!filtered.length) return;

    html += `
      <div class="card mb-3">
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:.75rem;">
            <div class="avatar avatar-sm">${emp.avatar}</div>
            <div>
              <div class="card-title">${escapeHtml(emp.name)}</div>
              <div class="card-subtitle">${emp.department} · Day ${daysSince(emp.startDate)}</div>
            </div>
          </div>
        </div>
        <div class="card-body">
          ${filtered.map(({ tid, phName }) => {
            const t  = db.tasks[tid];
            const st = prog[tid] || 'pending';
            if (!t) return '';
            return `
              <div class="task-item">
                <div class="task-check ${st === 'verified' ? 'checked' : 'pending-verify'}">${st === 'verified' ? '✓' : '⏳'}</div>
                <div class="task-content">
                  <div class="task-title">${escapeHtml(t.title)}</div>
                  <div class="task-meta"><span class="badge ${getCategoryColor(t.category)}">${t.category}</span> <span class="text-xs text-muted">· ${phName}</span></div>
                </div>
                <div class="task-actions">
                  ${getStatusBadge(st)}
                  ${st === 'submitted' ? `<button class="btn btn-success btn-sm" onclick="openVerifyModal('${tid}','${emp.id}')">✓ Verify</button>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });

  document.getElementById('verifyTasksContainer').innerHTML = html || `
    <div class="empty-state">
      <div class="empty-icon">✅</div>
      <div class="empty-title">Nothing to review</div>
      <div class="empty-msg">${VERIFY_FILTER === 'submitted' ? 'No tasks awaiting verification.' : 'Switch filters to see all tasks.'}</div>
    </div>
  `;
}

function openVerifyModal(taskId, empId) {
  const db = getDB();
  const t  = db.tasks[taskId];
  const emp = getUserById(empId);
  VERIFY_TASK_ID = taskId;
  VERIFY_EMP_ID  = empId;
  document.getElementById('verifyTaskTitle').textContent   = t ? t.title : taskId;
  document.getElementById('verifyTaskEmployee').textContent = emp ? `Employee: ${emp.name}` : '';
  document.getElementById('confirmVerifyBtn').onclick = confirmVerify;
  document.getElementById('rejectTaskBtn').onclick    = rejectTask;
  openModal('verifyTaskModal');
}

function confirmVerify() {
  if (!VERIFY_TASK_ID || !VERIFY_EMP_ID) return;
  setTaskStatus(VERIFY_EMP_ID, VERIFY_TASK_ID, 'verified');
  closeModal('verifyTaskModal');
  showToast('Task Verified!', 'The employee has been notified.', 'success');
  VERIFY_TASK_ID = null; VERIFY_EMP_ID = null;
  renderVerifyList();
  renderOverview();
  renderMenteesSection();
}

function rejectTask() {
  if (!VERIFY_TASK_ID || !VERIFY_EMP_ID) return;
  setTaskStatus(VERIFY_EMP_ID, VERIFY_TASK_ID, 'pending');
  closeModal('verifyTaskModal');
  showToast('Task Returned', 'The task has been sent back to the employee.', 'warning');
  VERIFY_TASK_ID = null; VERIFY_EMP_ID = null;
  renderVerifyList();
  renderOverview();
}

// ============================================================
// SCHEDULE
// ============================================================
function renderScheduleSection() {
  const meetings = getMeetingsForUser(CURRENT_USER.id, 'buddy');
  renderMiniCalendar('miniCalendarBuddy', meetings);

  const sorted = [...meetings].sort((a, b) => new Date(a.date) - new Date(b.date));
  document.getElementById('buddyMeetingsList').innerHTML = sorted.length ? sorted.map(m => {
    const emp = getUserById(m.employeeId);
    return `
      <div style="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 0;border-bottom:1px solid var(--border-light);">
        <div style="width:44px;height:44px;background:${m.status==='completed'?'var(--border-light)':'var(--primary-pale)'};border-radius:var(--radius-sm);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
          <span style="font-size:.6rem;font-weight:700;color:${m.status==='completed'?'var(--text-muted)':'var(--primary)'};text-transform:uppercase;">${new Date(m.date).toLocaleString('en',{month:'short'})}</span>
          <span style="font-size:.9rem;font-weight:800;color:${m.status==='completed'?'var(--text-muted)':'var(--primary)'};line-height:1;">${new Date(m.date).getDate()}</span>
        </div>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:.88rem;">${escapeHtml(m.title)}</div>
          <div style="font-size:.75rem;color:var(--text-muted);">${emp ? escapeHtml(emp.name) : '—'} · ${m.time} · ${m.duration} min</div>
          ${m.notes ? `<div style="font-size:.75rem;color:var(--text-muted);margin-top:.2rem;font-style:italic;">"${escapeHtml(m.notes)}"</div>` : ''}
        </div>
        ${getStatusBadge(m.status)}
      </div>
    `;
  }).join('') : '<div class="empty-state" style="padding:1.5rem 0;"><div class="empty-icon">📅</div><div class="empty-msg">No meetings yet</div></div>';

  // Populate mentee select in modal
  populateMenteeSelect('meetMenteeSelect');
}

function scheduleMeeting() {
  const menteeId = document.getElementById('meetMenteeSelect').value;
  const title    = document.getElementById('meetTitle').value.trim();
  const type     = document.getElementById('meetType').value;
  const date     = document.getElementById('meetDate').value;
  const time     = document.getElementById('meetTime').value;
  const duration = document.getElementById('meetDuration').value;
  if (!title || !date || !time || !menteeId) { showToast('Missing Info', 'Please fill all required fields.', 'warning'); return; }

  addMeeting({ title, date, time, duration: Number(duration), buddyId: CURRENT_USER.id, employeeId: menteeId, type, status: 'upcoming', notes: '' });
  closeModal('scheduleMeetingModal');
  showToast('Meeting Scheduled!', `${title} on ${formatDate(date)}`, 'success');
  document.getElementById('meetTitle').value = '';
  renderScheduleSection();
  renderOverview();
}

// ============================================================
// MESSAGES
// ============================================================
function renderMessagesSection() {
  const mentees = getMentees();
  document.getElementById('conversationList').innerHTML = mentees.length ? mentees.map(emp => {
    const msgs   = getConversation(CURRENT_USER.id, emp.id);
    const unread = msgs.filter(m => m.to === CURRENT_USER.id && !m.read).length;
    const last   = msgs[msgs.length - 1];
    return `
      <div style="display:flex;align-items:center;gap:.75rem;padding:.8rem 0;border-bottom:1px solid var(--border-light);cursor:pointer;" 
           onclick="setActiveChatEmp('${emp.id}')" class="conv-item" data-emp="${emp.id}">
        <div class="avatar" style="position:relative;">
          ${emp.avatar}
          ${unread > 0 ? `<span style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;background:var(--danger);border-radius:50%;border:2px solid white;"></span>` : ''}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:${unread > 0 ? '700' : '600'};font-size:.88rem;">${escapeHtml(emp.name)}</div>
          <div style="font-size:.75rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${last ? escapeHtml(last.text.slice(0, 40)) + (last.text.length > 40 ? '…' : '') : 'No messages yet'}</div>
        </div>
        ${unread > 0 ? `<span class="badge badge-blue">${unread}</span>` : ''}
      </div>
    `;
  }).join('') : '<div class="empty-state" style="padding:1rem 0;"><div class="empty-icon">💬</div><div class="empty-msg">No mentees to message.</div></div>';

  if (ACTIVE_CHAT_EMP) {
    renderBuddyChatArea(ACTIVE_CHAT_EMP);
  }
}

function setActiveChatEmp(empId) {
  ACTIVE_CHAT_EMP = empId;
  renderBuddyChatArea(empId);
  // highlight active
  document.querySelectorAll('.conv-item').forEach(el => {
    el.style.background = el.dataset.emp === empId ? 'var(--primary-pale)' : '';
  });
}

function renderBuddyChatArea(empId) {
  const emp = getUserById(empId);
  if (!emp) return;

  document.getElementById('buddyChatHeader').innerHTML = `
    <div style="display:flex;align-items:center;gap:.75rem;">
      <div class="avatar">${emp.avatar}</div>
      <div>
        <div class="card-title">${escapeHtml(emp.name)}</div>
        <div style="font-size:.75rem;color:var(--text-muted);">${emp.department}</div>
      </div>
    </div>
  `;

  const msgs  = getConversation(CURRENT_USER.id, empId);
  const chatEl = document.getElementById('buddyChatMessages');
  chatEl.innerHTML = msgs.map(m => {
    const isMe   = m.from === CURRENT_USER.id;
    const sender = isMe ? CURRENT_USER : emp;
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
  markMessagesRead(CURRENT_USER.id, empId);
}

function sendBuddyMessage() {
  if (!ACTIVE_CHAT_EMP) { showToast('No Conversation', 'Please select a mentee first.', 'warning'); return; }
  const input = document.getElementById('buddyChatInput');
  const text  = input.value.trim();
  if (!text) return;
  sendMessage(CURRENT_USER.id, ACTIVE_CHAT_EMP, text);
  input.value = '';
  renderBuddyChatArea(ACTIVE_CHAT_EMP);
  renderMessagesSection();
}

// ============================================================
// EVALUATIONS
// ============================================================
function renderEvaluationsSection() {
  populateMenteeSelect('evalMenteeSelect');
  const evals = getEvaluations(CURRENT_USER.id, null);
  const db = getDB();

  document.getElementById('evaluationsList').innerHTML = evals.length ? evals.map(ev => {
    const emp = getUserById(ev.employeeId);
    const stars = '⭐'.repeat(Math.round(ev.rating)) + '☆'.repeat(5 - Math.round(ev.rating));
    return `
      <div class="card mb-3">
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:.75rem;">
            <div class="avatar">${emp ? emp.avatar : '?'}</div>
            <div>
              <div class="card-title">${emp ? escapeHtml(emp.name) : '—'} · Week ${ev.week}</div>
              <div class="card-subtitle">${formatDate(ev.date)}</div>
            </div>
          </div>
          <div style="font-size:1.1rem;">${stars}</div>
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:1rem;">
            ${[['Attitude',ev.scores.attitude],['Learning',ev.scores.learning],['Teamwork',ev.scores.teamwork],['Progress',ev.scores.progress]].map(([label, score]) => `
              <div style="text-align:center;background:var(--surface-2);border-radius:var(--radius-sm);padding:.75rem;">
                <div style="font-size:1.2rem;font-weight:800;color:var(--primary);">${score}/5</div>
                <div style="font-size:.72rem;color:var(--text-muted);">${label}</div>
              </div>
            `).join('')}
          </div>
          ${ev.notes ? `<div style="background:var(--primary-pale);border-radius:var(--radius-sm);padding:.75rem;font-size:.86rem;color:var(--text-muted);font-style:italic;">"${escapeHtml(ev.notes)}"</div>` : ''}
        </div>
      </div>
    `;
  }).join('') : '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No Evaluations Yet</div><div class="empty-msg">Create your first evaluation for a mentee.</div></div>';
}

function openNewEvalModal() {
  populateMenteeSelect('evalMenteeSelect');
  openModal('evalModal');
}

function openEvalModalForEmp(empId) {
  populateMenteeSelect('evalMenteeSelect');
  document.getElementById('evalMenteeSelect').value = empId;
  openModal('evalModal');
}

function submitEvaluation() {
  const empId    = document.getElementById('evalMenteeSelect').value;
  const week     = Number(document.getElementById('evalWeek').value);
  const attitude = Number(document.getElementById('evalAttitude').value);
  const learning = Number(document.getElementById('evalLearning').value);
  const teamwork = Number(document.getElementById('evalTeamwork').value);
  const progress = Number(document.getElementById('evalProgress').value);
  const notes    = document.getElementById('evalNotes').value.trim();

  if (!empId) { showToast('Missing Info', 'Please select a mentee.', 'warning'); return; }

  const rating = (attitude + learning + teamwork + progress) / 4;
  addEvaluation({
    buddyId: CURRENT_USER.id, employeeId: empId,
    date: new Date().toISOString().slice(0, 10),
    week, scores: { attitude, learning, teamwork, progress }, notes, rating
  });
  closeModal('evalModal');
  showToast('Evaluation Saved!', 'Progress recorded successfully.', 'success');
  document.getElementById('evalNotes').value = '';
  renderEvaluationsSection();
  renderOverview();
}

// ============================================================
// PROFILE SECTION — Buddy
// ============================================================
const BUDDY_PROFILE_EXTRAS_KEY = 'buddyup_profile_buddy_';

function getBuddyProfileExtras() {
  try { return JSON.parse(localStorage.getItem(BUDDY_PROFILE_EXTRAS_KEY + CURRENT_USER.id) || '{}'); } catch { return {}; }
}
function saveBuddyProfileExtras(data) {
  localStorage.setItem(BUDDY_PROFILE_EXTRAS_KEY + CURRENT_USER.id, JSON.stringify(data));
}

function renderBuddyProfileSection() {
  const u       = CURRENT_USER;
  const extras  = getBuddyProfileExtras();
  const mentees = getMentees();
  const meetings = getMeetingsForUser(u.id, 'buddy');
  const evals   = getEvaluations(u.id, null);
  const avgPct  = mentees.length
    ? Math.round(mentees.reduce((s, e) => s + calcProgressPercent(e.id, e.templateId), 0) / mentees.length)
    : 0;

  // Banner
  document.getElementById('buddyProfileBanner').innerHTML = `
    <div class="profile-banner-inner">
      <div class="profile-avatar-wrap">
        <div class="profile-avatar">${u.avatar}</div>
        <div class="profile-avatar-edit" onclick="showToast('Avatar','Photo upload not available in demo.','info')">✏️</div>
      </div>
      <div class="profile-banner-info">
        <div class="profile-banner-name">${escapeHtml(extras.name || u.name)}</div>
        <div class="profile-banner-role">Onboarding Buddy · ${u.department}</div>
        <div class="profile-banner-meta">
          <span>📧 ${escapeHtml(u.email)}</span>
          <span>🏢 ${u.department}</span>
          <span>📅 ${daysSince(u.startDate)} days at company</span>
          ${extras.phone ? `<span>📞 ${escapeHtml(extras.phone)}</span>` : ''}
        </div>
      </div>
      <div class="profile-banner-actions">
        <button class="btn btn-white btn-sm" onclick="navigateTo('mentees')">👥 My Mentees</button>
        <button class="btn btn-white btn-sm" onclick="navigateTo('evaluations')">📋 Evaluations</button>
      </div>
    </div>
  `;

  // Stats bar
  document.getElementById('buddyProfileStats').innerHTML = [
    { value: mentees.length,      label: 'Active Mentees'    },
    { value: meetings.length,     label: 'Total Meetings'    },
    { value: evals.length,        label: 'Evaluations Done'  },
    { value: `${avgPct}%`,        label: 'Avg. Mentee Progress' },
    { value: daysSince(u.startDate), label: 'Days at Company' },
  ].map(s => `
    <div class="profile-stat-cell">
      <div class="profile-stat-value">${s.value}</div>
      <div class="profile-stat-label">${s.label}</div>
    </div>
  `).join('');

  // Account info
  document.getElementById('buddyProfileInfo').innerHTML = `
    <div class="profile-info-list">
      <div class="profile-info-row"><span class="profile-info-key">Full Name</span><span class="profile-info-val">${escapeHtml(extras.name || u.name)}</span></div>
      <div class="profile-info-row"><span class="profile-info-key">Email</span><span class="profile-info-val">${escapeHtml(u.email)}</span></div>
      <div class="profile-info-row"><span class="profile-info-key">Department</span><span class="profile-info-val">${u.department}</span></div>
      <div class="profile-info-row"><span class="profile-info-key">Role</span><span class="profile-info-val">Onboarding Buddy</span></div>
      <div class="profile-info-row"><span class="profile-info-key">With Company</span><span class="profile-info-val">${daysSince(u.startDate)} days</span></div>
      <div class="profile-info-row"><span class="profile-info-key">Phone</span><span class="profile-info-val">${extras.phone || '—'}</span></div>
      <div class="profile-info-row"><span class="profile-info-key">Status</span><span class="profile-info-val">${getStatusBadge(u.status)}</span></div>
      ${extras.bio ? `<div class="profile-info-row" style="flex-direction:column;align-items:flex-start;gap:.4rem;"><span class="profile-info-key">Bio</span><span style="font-size:.85rem;color:var(--text-muted);font-style:italic;line-height:1.5;">"${escapeHtml(extras.bio)}"</span></div>` : ''}
    </div>
  `;

  // Pre-fill edit form
  document.getElementById('buddyEditName').value  = extras.name  || u.name;
  document.getElementById('buddyEditBio').value   = extras.bio   || '';
  document.getElementById('buddyEditPhone').value = extras.phone || '';

  // Expertise tags
  const defaultTags = ['Mentoring', 'Communication', 'Leadership', u.department, 'Onboarding'];
  const tags = extras.skills || defaultTags;
  document.getElementById('buddyProfileTags').innerHTML = `
    <div class="tag-group">${tags.map(t => `<span class="tag purple">${escapeHtml(t)}</span>`).join('')}</div>
    <div style="font-size:.78rem;color:var(--text-muted);">Visible to your mentees and HR.</div>
  `;

  // Mentees overview in profile
  document.getElementById('buddyProfileMentees').innerHTML = mentees.length ? mentees.map(emp => {
    const pct = calcProgressPercent(emp.id, emp.templateId);
    return `
      <div style="display:flex;align-items:center;gap:.85rem;padding:.75rem 0;border-bottom:1px solid var(--border-light);">
        <div class="avatar">${emp.avatar}</div>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:.88rem;">${escapeHtml(emp.name)}</div>
          <div style="font-size:.75rem;color:var(--text-muted);">${emp.department} · Day ${daysSince(emp.startDate)}</div>
          <div style="margin-top:.3rem;"><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div></div>
        </div>
        <span style="font-size:.85rem;font-weight:800;color:var(--primary);">${pct}%</span>
      </div>
    `;
  }).join('') : '<div class="text-sm text-muted" style="padding:.75rem 0;">No mentees assigned yet.</div>';

  // Activity
  const activities = [
    { icon:'✅', color:'green',  title:`Verified task for ${mentees[0]?.name || 'mentee'}`,     time:'Recently' },
    { icon:'📋', color:'purple', title:`Submitted evaluation`,                                    time:'Recently' },
    { icon:'📅', color:'blue',   title:`Scheduled ${meetings.length} meetings total`,             time:`Ongoing` },
    { icon:'🤝', color:'amber',  title:`Became a buddy · ${mentees.length} mentees guided`,       time:formatDate(u.startDate) },
  ];
  document.getElementById('buddyProfileActivity').innerHTML = activities.map(a => `
    <div class="profile-activity-item">
      <div class="activity-dot ${a.color}">${a.icon}</div>
      <div class="activity-info">
        <div class="activity-title">${a.title}</div>
        <div class="activity-time">${a.time}</div>
      </div>
    </div>
  `).join('');
}

let BUDDY_PROFILE_EDITING = false;
function toggleBuddyProfileEdit() {
  BUDDY_PROFILE_EDITING = !BUDDY_PROFILE_EDITING;
  document.getElementById('buddyProfileEditForm').style.display = BUDDY_PROFILE_EDITING ? 'block' : 'none';
}

function saveBuddyProfileEdit() {
  const name  = document.getElementById('buddyEditName').value.trim();
  const bio   = document.getElementById('buddyEditBio').value.trim();
  const phone = document.getElementById('buddyEditPhone').value.trim();
  if (!name) { showToast('Name Required', '', 'warning'); return; }
  const extras = getBuddyProfileExtras();
  Object.assign(extras, { name, bio, phone });
  saveBuddyProfileExtras(extras);
  const nameEl = document.getElementById('sidebarUserName');
  if (nameEl) nameEl.textContent = name;
  toggleBuddyProfileEdit();
  renderBuddyProfileSection();
  showToast('Profile Updated!', 'Your changes have been saved.', 'success');
}
