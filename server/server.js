// server/server.js  —  same Express backend, now reads DB_PATH from env
// so Electron can store the database in the user's app data folder.

const express    = require("express");
const Database   = require("better-sqlite3");
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const cors       = require("cors");
const path       = require("path");

const app    = express();
const PORT   = process.env.PORT || 3001;
const SECRET = process.env.JWT_SECRET || "lifeos_nfs_secret_change_in_production";
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "lifeos.db");

app.use(cors({ origin: ["http://localhost:3000", "http://localhost:5173", "file://"] }));
app.use(express.json());

// ─── DATABASE ──────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    DEFAULT 'PLAYER',
    password_hash TEXT    NOT NULL
  );
  CREATE TABLE IF NOT EXISTS player (
    id      INTEGER PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id),
    name    TEXT    DEFAULT 'PLAYER',
    level   INTEGER DEFAULT 1,
    xp      INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER REFERENCES users(id),
    title      TEXT    NOT NULL,
    category   TEXT    DEFAULT 'Personal',
    period     TEXT    DEFAULT 'Daily',
    priority   TEXT    DEFAULT 'Medium',
    done       INTEGER DEFAULT 0,
    tags       TEXT    DEFAULT '[]',
    subject_id INTEGER,
    course_id  INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS subjects (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER REFERENCES users(id),
    name       TEXT NOT NULL,
    code       TEXT DEFAULT '',
    attendance INTEGER DEFAULT 100,
    notes      TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS assignments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    due_date   TEXT DEFAULT '',
    done       INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS exams (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    date       TEXT DEFAULT '',
    done       INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS attendance_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    date       TEXT NOT NULL,
    present    INTEGER DEFAULT 1,
    UNIQUE(subject_id, date)
  );
  CREATE TABLE IF NOT EXISTS courses (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER REFERENCES users(id),
    name          TEXT NOT NULL,
    platform      TEXT DEFAULT '',
    total_modules INTEGER DEFAULT 1,
    done_modules  INTEGER DEFAULT 0,
    hours         INTEGER DEFAULT 0,
    tags          TEXT DEFAULT '[]',
    notes         TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS habits (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER REFERENCES users(id),
    name           TEXT NOT NULL,
    streak         INTEGER DEFAULT 0,
    done           INTEGER DEFAULT 0,
    xp             INTEGER DEFAULT 15,
    color          TEXT DEFAULT '#00C8FF',
    target         TEXT DEFAULT 'Daily',
    last_completed TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS skills (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    name    TEXT NOT NULL,
    xp      INTEGER DEFAULT 0,
    level   INTEGER DEFAULT 1,
    color   TEXT DEFAULT '#00C8FF'
  );
  CREATE TABLE IF NOT EXISTS moods (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER REFERENCES users(id),
    date       TEXT NOT NULL,
    mood       INTEGER DEFAULT 5,
    prod       INTEGER DEFAULT 5,
    note       TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sleep_log (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  INTEGER REFERENCES users(id),
    date     TEXT NOT NULL,
    bedtime  TEXT DEFAULT '',
    wake     TEXT DEFAULT '',
    duration INTEGER DEFAULT 0,
    quality  INTEGER DEFAULT 3
  );
  CREATE TABLE IF NOT EXISTS screen_time (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER REFERENCES users(id),
    date      TEXT NOT NULL,
    social    INTEGER DEFAULT 0,
    gaming    INTEGER DEFAULT 0,
    study     INTEGER DEFAULT 0,
    entertain INTEGER DEFAULT 0,
    other     INTEGER DEFAULT 0,
    UNIQUE(user_id, date)
  );
  CREATE TABLE IF NOT EXISTS screen_limits (
    id        INTEGER PRIMARY KEY,
    user_id   INTEGER UNIQUE REFERENCES users(id),
    social    INTEGER DEFAULT 90,
    gaming    INTEGER DEFAULT 60,
    study     INTEGER DEFAULT 180,
    entertain INTEGER DEFAULT 60,
    other     INTEGER DEFAULT 60
  );
  CREATE TABLE IF NOT EXISTS xp_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER REFERENCES users(id),
    amount     INTEGER NOT NULL,
    reason     TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ─── AUTH MIDDLEWARE ────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { res.status(401).json({ error: "Invalid token" }); }
}

const parseSubject = (s) => ({
  ...s,
  assignments: db.prepare("SELECT * FROM assignments WHERE subject_id=? ORDER BY id").all(s.id).map(a=>({...a,done:!!a.done})),
  exams:        db.prepare("SELECT * FROM exams WHERE subject_id=? ORDER BY date").all(s.id).map(e=>({...e,done:!!e.done})),
  attendanceLog:db.prepare("SELECT * FROM attendance_log WHERE subject_id=? ORDER BY date DESC").all(s.id).map(a=>({...a,present:!!a.present})),
});

// ─── AUTH ROUTES ─────────────────────────────────────────────
app.get("/api/auth/status", (_, res) => {
  res.json({ hasAccount: !!db.prepare("SELECT id FROM users LIMIT 1").get() });
});

app.post("/api/auth/setup", (req, res) => {
  const { name, password } = req.body;
  if (!name?.trim() || !password?.trim()) return res.status(400).json({ error: "Name and password required" });
  if (db.prepare("SELECT id FROM users LIMIT 1").get()) return res.status(400).json({ error: "Account exists. Please login." });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  const hash = bcrypt.hashSync(password, 10);
  const pname = name.toUpperCase().slice(0, 20);
  const uid = db.prepare("INSERT INTO users (name, password_hash) VALUES (?,?)").run(pname, hash).lastInsertRowid;
  db.prepare("INSERT INTO player (user_id, name, level, xp) VALUES (?,?,7,450)").run(uid, pname);
  seedDatabase(uid, pname);
  res.json({ token: jwt.sign({ userId: uid, name: pname }, SECRET, { expiresIn: "30d" }), name: pname });
});

app.post("/api/auth/login", (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required" });
  const user = db.prepare("SELECT * FROM users LIMIT 1").get();
  if (!user) return res.status(404).json({ error: "No account found. Please set up first." });
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: "Wrong password." });
  res.json({ token: jwt.sign({ userId: user.id, name: user.name }, SECRET, { expiresIn: "30d" }), name: user.name });
});

app.post("/api/auth/change-password", auth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.userId);
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) return res.status(401).json({ error: "Current password is wrong" });
  if (newPassword.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });
  db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(bcrypt.hashSync(newPassword, 10), req.user.userId);
  res.json({ success: true });
});

