/* ============================================================
   BuddyUp — HR/Admin Dashboard JS
   ============================================================ */

let CURRENT_USER    = null;
let EMP_SEARCH      = '';
let DELETE_CALLBACK = null;

document.addEventListener('DOMContentLoaded', () => {
  CURRENT_USER = requireAuth('admin');
  if (!CURRENT_USER) return;

  initSidebar(CURRENT_USER);
  initLogout();
  initNotifications(CURRENT_USER.id);

  // Close modals on overlay click
  ['addEmployeeModal','editEmployeeModal','addBuddyModal','addTemplateModal',
   'addResourceModal','addAnnouncementModal','confirmDeleteModal'].forEach(id => closeModalOnOverlay(id));

  // Render all sections
  renderAnalytics();
  renderEmployeesSection();
  renderBuddiesSection();
  renderAssignmentsSection();
  renderTemplatesSection();
  renderResourcesSection();
  renderAnnouncementsSection();
  renderAdminProfileSection();

  // Employee search
  document.getElementById('empSearch').addEventListener('input', e => {
    EMP_SEARCH = e.target.value.toLowerCase();
    renderEmployeesTable();
  });

  // Add Employee
  document.getElementById('addEmpSubmit').addEventListener('click', addNewEmployee);

  // Edit Employee
  document.getElementById('editEmpSubmit').addEventListener('click', saveEmployeeEdit);

  // Add Buddy
  document.getElementById('addBuddySubmit').addEventListener('click', addNewBuddy);

  // Assignments
  document.getElementById('createAssignmentBtn').addEventListener('click', createAssignment);

  // Add Template
  document.getElementById('addTplSubmit').addEventListener('click', addNewTemplate);

  // Add Resource
  document.getElementById('addResSubmit').addEventListener('click', addNewResource);

  // Add Announcement
  document.getElementById('addAnnSubmit').addEventListener('click', addNewAnnouncement);

  restoreSection('analytics');
});

