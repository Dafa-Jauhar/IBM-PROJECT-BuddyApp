/* ============================================================
   BuddyUp — Shared Data Store (localStorage-backed mock DB)
   ============================================================ */

const DB_KEY = 'buddyup_data';

const DEFAULT_DATA = {
  users: [
    { id: 'u1', name: 'Alex Johnson',    email: 'alex@buddyup.com',    password: 'employee123', role: 'employee', department: 'Engineering',  startDate: '2026-10-15', buddyId: 'u3', templateId: 't1', avatar: 'AJ', status: 'active' },
    { id: 'u2', name: 'Maria Santos',    email: 'maria@buddyup.com',   password: 'employee123', role: 'employee', department: 'Marketing',    startDate: '2026-10-20', buddyId: 'u4', templateId: 't2', avatar: 'MS', status: 'active' },
    { id: 'u3', name: 'David Chen',      email: 'david@buddyup.com',   password: 'buddy123',    role: 'buddy',    department: 'Engineering',  startDate: '2025-01-10', buddyId: null, templateId: null, avatar: 'DC', status: 'active', menteeIds: ['u1'] },
    { id: 'u4', name: 'Sarah Williams',  email: 'sarah@buddyup.com',   password: 'buddy123',    role: 'buddy',    department: 'Marketing',    startDate: '2025-03-05', buddyId: null, templateId: null, avatar: 'SW', status: 'active', menteeIds: ['u2'] },
    { id: 'u5', name: 'James Park',      email: 'james@buddyup.com',   password: 'buddy123',    role: 'buddy',    department: 'Product',      startDate: '2024-11-12', buddyId: null, templateId: null, avatar: 'JP', status: 'active', menteeIds: [] },
    { id: 'u6', name: 'Rachel Torres',   email: 'hr@buddyup.com',      password: 'admin123',    role: 'admin',    department: 'HR',           startDate: '2023-06-01', buddyId: null, templateId: null, avatar: 'RT', status: 'active' },
    { id: 'u7', name: 'Kevin Liu',       email: 'kevin@buddyup.com',   password: 'employee123', role: 'employee', department: 'Product',      startDate: '2026-11-01', buddyId: 'u5', templateId: 't1', avatar: 'KL', status: 'active' },
  ],

  templates: [
    {
      id: 't1', name: 'Engineering Onboarding', department: 'Engineering', duration: 90,
      phases: [
        { id: 'ph1', name: 'Week 1 – Orientation', tasks: ['t1a','t1b','t1c'] },
        { id: 'ph2', name: 'Week 2–4 – Setup & Tools', tasks: ['t1d','t1e','t1f'] },
        { id: 'ph3', name: 'Month 2 – Integration', tasks: ['t1g','t1h'] },
        { id: 'ph4', name: 'Month 3 – Independence', tasks: ['t1i','t1j'] },
      ]
    },
    {
      id: 't2', name: 'Marketing Onboarding', department: 'Marketing', duration: 60,
      phases: [
        { id: 'ph5', name: 'Week 1 – Welcome', tasks: ['t2a','t2b'] },
        { id: 'ph6', name: 'Week 2–4 – Brand & Tools', tasks: ['t2c','t2d','t2e'] },
        { id: 'ph7', name: 'Month 2 – Campaign', tasks: ['t2f','t2g'] },
      ]
    },
  ],

  tasks: {
    t1a: { id:'t1a', title:'Complete HR paperwork & I-9',  category:'admin',    dueOffset:1,  resourceId: null },
    t1b: { id:'t1b', title:'Office tour & badge setup',    category:'admin',    dueOffset:1,  resourceId: null },
    t1c: { id:'t1c', title:'Meet your buddy & team',       category:'social',   dueOffset:2,  resourceId: null },
    t1d: { id:'t1d', title:'Dev environment setup',        category:'technical',dueOffset:7,  resourceId: 'r1' },
    t1e: { id:'t1e', title:'Read Engineering handbook',    category:'learning', dueOffset:10, resourceId: 'r2' },
    t1f: { id:'t1f', title:'First code review',            category:'technical',dueOffset:14, resourceId: null },
    t1g: { id:'t1g', title:'Complete Git workflow course', category:'learning', dueOffset:30, resourceId: 'r3' },
    t1h: { id:'t1h', title:'Shadow senior engineer',       category:'social',   dueOffset:25, resourceId: null },
    t1i: { id:'t1i', title:'Own first feature ticket',     category:'technical',dueOffset:60, resourceId: null },
    t1j: { id:'t1j', title:'30-60-90 day review',          category:'admin',    dueOffset:90, resourceId: null },
    t2a: { id:'t2a', title:'Company values orientation',   category:'admin',    dueOffset:1,  resourceId: 'r4' },
    t2b: { id:'t2b', title:'Meet marketing team',          category:'social',   dueOffset:2,  resourceId: null },
    t2c: { id:'t2c', title:'Brand guidelines training',    category:'learning', dueOffset:7,  resourceId: 'r5' },
    t2d: { id:'t2d', title:'HubSpot & analytics access',   category:'technical',dueOffset:7,  resourceId: null },
    t2e: { id:'t2e', title:'Content strategy session',     category:'learning', dueOffset:14, resourceId: null },
    t2f: { id:'t2f', title:'Run first email campaign',     category:'technical',dueOffset:30, resourceId: null },
    t2g: { id:'t2g', title:'Campaign performance review',  category:'admin',    dueOffset:60, resourceId: null },
  },

  resources: [
    { id:'r1', title:'Dev Environment Setup Guide',     type:'document', url:'#', category:'Engineering', createdBy:'u6', downloads:142 },
    { id:'r2', title:'Engineering Handbook v3',         type:'document', url:'#', category:'Engineering', createdBy:'u6', downloads:98  },
    { id:'r3', title:'Git Workflow Fundamentals',       type:'video',    url:'#', category:'Engineering', createdBy:'u3', downloads:67  },
    { id:'r4', title:'BuddyUp Company Values Deck',    type:'slides',   url:'#', category:'General',     createdBy:'u6', downloads:211 },
    { id:'r5', title:'Brand Guidelines 2026',           type:'document', url:'#', category:'Marketing',   createdBy:'u4', downloads:55  },
    { id:'r6', title:'Employee Benefits Overview',      type:'document', url:'#', category:'General',     createdBy:'u6', downloads:190 },
    { id:'r7', title:'Security & Compliance Training',  type:'video',    url:'#', category:'General',     createdBy:'u6', downloads:88  },
  ],

  progress: {
    u1: { t1a:'verified', t1b:'verified', t1c:'verified', t1d:'submitted', t1e:'pending', t1f:'pending', t1g:'pending', t1h:'pending', t1i:'pending', t1j:'pending' },
    u2: { t2a:'verified', t2b:'verified', t2c:'submitted', t2d:'pending', t2e:'pending', t2f:'pending', t2g:'pending' },
    u7: { t1a:'verified', t1b:'pending',  t1c:'pending', t1d:'pending', t1e:'pending', t1f:'pending', t1g:'pending', t1h:'pending', t1i:'pending', t1j:'pending' },
  },

  meetings: [
    { id:'m1', title:'Weekly Check-in',            date:'2026-11-05', time:'10:00', duration:30, buddyId:'u3', employeeId:'u1', type:'checkin',   status:'upcoming', notes:'' },
    { id:'m2', title:'Dev Setup Walkthrough',      date:'2026-11-03', time:'14:00', duration:60, buddyId:'u3', employeeId:'u1', type:'technical', status:'upcoming', notes:'' },
    { id:'m3', title:'Brand Training Session',     date:'2026-11-06', time:'11:00', duration:45, buddyId:'u4', employeeId:'u2', type:'learning',  status:'upcoming', notes:'' },
    { id:'m4', title:'30-Day Progress Review',     date:'2026-10-28', time:'09:00', duration:60, buddyId:'u3', employeeId:'u1', type:'review',    status:'completed', notes:'Great progress! Alex is adapting well to the team.' },
    { id:'m5', title:'Weekly Check-in',            date:'2026-11-12', time:'10:00', duration:30, buddyId:'u3', employeeId:'u1', type:'checkin',   status:'upcoming', notes:'' },
    { id:'m6', title:'Onboarding Kickoff',         date:'2026-11-04', time:'09:30', duration:60, buddyId:'u5', employeeId:'u7', type:'checkin',   status:'upcoming', notes:'' },
  ],

  messages: [
    { id:'msg1', from:'u3', to:'u1', text:'Hey Alex! Welcome to the team! Let me know if you need anything.', timestamp:'2026-10-15T09:00:00', read:true  },
    { id:'msg2', from:'u1', to:'u3', text:'Thanks David! Really excited to be here.', timestamp:'2026-10-15T09:30:00', read:true },
    { id:'msg3', from:'u3', to:'u1', text:'Have you finished setting up your dev environment? Let me know if you hit any issues.', timestamp:'2026-10-20T11:00:00', read:true  },
    { id:'msg4', from:'u1', to:'u3', text:'Almost there, running into a Docker issue.', timestamp:'2026-10-20T14:00:00', read:true },
    { id:'msg5', from:'u3', to:'u1', text:"I'll help you fix it in tomorrow's session!", timestamp:'2026-10-20T14:15:00', read:false },
    { id:'msg6', from:'u4', to:'u2', text:'Hi Maria! Welcome aboard. Let me share the brand deck with you.', timestamp:'2026-10-20T10:00:00', read:true },
  ],

  evaluations: [
    { id:'e1', buddyId:'u3', employeeId:'u1', date:'2026-10-28', week:2, scores:{ attitude:5, learning:4, teamwork:4, progress:4 }, notes:'Alex shows great enthusiasm and is picking up the codebase faster than expected.', rating: 4.25 },
  ],

  notifications: [
    { id:'n1', userId:'u1', text:'Your buddy David Chen scheduled a meeting for Nov 5th', time:'2h ago',   read:false, type:'meeting' },
    { id:'n2', userId:'u1', text:'Task "Dev environment setup" needs your attention', time:'1d ago',  read:false, type:'task'    },
    { id:'n3', userId:'u1', text:'New resource added: Git Workflow Fundamentals', time:'2d ago',  read:true,  type:'resource'},
    { id:'n4', userId:'u3', text:'Alex Johnson submitted task for verification', time:'3h ago',  read:false, type:'task'    },
    { id:'n5', userId:'u3', text:'Meeting scheduled: Dev Setup Walkthrough on Nov 3', time:'5h ago',  read:false, type:'meeting' },
    { id:'n6', userId:'u6', text:'New employee Kevin Liu started onboarding', time:'1d ago',  read:false, type:'admin'   },
    { id:'n7', userId:'u6', text:'Buddy assignment needed for new joiners', time:'2d ago',  read:true,  type:'admin'   },
  ],

  announcements: [
    { id:'a1', title:'Welcome to Q4 Onboarding Cohort!',         text:'We are excited to welcome 3 new team members this quarter.', date:'2026-11-01', by:'HR Team', pinned:true  },
    { id:'a2', title:'Updated Security Training Required',        text:'All employees must complete the updated security training by Nov 30.', date:'2026-10-28', by:'IT Compliance', pinned:false },
    { id:'a3', title:'BuddyUp Platform New Features Released',   text:'Check out the new scheduling and progress tracking features.', date:'2026-10-25', by:'Product Team', pinned:false },
  ],
};