// ─── PLAYER ──────────────────────────────────────────────────
app.get("/api/player", auth, (req, res) => res.json(db.prepare("SELECT * FROM player WHERE user_id=?").get(req.user.userId)));
app.put("/api/player", auth, (req, res) => {
  const { name, level, xp } = req.body;
  db.prepare("UPDATE player SET name=COALESCE(?,name),level=COALESCE(?,level),xp=COALESCE(?,xp) WHERE user_id=?").run(name??null,level??null,xp??null,req.user.userId);
  res.json(db.prepare("SELECT * FROM player WHERE user_id=?").get(req.user.userId));
});

// ─── TASKS ───────────────────────────────────────────────────
app.get("/api/tasks", auth, (req, res) => {
  res.json(db.prepare("SELECT * FROM tasks WHERE user_id=? ORDER BY created_at DESC").all(req.user.userId).map(t=>({...t,tags:JSON.parse(t.tags||"[]"),done:!!t.done})));
});
app.post("/api/tasks", auth, (req, res) => {
  const { title, category, period, priority, tags, subjectId, courseId } = req.body;
  const r = db.prepare("INSERT INTO tasks (user_id,title,category,period,priority,tags,subject_id,course_id) VALUES (?,?,?,?,?,?,?,?)").run(req.user.userId,title,category||"Personal",period||"Daily",priority||"Medium",JSON.stringify(tags||[]),subjectId||null,courseId||null);
  const t = db.prepare("SELECT * FROM tasks WHERE id=?").get(r.lastInsertRowid);
  res.json({...t,tags:JSON.parse(t.tags||"[]"),done:false});
});
app.put("/api/tasks/:id", auth, (req, res) => {
  if (req.body.done !== undefined) db.prepare("UPDATE tasks SET done=? WHERE id=? AND user_id=?").run(req.body.done?1:0,req.params.id,req.user.userId);
  const t = db.prepare("SELECT * FROM tasks WHERE id=?").get(req.params.id);
  res.json({...t,tags:JSON.parse(t.tags||"[]"),done:!!t.done});
});
app.delete("/api/tasks/:id", auth, (req, res) => { db.prepare("DELETE FROM tasks WHERE id=? AND user_id=?").run(req.params.id,req.user.userId); res.json({success:true}); });