// ============================================================
// ANALYTICS
// ============================================================
function renderAnalytics() {
  const db       = getDB();
  const employees = getEmployees();
  const buddies   = getBuddies();
  const allMeets  = db.meetings;

  // Compute aggregate stats
  let totalVerified = 0, totalSubmitted = 0, totalPending = 0;
  employees.forEach(emp => {
    const template = db.templates.find(t => t.id === emp.templateId);
    if (!template) return;
    const allTasks = template.phases.flatMap(p => p.tasks);
    const prog = getProgress(emp.id);
    totalVerified  += allTasks.filter(id => prog[id] === 'verified').length;
    totalSubmitted += allTasks.filter(id => prog[id] === 'submitted').length;
    totalPending   += allTasks.filter(id => !prog[id] || prog[id] === 'pending').length;
  });

  const avgProgress = employees.length
    ? Math.round(employees.reduce((sum, e) => sum + calcProgressPercent(e.id, e.templateId), 0) / employees.length)
    : 0;

  // Stats
  document.getElementById('adminStats').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon blue">👤</div>
      <div class="stat-info"><div class="stat-value">${employees.length}</div><div class="stat-label">Active Employees</div><div class="stat-change up">↑ Onboarding</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green">🤝</div>
      <div class="stat-info"><div class="stat-value">${buddies.length}</div><div class="stat-label">Active Buddies</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon amber">📊</div>
      <div class="stat-info"><div class="stat-value">${avgProgress}%</div><div class="stat-label">Avg. Progress</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon cyan">📅</div>
      <div class="stat-info"><div class="stat-value">${allMeets.length}</div><div class="stat-label">Total Meetings</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon purple">✅</div>
      <div class="stat-info"><div class="stat-value">${totalVerified}</div><div class="stat-label">Tasks Verified</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon red">⏳</div>
      <div class="stat-info"><div class="stat-value">${totalSubmitted}</div><div class="stat-label">Awaiting Verify</div></div>
    </div>
  `;

  // Progress chart (bar chart per employee)
  const chartEl      = document.getElementById('progressChart');
  const chartLabels  = document.getElementById('progressChartLabels');
  chartEl.innerHTML  = employees.map(emp => {
    const pct = calcProgressPercent(emp.id, emp.templateId);
    const h   = Math.max(pct, 4);
    return `<div class="chart-bar" style="height:${h}%" title="${emp.name}: ${pct}%"></div>`;
  }).join('');
  chartLabels.innerHTML = employees.map(emp => `<div class="chart-label">${emp.name.split(' ')[0]}</div>`).join('');

  // Task status distribution
  const total = totalVerified + totalSubmitted + totalPending || 1;
  document.getElementById('taskStatusChart').innerHTML = [
    { label: 'Verified',   count: totalVerified,  color: 'var(--success)', cls:'badge-green' },
    { label: 'Submitted',  count: totalSubmitted, color: 'var(--warning)', cls:'badge-amber' },
    { label: 'Pending',    count: totalPending,   color: 'var(--border)',  cls:'badge-gray'  },
  ].map(item => `
    <div>
      <div style="display:flex;justify-content:space-between;margin-bottom:.3rem;">
        <span style="font-size:.85rem;font-weight:500;">${item.label}</span>
        <span style="font-size:.85rem;font-weight:700;">${item.count} <span class="text-muted" style="font-weight:400;">(${Math.round(item.count/total*100)}%)</span></span>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" style="width:${Math.round(item.count/total*100)}%;background:${item.color};"></div>
      </div>
    </div>
  `).join('');

  // Employee status table
  document.getElementById('empStatusTable').innerHTML = `
    <div class="table-wrapper" style="margin:0 -1.4rem;">
      <table>
        <thead><tr><th>Employee</th><th>Progress</th><th>Status</th></tr></thead>
        <tbody>
          ${employees.map(emp => {
            const pct = calcProgressPercent(emp.id, emp.templateId);
            return `
              <tr>
                <td><div style="display:flex;align-items:center;gap:.5rem;"><div class="avatar avatar-sm">${emp.avatar}</div> ${escapeHtml(emp.name)}</div></td>
                <td style="width:150px;">
                  <div style="display:flex;align-items:center;gap:.5rem;">
                    <div style="flex:1;"><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div></div>
                    <span style="font-size:.78rem;font-weight:700;width:30px;">${pct}%</span>
                  </div>
                </td>
                <td>${getStatusBadge(emp.status)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Activity timeline
  const activities = [
    { text: 'Kevin Liu started onboarding', date: '2026-11-01', status: 'current' },
    { text: 'Alex Johnson submitted "Dev environment setup"', date: '2026-10-31', status: 'completed' },
    { text: 'Maria Santos verified 3 tasks', date: '2026-10-30', status: 'completed' },
    { text: 'David Chen submitted evaluation for Alex', date: '2026-10-28', status: 'completed' },
    { text: 'New resource added: Git Workflow Fundamentals', date: '2026-10-26', status: 'completed' },
  ];
  document.getElementById('activityTimeline').innerHTML = activities.map(a => `
    <div class="timeline-item ${a.status}">
      <div class="timeline-content">
        <div class="timeline-title">${a.text}</div>
        <div class="timeline-date">${formatDate(a.date)}</div>
      </div>
    </div>
  `).join('');
}

// ============================================================
// EMPLOYEES
// ============================================================
function renderEmployeesSection() { renderEmployeesTable(); }

function renderEmployeesTable() {
  const db        = getDB();
  const employees = getEmployees().filter(e =>
    !EMP_SEARCH || e.name.toLowerCase().includes(EMP_SEARCH) || e.email.toLowerCase().includes(EMP_SEARCH) || e.department.toLowerCase().includes(EMP_SEARCH)
  );

  document.getElementById('employeesTableBody').innerHTML = employees.map(emp => {
    const buddy = emp.buddyId ? getUserById(emp.buddyId) : null;
    const pct   = calcProgressPercent(emp.id, emp.templateId);
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:.75rem;">
            <div class="avatar">${emp.avatar}</div>
            <div>
              <div style="font-weight:600;">${escapeHtml(emp.name)}</div>
              <div style="font-size:.75rem;color:var(--text-muted);">${emp.email}</div>
            </div>
          </div>
        </td>
        <td>${emp.department}</td>
        <td>${formatDate(emp.startDate)}</td>
        <td>${buddy ? `<div style="display:flex;align-items:center;gap:.5rem;"><div class="avatar avatar-sm">${buddy.avatar}</div>${escapeHtml(buddy.name)}</div>` : '<span class="badge badge-amber">Unassigned</span>'}</td>
        <td style="width:130px;">
          <div style="display:flex;align-items:center;gap:.5rem;">
            <div style="flex:1;"><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div></div>
            <span style="font-size:.78rem;font-weight:700;">${pct}%</span>
          </div>
        </td>
        <td>${getStatusBadge(emp.status)}</td>
        <td>
          <div style="display:flex;gap:.4rem;">
            <button class="btn btn-ghost btn-sm" onclick="openEditEmployee('${emp.id}')">✏️</button>
            <button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="confirmDelete('${emp.id}','employee')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="7"><div class="empty-state" style="padding:2rem;"><div class="empty-icon">👤</div><div class="empty-msg">No employees found.</div></div></td></tr>`;
}

function addNewEmployee() {
  const name     = document.getElementById('newEmpName').value.trim();
  const email    = document.getElementById('newEmpEmail').value.trim();
  const dept     = document.getElementById('newEmpDept').value;
  const start    = document.getElementById('newEmpStart').value;
  const password = document.getElementById('newEmpPassword').value.trim();
  if (!name || !email || !start) { showToast('Missing Fields', 'Name, email and start date are required.', 'warning'); return; }

  addUser({ name, email, password, role:'employee', department:dept, startDate:start, buddyId:null, templateId:null, avatar:getInitials(name), status:'active' });
  closeModal('addEmployeeModal');
  showToast('Employee Added!', `${name} has been added.`, 'success');
  document.getElementById('newEmpName').value = '';
  document.getElementById('newEmpEmail').value = '';
  renderEmployeesTable();
  renderAnalytics();
  renderAssignmentsSection();
}

function openEditEmployee(empId) {
  const emp = getUserById(empId);
  if (!emp) return;
  document.getElementById('editEmpId').value        = empId;
  document.getElementById('editEmpName').value      = emp.name;
  document.getElementById('editEmpDept').value      = emp.department;
  document.getElementById('editEmpStatus').value    = emp.status;
  openModal('editEmployeeModal');
}

function saveEmployeeEdit() {
  const id   = document.getElementById('editEmpId').value;
  const name = document.getElementById('editEmpName').value.trim();
  const dept = document.getElementById('editEmpDept').value;
  const status = document.getElementById('editEmpStatus').value;
  if (!name) { showToast('Missing Fields', 'Name is required.', 'warning'); return; }
  updateUser(id, { name, department: dept, status, avatar: getInitials(name) });
  closeModal('editEmployeeModal');
  showToast('Employee Updated!', '', 'success');
  renderEmployeesTable();
  renderAnalytics();
}

// ============================================================
// BUDDIES
// ============================================================
function renderBuddiesSection() {
  const db      = getDB();
  const buddies = getBuddies();

  document.getElementById('buddyManageGrid').innerHTML = buddies.length ? buddies.map(buddy => {
    const mentees    = (buddy.menteeIds || []).map(id => getUserById(id)).filter(Boolean);
    const avgProgress = mentees.length
      ? Math.round(mentees.reduce((s, e) => s + calcProgressPercent(e.id, e.templateId), 0) / mentees.length)
      : 0;
    const meetings = getMeetingsForUser(buddy.id, 'buddy').length;
    const evals    = getEvaluations(buddy.id, null).length;

    return `
      <div class="person-card">
        <div class="person-card-top">
          <div class="avatar avatar-lg">${buddy.avatar}</div>
          <div class="person-info">
            <div class="person-name">${escapeHtml(buddy.name)}</div>
            <div class="person-role">${buddy.department}</div>
            ${getStatusBadge(buddy.status)}
          </div>
        </div>
        <div class="divider"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem;text-align:center;background:var(--surface-2);border-radius:var(--radius-sm);padding:.75rem;">
          <div><div style="font-weight:800;font-size:1.1rem;color:var(--primary);">${mentees.length}</div><div style="font-size:.7rem;color:var(--text-muted);">Mentees</div></div>
          <div><div style="font-weight:800;font-size:1.1rem;color:var(--success);">${meetings}</div><div style="font-size:.7rem;color:var(--text-muted);">Meetings</div></div>
          <div><div style="font-weight:800;font-size:1.1rem;color:var(--accent);">${evals}</div><div style="font-size:.7rem;color:var(--text-muted);">Evals</div></div>
        </div>
        ${mentees.length > 0 ? `
          <div>
            <div style="font-size:.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.4rem;">Mentees Progress</div>
            <div class="progress-label"><span>Avg. Progress</span><span>${avgProgress}%</span></div>
            <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${avgProgress}%"></div></div>
          </div>
        ` : '<div class="text-xs text-muted text-center" style="padding:.5rem 0;">No mentees assigned</div>'}
        <div style="display:flex;gap:.5rem;">
          <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="confirmDelete('${buddy.id}','buddy')">🗑️ Remove</button>
        </div>
      </div>
    `;
  }).join('') : '<div class="empty-state"><div class="empty-icon">🤝</div><div class="empty-title">No Buddies</div><div class="empty-msg">Add buddies to get started.</div></div>';
}

function addNewBuddy() {
  const name     = document.getElementById('newBuddyName').value.trim();
  const email    = document.getElementById('newBuddyEmail').value.trim();
  const dept     = document.getElementById('newBuddyDept').value;
  const password = document.getElementById('newBuddyPassword').value.trim();
  if (!name || !email) { showToast('Missing Fields', 'Name and email are required.', 'warning'); return; }

  addUser({ name, email, password, role:'buddy', department:dept, startDate:new Date().toISOString().slice(0,10), buddyId:null, templateId:null, avatar:getInitials(name), status:'active', menteeIds:[] });
  closeModal('addBuddyModal');
  showToast('Buddy Added!', `${name} can now be assigned to employees.`, 'success');
  document.getElementById('newBuddyName').value = '';
  document.getElementById('newBuddyEmail').value = '';
  renderBuddiesSection();
  renderAnalytics();
  renderAssignmentsSection();
}

// ============================================================
// ASSIGNMENTS
// ============================================================
function renderAssignmentsSection() {
  const db         = getDB();
  const employees  = getEmployees();
  const buddies    = getBuddies();
  const templates  = getTemplates();
  const unassigned = employees.filter(e => !e.buddyId);

  // Unassigned count
  document.getElementById('unassignedCount').textContent = unassigned.length;

  // Unassigned list
  document.getElementById('unassignedEmpList').innerHTML = unassigned.length ? unassigned.map(emp => `
    <div style="display:flex;align-items:center;gap:.75rem;padding:.75rem 0;border-bottom:1px solid var(--border-light);">
      <div class="avatar">${emp.avatar}</div>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:.88rem;">${escapeHtml(emp.name)}</div>
        <div style="font-size:.76rem;color:var(--text-muted);">${emp.department} · Started ${formatDate(emp.startDate)}</div>
      </div>
      <span class="badge badge-amber">Needs Buddy</span>
    </div>
  `).join('') : '<div class="empty-state" style="padding:1.5rem 0;"><div class="empty-icon">✅</div><div class="empty-msg">All employees are assigned!</div></div>';

  // Populate selects
  const empSel = document.getElementById('assignEmpSelect');
  empSel.innerHTML = employees.map(e => `<option value="${e.id}">${escapeHtml(e.name)} (${e.department})</option>`).join('');

  const buddySel = document.getElementById('assignBuddySelect');
  buddySel.innerHTML = buddies.map(b => `<option value="${b.id}">${escapeHtml(b.name)} — ${(b.menteeIds||[]).length} mentees</option>`).join('');

  const tplSel = document.getElementById('assignTemplateSelect');
  tplSel.innerHTML = templates.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');

  // Assignments table
  document.getElementById('assignmentsTableBody').innerHTML = employees.map(emp => {
    const buddy    = emp.buddyId ? getUserById(emp.buddyId) : null;
    const template = emp.templateId ? getTemplateById(emp.templateId) : null;
    const pct      = calcProgressPercent(emp.id, emp.templateId);
    return `
      <tr>
        <td><div style="display:flex;align-items:center;gap:.75rem;"><div class="avatar avatar-sm">${emp.avatar}</div><div><div style="font-weight:600;">${escapeHtml(emp.name)}</div><div style="font-size:.72rem;color:var(--text-muted);">Day ${daysSince(emp.startDate)}</div></div></div></td>
        <td>${emp.department}</td>
        <td>${buddy ? `<div style="display:flex;align-items:center;gap:.5rem;"><div class="avatar avatar-sm">${buddy.avatar}</div>${escapeHtml(buddy.name)}</div>` : '<span class="badge badge-amber">None</span>'}</td>
        <td>${template ? escapeHtml(template.name) : '<span class="badge badge-gray">None</span>'}</td>
        <td>
          <div style="display:flex;align-items:center;gap:.5rem;width:120px;">
            <div style="flex:1;"><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div></div>
            <span style="font-size:.78rem;font-weight:700;">${pct}%</span>
          </div>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="quickReassign('${emp.id}')">Reassign</button>
        </td>
      </tr>
    `;
  }).join('');
}

function createAssignment() {
  const empId    = document.getElementById('assignEmpSelect').value;
  const buddyId  = document.getElementById('assignBuddySelect').value;
  const tplId    = document.getElementById('assignTemplateSelect').value;
  if (!empId || !buddyId || !tplId) { showToast('Missing Info', 'All fields are required.', 'warning'); return; }

  assignBuddy(empId, buddyId);
  updateUser(empId, { templateId: tplId });
  showToast('Assignment Created!', 'Employee is now paired with a buddy.', 'success');
  renderAssignmentsSection();
  renderEmployeesTable();
  renderBuddiesSection();
  renderAnalytics();
}

function quickReassign(empId) {
  document.getElementById('assignEmpSelect').value = empId;
  navigateTo('assignments');
  showToast('Ready to Reassign', 'Select a new buddy below.', 'info');
}

// ============================================================
// TEMPLATES
// ============================================================
function renderTemplatesSection() {
  const templates = getTemplates();
  const db        = getDB();

  document.getElementById('templateCards').innerHTML = templates.map(tpl => {
    const usedBy = getEmployees().filter(e => e.templateId === tpl.id).length;
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">${escapeHtml(tpl.name)}</div>
            <div class="card-subtitle">${tpl.department} · ${tpl.duration} days</div>
          </div>
          <span class="badge badge-blue">${usedBy} active</span>
        </div>
        <div class="card-body">
          <div style="font-size:.8rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.75rem;">Phases</div>
          ${tpl.phases.map((p, i) => `
            <div style="display:flex;align-items:center;gap:.75rem;padding:.5rem 0;border-bottom:1px solid var(--border-light);">
              <div style="width:24px;height:24px;border-radius:50%;background:var(--primary-pale);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;color:var(--primary);flex-shrink:0;">${i+1}</div>
              <div style="flex:1;"><div style="font-size:.85rem;font-weight:600;">${escapeHtml(p.name)}</div><div style="font-size:.75rem;color:var(--text-muted);">${p.tasks.length} tasks</div></div>
            </div>
          `).join('')}
        </div>
        <div class="card-footer" style="display:flex;gap:.5rem;">
          <button class="btn btn-secondary btn-sm" onclick="showToast('Coming Soon','Template editing is in development.','info')">✏️ Edit</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="showToast('Protected','Templates with active users cannot be deleted.','warning')">🗑️</button>
        </div>
      </div>
    `;
  }).join('') || '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No Templates</div></div>';
}

function addNewTemplate() {
  const name     = document.getElementById('newTplName').value.trim();
  const dept     = document.getElementById('newTplDept').value;
  const duration = Number(document.getElementById('newTplDuration').value);
  if (!name) { showToast('Missing Name', 'Template name is required.', 'warning'); return; }

  addTemplate({ name, department: dept, duration, phases: [
    { id: 'ph_'+Date.now(), name: 'Week 1 – Orientation', tasks: [] }
  ]});
  closeModal('addTemplateModal');
  showToast('Template Created!', name, 'success');
  document.getElementById('newTplName').value = '';
  renderTemplatesSection();
}

// ============================================================
// RESOURCES
// ============================================================
function renderResourcesSection() {
  const resources = getResources();
  const typeIcon  = { document:'📄', video:'🎬', slides:'📊' };

  document.getElementById('resourcesTableBody').innerHTML = resources.map(r => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:.75rem;">
          <span style="font-size:1.3rem;">${typeIcon[r.type] || '📎'}</span>
          <span style="font-weight:600;">${escapeHtml(r.title)}</span>
        </div>
      </td>
      <td><span class="badge badge-gray">${r.type}</span></td>
      <td><span class="badge badge-blue">${r.category}</span></td>
      <td>${r.downloads}</td>
      <td>
        <div style="display:flex;gap:.4rem;">
          <button class="btn btn-ghost btn-sm" onclick="showToast('Edit Resource','Editing ${escapeHtml(r.title)}','info')">✏️</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="confirmDelete('${r.id}','resource')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5"><div class="empty-state" style="padding:2rem;"><div class="empty-icon">📚</div><div class="empty-msg">No resources yet.</div></div></td></tr>';
}

function addNewResource() {
  const title = document.getElementById('newResTitle').value.trim();
  const type  = document.getElementById('newResType').value;
  const cat   = document.getElementById('newResCat').value;
  if (!title) { showToast('Missing Title', 'Title is required.', 'warning'); return; }

  addResource({ title, type, category: cat, url:'#', createdBy: CURRENT_USER.id, downloads: 0 });
  closeModal('addResourceModal');
  showToast('Resource Added!', title, 'success');
  document.getElementById('newResTitle').value = '';
  renderResourcesSection();
}

// ============================================================
// ANNOUNCEMENTS
// ============================================================
function renderAnnouncementsSection() {
  const anns = getAnnouncements();
  document.getElementById('adminAnnouncementsList').innerHTML = anns.map(a => `
    <div class="card">
      <div class="card-body">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;">
          <div style="flex:1;">
            ${a.pinned ? '<span class="badge badge-blue" style="margin-bottom:.5rem;">📌 Pinned</span>' : ''}
            <div style="font-size:1rem;font-weight:700;margin-bottom:.35rem;">${escapeHtml(a.title)}</div>
            <div style="font-size:.9rem;color:var(--text-muted);line-height:1.6;margin-bottom:.5rem;">${escapeHtml(a.text)}</div>
            <div style="font-size:.75rem;color:var(--text-light);">${formatDate(a.date)} · ${a.by}</div>
          </div>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="confirmDelete('${a.id}','announcement')">🗑️</button>
        </div>
      </div>
    </div>
  `).join('') || '<div class="empty-state"><div class="empty-icon">📣</div><div class="empty-title">No Announcements</div></div>';
}

function addNewAnnouncement() {
  const title  = document.getElementById('newAnnTitle').value.trim();
  const text   = document.getElementById('newAnnText').value.trim();
  const by     = document.getElementById('newAnnBy').value.trim() || 'HR Team';
  const pinned = document.getElementById('newAnnPinned').checked;
  if (!title || !text) { showToast('Missing Fields', 'Title and content are required.', 'warning'); return; }

  addAnnouncement({ title, text, by, pinned });
  closeModal('addAnnouncementModal');
  showToast('Announcement Published!', title, 'success');
  document.getElementById('newAnnTitle').value = '';
  document.getElementById('newAnnText').value  = '';
  renderAnnouncementsSection();
}

// ============================================================
// DELETE
// ============================================================
function confirmDelete(id, type) {
  const labels = { employee:'employee', buddy:'buddy', resource:'resource', announcement:'announcement' };
  document.getElementById('deleteConfirmMsg').textContent = `Are you sure you want to delete this ${labels[type] || 'item'}? This cannot be undone.`;

  DELETE_CALLBACK = () => {
    if (type === 'employee') {
      deleteUser(id);
      renderEmployeesTable();
      renderAssignmentsSection();
      renderBuddiesSection();
    } else if (type === 'buddy') {
      deleteUser(id);
      renderBuddiesSection();
      renderAssignmentsSection();
    } else if (type === 'resource') {
      updateDB(db => { db.resources = db.resources.filter(r => r.id !== id); });
      renderResourcesSection();
    } else if (type === 'announcement') {
      updateDB(db => { db.announcements = db.announcements.filter(a => a.id !== id); });
      renderAnnouncementsSection();
    }
    renderAnalytics();
    closeModal('confirmDeleteModal');
    showToast('Deleted', 'The item has been removed.', 'success');
  };

  document.getElementById('deleteConfirmBtn').onclick = DELETE_CALLBACK;
  openModal('confirmDeleteModal');
}

// ============================================================
// PROFILE SECTION — HR/Admin
// ============================================================
const ADMIN_PROFILE_EXTRAS_KEY = 'buddyup_profile_admin_';

function getAdminProfileExtras() {
  try { return JSON.parse(localStorage.getItem(ADMIN_PROFILE_EXTRAS_KEY + CURRENT_USER.id) || '{}'); } catch { return {}; }
}
function saveAdminProfileExtras(data) {
  localStorage.setItem(ADMIN_PROFILE_EXTRAS_KEY + CURRENT_USER.id, JSON.stringify(data));
}

function renderAdminProfileSection() {
  const u        = CURRENT_USER;
  const extras   = getAdminProfileExtras();
  const db       = getDB();
  const employees = getEmployees();
  const buddies   = getBuddies();
  const allMeets  = db.meetings.length;
  const allResources = db.resources.length;
  const allTemplates = db.templates.length;

  // Banner
  document.getElementById('adminProfileBanner').innerHTML = `
    <div class="profile-banner-inner">
      <div class="profile-avatar-wrap">
        <div class="profile-avatar">${u.avatar}</div>
        <div class="profile-avatar-edit" onclick="showToast('Avatar','Photo upload not available in demo.','info')">✏️</div>
      </div>
      <div class="profile-banner-info">
        <div class="profile-banner-name">${escapeHtml(extras.name || u.name)}</div>
        <div class="profile-banner-role">${escapeHtml(extras.title || 'HR Administrator')} · ${u.department}</div>
        <div class="profile-banner-meta">
          <span>📧 ${escapeHtml(u.email)}</span>
          <span>🏢 ${u.department} Department</span>
          <span>📅 Since ${formatDate(u.startDate)}</span>
          ${extras.phone ? `<span>📞 ${escapeHtml(extras.phone)}</span>` : ''}
        </div>
      </div>
      <div class="profile-banner-actions">
        <button class="btn btn-white btn-sm" onclick="navigateTo('analytics')">📊 Analytics</button>
        <button class="btn btn-white btn-sm" onclick="navigateTo('employees')">👤 Manage Employees</button>
      </div>
    </div>
  `;

  // Stats bar
  const avgProgress = employees.length
    ? Math.round(employees.reduce((s, e) => s + calcProgressPercent(e.id, e.templateId), 0) / employees.length)
    : 0;
  document.getElementById('adminProfileStats').innerHTML = [
    { value: employees.length,  label: 'Employees Managed' },
    { value: buddies.length,    label: 'Active Buddies'    },
    { value: allMeets,          label: 'Total Meetings'    },
    { value: `${avgProgress}%`, label: 'Avg. Progress'     },
    { value: allResources,      label: 'Resources Managed' },
    { value: allTemplates,      label: 'Templates'         },
  ].map(s => `
    <div class="profile-stat-cell">
      <div class="profile-stat-value">${s.value}</div>
      <div class="profile-stat-label">${s.label}</div>
    </div>
  `).join('');

  // Account info
  document.getElementById('adminProfileInfo').innerHTML = `
    <div class="profile-info-list">
      <div class="profile-info-row"><span class="profile-info-key">Full Name</span><span class="profile-info-val">${escapeHtml(extras.name || u.name)}</span></div>
      <div class="profile-info-row"><span class="profile-info-key">Email</span><span class="profile-info-val">${escapeHtml(u.email)}</span></div>
      <div class="profile-info-row"><span class="profile-info-key">Department</span><span class="profile-info-val">${u.department}</span></div>
      <div class="profile-info-row"><span class="profile-info-key">Title</span><span class="profile-info-val">${escapeHtml(extras.title || 'HR Administrator')}</span></div>
      <div class="profile-info-row"><span class="profile-info-key">With Company</span><span class="profile-info-val">Since ${formatDate(u.startDate)}</span></div>
      <div class="profile-info-row"><span class="profile-info-key">Phone</span><span class="profile-info-val">${extras.phone || '—'}</span></div>
      <div class="profile-info-row"><span class="profile-info-key">Access Level</span><span class="profile-info-val"><span class="badge badge-purple">Full Admin</span></span></div>
    </div>
  `;

  // Pre-fill edit form
  document.getElementById('adminEditName').value  = extras.name  || u.name;
  document.getElementById('adminEditTitle').value = extras.title || '';
  document.getElementById('adminEditPhone').value = extras.phone || '';

  // Responsibilities tags
  const defaultTags = ['Employee Onboarding', 'Buddy Management', 'HR Analytics', 'Policy', 'Compliance'];
  const tags = extras.responsibilities || defaultTags;
  document.getElementById('adminProfileTags').innerHTML = `
    <div class="tag-group">${tags.map(t => `<span class="tag green">${escapeHtml(t)}</span>`).join('')}</div>
    <div style="font-size:.78rem;color:var(--text-muted);">Your key responsibilities on the BuddyUp platform.</div>
  `;

  // Platform overview
  document.getElementById('adminProfileOverview').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:1rem;">
      <div style="background:var(--primary-pale);border-radius:var(--radius-sm);padding:1rem;text-align:center;">
        <div style="font-size:1.6rem;font-weight:800;color:var(--primary);">${employees.length}</div>
        <div style="font-size:.75rem;color:var(--text-muted);">Active Employees</div>
      </div>
      <div style="background:#dcfce7;border-radius:var(--radius-sm);padding:1rem;text-align:center;">
        <div style="font-size:1.6rem;font-weight:800;color:var(--success);">${buddies.length}</div>
        <div style="font-size:.75rem;color:var(--text-muted);">Active Buddies</div>
      </div>
      <div style="background:#ede9fe;border-radius:var(--radius-sm);padding:1rem;text-align:center;">
        <div style="font-size:1.6rem;font-weight:800;color:var(--accent);">${allTemplates}</div>
        <div style="font-size:.75rem;color:var(--text-muted);">Templates</div>
      </div>
      <div style="background:#fef3c7;border-radius:var(--radius-sm);padding:1rem;text-align:center;">
        <div style="font-size:1.6rem;font-weight:800;color:var(--warning);">${allResources}</div>
        <div style="font-size:.75rem;color:var(--text-muted);">Resources</div>
      </div>
    </div>
    <div>
      <div style="font-size:.8rem;font-weight:600;color:var(--text-muted);margin-bottom:.5rem;">Overall Onboarding Health</div>
      <div class="progress-label"><span>Company Average Progress</span><span>${avgProgress}%</span></div>
      <div class="progress-bar-wrap" style="height:10px;">
        <div class="progress-bar-fill ${avgProgress>=70?'success':''}" style="width:${avgProgress}%;"></div>
      </div>
    </div>
  `;

  // Activity
  const activities = [
    { icon:'👤', color:'blue',   title:`Managing ${employees.length} active employees`,         time:'Ongoing'  },
    { icon:'🤝', color:'green',  title:`${buddies.length} buddies active on platform`,           time:'Ongoing'  },
    { icon:'📋', color:'purple', title:`${allTemplates} onboarding templates published`,         time:'Ongoing'  },
    { icon:'📊', color:'amber',  title:`Company avg. progress at ${avgProgress}%`,               time:'Today'    },
    { icon:'📣', color:'blue',   title:`${db.announcements.length} announcements published`,     time:'Total'    },
  ];
  document.getElementById('adminProfileActivity').innerHTML = activities.map(a => `
    <div class="profile-activity-item">
      <div class="activity-dot ${a.color}">${a.icon}</div>
      <div class="activity-info">
        <div class="activity-title">${a.title}</div>
        <div class="activity-time">${a.time}</div>
      </div>
    </div>
  `).join('');
}

let ADMIN_PROFILE_EDITING = false;
function toggleAdminProfileEdit() {
  ADMIN_PROFILE_EDITING = !ADMIN_PROFILE_EDITING;
  document.getElementById('adminProfileEditForm').style.display = ADMIN_PROFILE_EDITING ? 'block' : 'none';
}

function saveAdminProfileEdit() {
  const name  = document.getElementById('adminEditName').value.trim();
  const title = document.getElementById('adminEditTitle').value.trim();
  const phone = document.getElementById('adminEditPhone').value.trim();
  if (!name) { showToast('Name Required', '', 'warning'); return; }
  const extras = getAdminProfileExtras();
  Object.assign(extras, { name, title, phone });
  saveAdminProfileExtras(extras);
  const nameEl = document.getElementById('sidebarUserName');
  if (nameEl) nameEl.textContent = name;
  toggleAdminProfileEdit();
  renderAdminProfileSection();
  showToast('Profile Updated!', 'Changes saved successfully.', 'success');
}