// ---------- DB Helpers ----------
function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveDB(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

function getDB() {
  let db = loadDB();
  if (!db) {
    db = JSON.parse(JSON.stringify(DEFAULT_DATA));
    saveDB(db);
  }
  return db;
}

function updateDB(fn) {
  const db = getDB();
  fn(db);
  saveDB(db);
}

// ---------- User helpers ----------
function findUser(email, password) {
  const db = getDB();
  return db.users.find(u => u.email === email && u.password === password) || null;
}

function getUserById(id) {
  return getDB().users.find(u => u.id === id) || null;
}

function getAllUsers() { return getDB().users; }
function getEmployees() { return getDB().users.filter(u => u.role === 'employee'); }
function getBuddies()   { return getDB().users.filter(u => u.role === 'buddy'); }

// ---------- Progress helpers ----------
function getProgress(userId) {
  const db = getDB();
  return db.progress[userId] || {};
}

function setTaskStatus(userId, taskId, status) {
  updateDB(db => {
    if (!db.progress[userId]) db.progress[userId] = {};
    db.progress[userId][taskId] = status;
  });
}

function calcProgressPercent(userId, templateId) {
  const db = getDB();
  const template = db.templates.find(t => t.id === templateId);
  if (!template) return 0;
  const allTasks = template.phases.flatMap(p => p.tasks);
  const prog = db.progress[userId] || {};
  const done = allTasks.filter(id => prog[id] === 'verified').length;
  return Math.round((done / allTasks.length) * 100);
}

// ---------- Meeting helpers ----------
function getMeetingsForUser(userId, role) {
  const db = getDB();
  if (role === 'employee') return db.meetings.filter(m => m.employeeId === userId);
  if (role === 'buddy')    return db.meetings.filter(m => m.buddyId === userId);
  return db.meetings;
}

function addMeeting(meeting) {
  updateDB(db => {
    meeting.id = 'm' + Date.now();
    db.meetings.push(meeting);
  });
}

// ---------- Message helpers ----------
function getConversation(uid1, uid2) {
  return getDB().messages.filter(m =>
    (m.from === uid1 && m.to === uid2) || (m.from === uid2 && m.to === uid1)
  ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function sendMessage(from, to, text) {
  updateDB(db => {
    db.messages.push({ id: 'msg' + Date.now(), from, to, text, timestamp: new Date().toISOString(), read: false });
  });
}

function markMessagesRead(toUserId, fromUserId) {
  updateDB(db => {
    db.messages.forEach(m => {
      if (m.from === fromUserId && m.to === toUserId) m.read = true;
    });
  });
}

// ---------- Notification helpers ----------
function getNotifications(userId) {
  return getDB().notifications.filter(n => n.userId === userId);
}

function markNotifRead(notifId) {
  updateDB(db => {
    const n = db.notifications.find(x => x.id === notifId);
    if (n) n.read = true;
  });
}

function markAllNotifsRead(userId) {
  updateDB(db => {
    db.notifications.filter(n => n.userId === userId).forEach(n => n.read = true);
  });
}

// ---------- Resource helpers ----------
function getResources(category) {
  const db = getDB();
  return category ? db.resources.filter(r => r.category === category || r.category === 'General') : db.resources;
}

function addResource(res) {
  updateDB(db => {
    res.id = 'r' + Date.now();
    db.resources.push(res);
  });
}

// ---------- Template helpers ----------
function getTemplates()       { return getDB().templates; }
function getTemplateById(id)  { return getDB().templates.find(t => t.id === id) || null; }
function getTaskById(id)      { return getDB().tasks[id] || null; }

// ---------- Evaluation helpers ----------
function getEvaluations(buddyId, employeeId) {
  const db = getDB();
  return db.evaluations.filter(e =>
    (!buddyId || e.buddyId === buddyId) &&
    (!employeeId || e.employeeId === employeeId)
  );
}

function addEvaluation(ev) {
  updateDB(db => {
    ev.id = 'e' + Date.now();
    db.evaluations.push(ev);
  });
}

// ---------- Admin helpers ----------
function assignBuddy(employeeId, buddyId) {
  updateDB(db => {
    const emp = db.users.find(u => u.id === employeeId);
    if (emp) {
      // remove from old buddy
      if (emp.buddyId) {
        const oldBuddy = db.users.find(u => u.id === emp.buddyId);
        if (oldBuddy && oldBuddy.menteeIds) {
          oldBuddy.menteeIds = oldBuddy.menteeIds.filter(id => id !== employeeId);
        }
      }
      emp.buddyId = buddyId;
      // add to new buddy
      const newBuddy = db.users.find(u => u.id === buddyId);
      if (newBuddy) {
        if (!newBuddy.menteeIds) newBuddy.menteeIds = [];
        if (!newBuddy.menteeIds.includes(employeeId)) newBuddy.menteeIds.push(employeeId);
      }
    }
  });
}

function addUser(user) {
  updateDB(db => {
    user.id = 'u' + Date.now();
    db.users.push(user);
  });
}

function updateUser(userId, fields) {
  updateDB(db => {
    const u = db.users.find(x => x.id === userId);
    if (u) Object.assign(u, fields);
  });
}

function deleteUser(userId) {
  updateDB(db => {
    db.users = db.users.filter(u => u.id !== userId);
  });
}

function addTemplate(template) {
  updateDB(db => {
    template.id = 't' + Date.now();
    db.templates.push(template);
  });
}

function getAnnouncements() { return getDB().announcements; }

function addAnnouncement(ann) {
  updateDB(db => {
    ann.id = 'a' + Date.now();
    ann.date = new Date().toISOString().slice(0, 10);
    db.announcements.unshift(ann);
  });
}

// ---------- Session helpers ----------
const SESSION_KEY = 'buddyup_session';

function saveSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, role: user.role }));
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { id } = JSON.parse(raw);
    return getUserById(id);
  } catch { return null; }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