// ─── SUBJECTS ────────────────────────────────────────────────
app.get("/api/subjects",  auth, (req, res) => res.json(db.prepare("SELECT * FROM subjects WHERE user_id=?").all(req.user.userId).map(parseSubject)));
app.post("/api/subjects", auth, (req, res) => {
  const { name, code, notes } = req.body;
  const r = db.prepare("INSERT INTO subjects (user_id,name,code,notes) VALUES (?,?,?,?)").run(req.user.userId,name,code||"",notes||"");
  res.json(parseSubject(db.prepare("SELECT * FROM subjects WHERE id=?").get(r.lastInsertRowid)));
});
app.put("/api/subjects/:id/notes", auth, (req, res) => { db.prepare("UPDATE subjects SET notes=? WHERE id=?").run(req.body.notes,req.params.id); res.json({success:true}); });
app.post("/api/subjects/:id/assignments", auth, (req, res) => {
  const { title, dueDate } = req.body;
  const r = db.prepare("INSERT INTO assignments (subject_id,title,due_date) VALUES (?,?,?)").run(req.params.id,title,dueDate||"");
  res.json({id:r.lastInsertRowid,subject_id:+req.params.id,title,due_date:dueDate||"",done:false});
});
app.put("/api/subjects/:sid/assignments/:aid", auth, (req, res) => { db.prepare("UPDATE assignments SET done=? WHERE id=?").run(req.body.done?1:0,req.params.aid); res.json({success:true}); });
app.delete("/api/subjects/:sid/assignments/:aid", auth, (req, res) => { db.prepare("DELETE FROM assignments WHERE id=?").run(req.params.aid); res.json({success:true}); });
app.post("/api/subjects/:id/exams", auth, (req, res) => {
  const { title, date } = req.body;
  const r = db.prepare("INSERT INTO exams (subject_id,title,date) VALUES (?,?,?)").run(req.params.id,title,date||"");
  res.json({id:r.lastInsertRowid,subject_id:+req.params.id,title,date:date||"",done:false});
});
app.put("/api/subjects/:sid/exams/:eid", auth, (req, res) => { db.prepare("UPDATE exams SET done=? WHERE id=?").run(req.body.done?1:0,req.params.eid); res.json({success:true}); });
app.post("/api/subjects/:id/attendance", auth, (req, res) => {
  const { date, present } = req.body;
  db.prepare("INSERT OR REPLACE INTO attendance_log (subject_id,date,present) VALUES (?,?,?)").run(req.params.id,date,present?1:0);
  const log = db.prepare("SELECT * FROM attendance_log WHERE subject_id=?").all(req.params.id);
  const pct = Math.round((log.filter(a=>a.present).length/log.length)*100);
  db.prepare("UPDATE subjects SET attendance=? WHERE id=?").run(pct,req.params.id);
  res.json({attendance:pct});
});

// ─── COURSES ─────────────────────────────────────────────────
app.get("/api/courses",  auth, (req, res) => res.json(db.prepare("SELECT * FROM courses WHERE user_id=?").all(req.user.userId).map(c=>({...c,tags:JSON.parse(c.tags||"[]")}))));
app.post("/api/courses", auth, (req, res) => {
  const { name, platform, modules, hours, tags, notes } = req.body;
  const r = db.prepare("INSERT INTO courses (user_id,name,platform,total_modules,hours,tags,notes) VALUES (?,?,?,?,?,?,?)").run(req.user.userId,name,platform||"",modules||10,hours||0,JSON.stringify(tags||[]),notes||"");
  const c = db.prepare("SELECT * FROM courses WHERE id=?").get(r.lastInsertRowid);
  res.json({...c,tags:JSON.parse(c.tags||"[]")});
});
app.put("/api/courses/:id", auth, (req, res) => {
  const { done_modules, notes } = req.body;
  const u=[],v=[];
  if (done_modules!==undefined){u.push("done_modules=?");v.push(done_modules);}
  if (notes!==undefined){u.push("notes=?");v.push(notes);}
  if (u.length){v.push(req.params.id,req.user.userId);db.prepare(`UPDATE courses SET ${u.join(",")} WHERE id=? AND user_id=?`).run(...v);}
  const c=db.prepare("SELECT * FROM courses WHERE id=?").get(req.params.id);
  res.json({...c,tags:JSON.parse(c.tags||"[]")});
});

// ─── HABITS ──────────────────────────────────────────────────
app.get("/api/habits",  auth, (req, res) => res.json(db.prepare("SELECT * FROM habits WHERE user_id=?").all(req.user.userId).map(h=>({...h,done:!!h.done}))));
app.post("/api/habits", auth, (req, res) => {
  const { name, xp, color, target } = req.body;
  const r = db.prepare("INSERT INTO habits (user_id,name,xp,color,target) VALUES (?,?,?,?,?)").run(req.user.userId,name,xp||15,color||"#00C8FF",target||"Daily");
  res.json({...db.prepare("SELECT * FROM habits WHERE id=?").get(r.lastInsertRowid),done:false});
});
app.put("/api/habits/:id", auth, (req, res) => {
  const { done, streak, last_completed } = req.body;
  const u=[],v=[];
  if (done!==undefined){u.push("done=?");v.push(done?1:0);}
  if (streak!==undefined){u.push("streak=?");v.push(streak);}
  if (last_completed!==undefined){u.push("last_completed=?");v.push(last_completed);}
  if (u.length){v.push(req.params.id,req.user.userId);db.prepare(`UPDATE habits SET ${u.join(",")} WHERE id=? AND user_id=?`).run(...v);}
  const h=db.prepare("SELECT * FROM habits WHERE id=?").get(req.params.id);
  res.json({...h,done:!!h.done});
});
app.delete("/api/habits/:id", auth, (req, res) => { db.prepare("DELETE FROM habits WHERE id=? AND user_id=?").run(req.params.id,req.user.userId); res.json({success:true}); });

// ─── SKILLS ──────────────────────────────────────────────────
app.get("/api/skills", auth, (req, res) => res.json(db.prepare("SELECT * FROM skills WHERE user_id=?").all(req.user.userId)));
app.put("/api/skills/:id", auth, (req, res) => {
  const { xp, level } = req.body;
  db.prepare("UPDATE skills SET xp=COALESCE(?,xp),level=COALESCE(?,level) WHERE id=? AND user_id=?").run(xp??null,level??null,req.params.id,req.user.userId);
  res.json(db.prepare("SELECT * FROM skills WHERE id=?").get(req.params.id));
});

// ─── MOODS ───────────────────────────────────────────────────
app.get("/api/moods",  auth, (req, res) => res.json(db.prepare("SELECT * FROM moods WHERE user_id=? ORDER BY id DESC LIMIT 14").all(req.user.userId).reverse()));
app.post("/api/moods", auth, (req, res) => {
  const { date, mood, prod, note } = req.body;
  const r = db.prepare("INSERT INTO moods (user_id,date,mood,prod,note) VALUES (?,?,?,?,?)").run(req.user.userId,date,mood,prod,note||"");
  res.json(db.prepare("SELECT * FROM moods WHERE id=?").get(r.lastInsertRowid));
});

// ─── SLEEP ───────────────────────────────────────────────────
app.get("/api/sleep",  auth, (req, res) => res.json(db.prepare("SELECT * FROM sleep_log WHERE user_id=? ORDER BY id DESC LIMIT 30").all(req.user.userId).reverse()));
app.post("/api/sleep", auth, (req, res) => {
  const { date, bedtime, wake, duration, quality } = req.body;
  const r = db.prepare("INSERT INTO sleep_log (user_id,date,bedtime,wake,duration,quality) VALUES (?,?,?,?,?,?)").run(req.user.userId,date,bedtime,wake,duration,quality);
  res.json(db.prepare("SELECT * FROM sleep_log WHERE id=?").get(r.lastInsertRowid));
});

// ─── SCREEN TIME ─────────────────────────────────────────────
app.get("/api/screen", auth, (req, res) => res.json(db.prepare("SELECT * FROM screen_time WHERE user_id=? ORDER BY id DESC LIMIT 14").all(req.user.userId).reverse()));
app.post("/api/screen", auth, (req, res) => {
  const { date, social, gaming, study, entertain, other } = req.body;
  db.prepare("INSERT OR REPLACE INTO screen_time (user_id,date,social,gaming,study,entertain,other) VALUES (?,?,?,?,?,?,?)").run(req.user.userId,date,social||0,gaming||0,study||0,entertain||0,other||0);
  res.json({success:true});
});
app.get("/api/screen/limits", auth, (req, res) => {
  let lim = db.prepare("SELECT * FROM screen_limits WHERE user_id=?").get(req.user.userId);
  if (!lim) { db.prepare("INSERT INTO screen_limits (user_id) VALUES (?)").run(req.user.userId); lim=db.prepare("SELECT * FROM screen_limits WHERE user_id=?").get(req.user.userId); }
  res.json(lim);
});
app.put("/api/screen/limits", auth, (req, res) => {
  const { social, gaming, study, entertain, other } = req.body;
  db.prepare("INSERT OR REPLACE INTO screen_limits (user_id,social,gaming,study,entertain,other) VALUES (?,?,?,?,?,?)").run(req.user.userId,social,gaming,study,entertain,other);
  res.json({success:true});
});

// ─── XP LOG ──────────────────────────────────────────────────
app.post("/api/xp", auth, (req, res) => {
  db.prepare("INSERT INTO xp_log (user_id,amount,reason) VALUES (?,?,?)").run(req.user.userId,req.body.amount,req.body.reason||"");
  res.json({success:true});
});
app.get("/api/xp/history", auth, (req, res) => {
  const rows = db.prepare("SELECT strftime('%W',created_at) as week, SUM(amount) as xp FROM xp_log WHERE user_id=? GROUP BY week ORDER BY week DESC LIMIT 8").all(req.user.userId);
  res.json(rows.reverse().map((r,i)=>({week:`W${i+1}`,xp:r.xp})));
});

// ─── SEED ────────────────────────────────────────────────────
function seedDatabase(userId, name) {
  const subs=[{name:"Data Structures & Algorithms",code:"CS301",att:85,notes:"Focus on trees and graphs."},{name:"Operating Systems",code:"CS302",att:90,notes:"Study scheduling algorithms."},{name:"Computer Networks",code:"CS303",att:80,notes:""},{name:"Mathematics III",code:"MA301",att:95,notes:"Review integration by parts."}];
  const asgn={CS301:[{t:"Assignment #1 — Arrays",d:"2025-01-10",done:1},{t:"Assignment #2 — Linked List",d:"2025-01-18",done:1},{t:"Assignment #3 — Trees",d:"2025-01-25",done:0}],CS302:[{t:"Assignment #1 — Processes",d:"2025-01-12",done:1},{t:"Assignment #2 — Scheduling",d:"2025-01-20",done:1},{t:"Assignment #3 — Memory",d:"2025-01-28",done:0},{t:"Assignment #4 — File System",d:"2025-02-05",done:0}],CS303:[{t:"Assignment #1 — OSI Model",d:"2025-01-15",done:1},{t:"Assignment #2 — TCP/IP",d:"2025-01-22",done:0}],MA301:[{t:"Assignment #1",d:"2025-01-08",done:1},{t:"Assignment #2",d:"2025-01-15",done:1},{t:"Assignment #3",d:"2025-01-22",done:1},{t:"Assignment #4",d:"2025-01-29",done:1},{t:"Assignment #5",d:"2025-02-05",done:0}]};
  const exms={CS301:[{t:"Mid-Semester Exam",d:"2025-01-22",done:0},{t:"End-Semester Exam",d:"2025-03-10",done:0}],CS302:[{t:"Midterm Exam",d:"2025-01-25",done:0},{t:"Finals",d:"2025-03-12",done:0}],CS303:[{t:"Midterm Exam",d:"2025-02-05",done:0}],MA301:[{t:"Unit Test 1",d:"2025-01-20",done:1},{t:"Mid-Semester",d:"2025-01-30",done:0},{t:"Finals",d:"2025-03-15",done:0}]};
  for (const s of subs){const r=db.prepare("INSERT INTO subjects (user_id,name,code,attendance,notes) VALUES (?,?,?,?,?)").run(userId,s.name,s.code,s.att,s.notes);for(const a of(asgn[s.code]||[]))db.prepare("INSERT INTO assignments (subject_id,title,due_date,done) VALUES (?,?,?,?)").run(r.lastInsertRowid,a.t,a.d,a.done);for(const e of(exms[s.code]||[]))db.prepare("INSERT INTO exams (subject_id,title,date,done) VALUES (?,?,?,?)").run(r.lastInsertRowid,e.t,e.d,e.done);}
  for(const c of [{name:"Unreal Engine 5 Masterclass",platform:"Udemy",tm:48,dm:12,hours:40,tags:'["Unreal Engine","Game Dev"]',notes:"Complete blueprint tutorials first."},{name:"Advanced Python Programming",platform:"Coursera",tm:30,dm:22,hours:25,tags:'["Python"]',notes:"Revise decorators."},{name:"Algorithms: Design & Analysis",platform:"Self",tm:20,dm:8,hours:30,tags:'["C","Algorithms"]',notes:""}])db.prepare("INSERT INTO courses (user_id,name,platform,total_modules,done_modules,hours,tags,notes) VALUES (?,?,?,?,?,?,?,?)").run(userId,c.name,c.platform,c.tm,c.dm,c.hours,c.tags,c.notes);
  for(const h of [{name:"GYM",streak:12,xp:20,color:"#10E080"},{name:"STUDY 2H",streak:7,xp:25,color:"#00C8FF"},{name:"READING",streak:21,xp:15,color:"#FF6400"},{name:"MEDITATE",streak:3,xp:10,color:"#FFD700"},{name:"SLEEP 8H",streak:5,xp:15,color:"#A855F7"}])db.prepare("INSERT INTO habits (user_id,name,streak,xp,color,target) VALUES (?,?,?,?,?,'Daily')").run(userId,h.name,h.streak,h.xp,h.color);
  for(const s of [{name:"C PROGRAMMING",xp:380,level:4,color:"#00C8FF"},{name:"PYTHON",xp:520,level:5,color:"#10E080"},{name:"UNREAL ENGINE",xp:210,level:3,color:"#FF6400"},{name:"GAME DEV",xp:190,level:2,color:"#FF2828"},{name:"FITNESS",xp:340,level:4,color:"#10E080"},{name:"ALGORITHMS",xp:270,level:3,color:"#FFD700"},{name:"WRITING",xp:90,level:1,color:"#55556A"}])db.prepare("INSERT INTO skills (user_id,name,xp,level,color) VALUES (?,?,?,?,?)").run(userId,s.name,s.xp,s.level,s.color);
  const mDays=["MON","TUE","WED","THU","FRI","SAT","SUN"],mVals=[[8,8],[7,7],[5,4],[9,10],[7,8],[6,6],[8,9]];
  for(let i=0;i<7;i++)db.prepare("INSERT INTO moods (user_id,date,mood,prod) VALUES (?,?,?,?)").run(userId,mDays[i],mVals[i][0],mVals[i][1]);
  for(const s of [{date:"Jan 9",bt:"22:30",wk:"06:30",dur:480,q:4},{date:"Jan 10",bt:"23:00",wk:"06:45",dur:465,q:3},{date:"Jan 11",bt:"01:00",wk:"07:00",dur:360,q:2},{date:"Jan 12",bt:"22:00",wk:"06:30",dur:510,q:5},{date:"Jan 13",bt:"23:30",wk:"07:00",dur:450,q:3},{date:"Jan 14",bt:"22:45",wk:"06:45",dur:480,q:4},{date:"Jan 15",bt:"22:00",wk:"06:30",dur:510,q:5}])db.prepare("INSERT INTO sleep_log (user_id,date,bedtime,wake,duration,quality) VALUES (?,?,?,?,?,?)").run(userId,s.date,s.bt,s.wk,s.dur,s.q);
  for(const s of [{date:"Jan 9",so:95,ga:60,st:120,en:40,ot:30},{date:"Jan 10",so:120,ga:90,st:90,en:60,ot:20},{date:"Jan 11",so:180,ga:120,st:60,en:90,ot:30},{date:"Jan 12",so:60,ga:30,st:150,en:30,ot:15},{date:"Jan 13",so:90,ga:60,st:120,en:45,ot:25},{date:"Jan 14",so:150,ga:90,st:80,en:70,ot:40},{date:"Jan 15",so:80,ga:45,st:140,en:35,ot:20}])db.prepare("INSERT INTO screen_time (user_id,date,social,gaming,study,entertain,other) VALUES (?,?,?,?,?,?,?)").run(userId,s.date,s.so,s.ga,s.st,s.en,s.ot);
  db.prepare("INSERT INTO screen_limits (user_id,social,gaming,study,entertain,other) VALUES (?,90,60,180,60,60)").run(userId);
  for(const t of [{title:"Data Structures Assignment #3",cat:"Academic",per:"Daily",pri:"High",tags:'["C","Algorithms"]',done:0},{title:"Study for OS Exam",cat:"Academic",per:"Weekly",pri:"Critical",tags:'["OS"]',done:0},{title:"Build UE5 Game Prototype",cat:"Project",per:"Monthly",pri:"Medium",tags:'["Unreal Engine"]',done:1},{title:"Read Clean Code Ch. 5",cat:"Learning",per:"Daily",pri:"Low",tags:'["Writing"]',done:0},{title:"Morning Gym Session",cat:"Health",per:"Daily",pri:"Medium",tags:'["Fitness"]',done:1},{title:"Complete Python Module 23",cat:"Learning",per:"Weekly",pri:"Medium",tags:'["Python"]',done:0},{title:"Math Assignment Submission",cat:"Academic",per:"Daily",pri:"High",tags:'[]',done:0}])db.prepare("INSERT INTO tasks (user_id,title,category,period,priority,tags,done) VALUES (?,?,?,?,?,?,?)").run(userId,t.title,t.cat,t.per,t.pri,t.tags,t.done);
  for(const e of [{amount:280,reason:"Week 1"},{amount:350,reason:"Week 2"},{amount:220,reason:"Week 3"},{amount:480,reason:"Week 4"},{amount:390,reason:"Week 5"},{amount:520,reason:"Week 6"}])db.prepare("INSERT INTO xp_log (user_id,amount,reason) VALUES (?,?,?)").run(userId,e.amount,e.reason);
}

app.listen(PORT, "127.0.0.1", () => {
  console.log(`[LifeOS Server] Running on http://127.0.0.1:${PORT}`);
  console.log(`[LifeOS Server] Database: ${DB_PATH}`);
});
