import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, User, CheckSquare, Flame, BookOpen, GraduationCap,
  Smile, BarChart2, Plus, X, Check, Zap, Target, Clock,
  Gauge, Activity, Monitor, Moon, Pencil, Trash2,
  ChevronDown, AlertTriangle, BookMarked, Lock, Eye, EyeOff,
  LogOut, Shield, KeyRound, RefreshCw
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, AreaChart, Area
} from "recharts";

// ─── CONFIG ────────────────────────────────────────────────
const API = "http://localhost:3001/api";
const TOKEN_KEY = "lifeos_token";

// ─── TOKENS ────────────────────────────────────────────────
const C = {
  bg:"#060608",surface:"#09090f",card:"#0d0d16",border:"#1c1c2a",
  orange:"#FF6400",red:"#FF2828",gold:"#FFD700",cyan:"#00C8FF",
  green:"#10E080",purple:"#A855F7",white:"#F0F0F8",
  grey:"#55556A",greyDim:"#22223A",text:"#D0D0E8",
  textMid:"#70708A",textDim:"#32323E",
};
const RANKS = [
  {name:"ROOKIE",      tag:"RK",min:1,  color:"#5A7AFF"},
  {name:"STREET RACER",tag:"SR",min:5,  color:"#00C8FF"},
  {name:"OUTLAW",      tag:"OL",min:10, color:"#FF6400"},
  {name:"BLACKLIST",   tag:"BL",min:15, color:"#FF2828"},
  {name:"MOST WANTED", tag:"MW",min:20, color:"#FFD700"},
  {name:"LEGEND",      tag:"LG",min:25, color:"#F0F0F8"},
];
const PRI_XP  = {Low:15,Medium:30,High:60,Critical:120};
const PRI_C   = {
  Low:     {c:"#5A7AFF",bg:"#5A7AFF14",t:"LOW"},
  Medium:  {c:"#00C8FF",bg:"#00C8FF14",t:"MED"},
  High:    {c:"#FF6400",bg:"#FF640014",t:"HIGH"},
  Critical:{c:"#FF2828",bg:"#FF282814",t:"CRIT"},
};
const TASK_PERIODS = ["Daily","Weekly","Monthly","Quarterly","Long-term"];
const xpForLevel = l => Math.floor(100 * Math.pow(l, 1.4));
const getRank    = l => [...RANKS].reverse().find(r => l >= r.min) || RANKS[0];
const clip       = (px=9) => `polygon(0 0,calc(100% - ${px}px) 0,100% ${px}px,100% 100%,${px}px 100%,0 calc(100% - ${px}px))`;
const fmtMin     = m => `${Math.floor(m/60)}h ${m%60}m`;
const todayStr   = () => { const d=new Date(); const M=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${M[d.getMonth()]} ${d.getDate()}`; };

const NAV = [
  {id:"dashboard",label:"DASHBOARD",  Icon:LayoutDashboard},
  {id:"profile",  label:"PROFILE",    Icon:User},
  {id:"tasks",    label:"MISSIONS",   Icon:CheckSquare},
  {id:"habits",   label:"DAILY OPS",  Icon:Flame},
  {id:"academic", label:"ACADEMIC",   Icon:GraduationCap},
  {id:"courses",  label:"TRAINING",   Icon:BookOpen},
  {id:"vitals",   label:"VITALS",     Icon:Activity},
  {id:"sleep",    label:"SLEEP LOG",  Icon:Moon},
  {id:"screen",   label:"SCREEN TIME",Icon:Monitor},
  {id:"analytics",label:"TELEMETRY",  Icon:BarChart2},
];

// ─── API HELPER ─────────────────────────────────────────────
async function apiFetch(path, options = {}, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ─── SHARED UI ──────────────────────────────────────────────
function Card({ children, style={}, glow=false, onClick }) {
  return (
    <div onClick={onClick} style={{
      background:C.card, border:`1px solid ${glow?C.orange+"55":C.border}`,
      padding:"12px 14px", position:"relative", overflow:"hidden", clipPath:clip(9),
      boxShadow:glow?`0 0 18px ${C.orange}20`:undefined,
      cursor:onClick?"pointer":"default", transition:"border-color 0.18s", ...style }}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:1,
        background:`linear-gradient(90deg,transparent,${glow?C.orange:C.border},transparent)`}}/>
      {children}
    </div>
  );
}
function SpeedBar({ value, max=100, color=C.orange, height=6 }) {
  const pct = Math.min(100, max>0 ? Math.round((value/max)*100) : 0);
  return (
    <div style={{height,background:"#12121e",position:"relative",overflow:"hidden"}}>
      {[25,50,75].map(t=><div key={t} style={{position:"absolute",left:`${t}%`,top:0,width:1,height:"100%",background:"#ffffff08"}}/>)}
      <div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${color}99,${color})`,
        boxShadow:`0 0 6px ${color}66`,transition:"width 0.7s cubic-bezier(0.34,1.56,0.64,1)"}}/>
    </div>
  );
}
function STag({ label, color=C.orange }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
      <div style={{width:2,height:12,background:color}}/>
      <span style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:9,color,letterSpacing:"0.14em"}}>{label}</span>
      <div style={{flex:1,height:1,background:`linear-gradient(90deg,${color}30,transparent)`}}/>
    </div>
  );
}
function SpeedLines() {
  return <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0,
    backgroundImage:`repeating-linear-gradient(108deg,transparent,transparent 18px,${C.orange}06 18px,${C.orange}06 20px)`}}/>;
}
function Btn({ children, onClick, style={}, color=C.orange, bg, disabled=false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:9,letterSpacing:"0.1em",
      cursor:disabled?"not-allowed":"pointer",padding:"6px 14px",border:"none",clipPath:clip(6),
      transition:"all 0.15s",background:bg||`${color}18`,color,border:`1px solid ${color}44`,
      opacity:disabled?0.5:1,...style}}>{children}</button>
  );
}
function Inp({ value, onChange, placeholder, type="text", style={} }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,
        fontFamily:"'Rajdhani',sans-serif",fontSize:13,padding:"8px 12px",
        width:"100%",outline:"none",boxSizing:"border-box",...style}}/>
  );
}
function Sel({ value, onChange, children, style={} }) {
  return (
    <select value={value} onChange={onChange}
      style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,
        fontFamily:"'Rajdhani',sans-serif",fontSize:13,padding:"8px 12px",
        width:"100%",outline:"none",boxSizing:"border-box",...style}}>
      {children}
    </select>
  );
}
function Spinner({ color=C.orange }) {
  return <div style={{width:20,height:20,border:`2px solid ${color}33`,borderTop:`2px solid ${color}`,borderRadius:"50%",animation:"spin 0.8s linear infinite",display:"inline-block"}}/>;
}

// ═══════════════════════════════════════════════════════════
//  LOGIN GATE — NFS themed auth screen
// ═══════════════════════════════════════════════════════════
function LoginGate({ onAuth }) {
  const [mode,     setMode]     = useState(null); // null=checking, "setup", "login"
  const [name,     setName]     = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [glitch,   setGlitch]   = useState(false);

  useEffect(() => {
    apiFetch("/auth/status")
      .then(d => setMode(d.hasAccount ? "login" : "setup"))
      .catch(() => setError("Cannot reach server. Make sure backend is running on port 3001."));
  }, []);

  const triggerGlitch = () => { setGlitch(true); setTimeout(() => setGlitch(false), 500); };

  const submit = async () => {
    setError("");
    if (mode === "setup") {
      if (!name.trim())           return setError("Enter your driver name");
      if (password.length < 6)   return setError("Password must be at least 6 characters");
      if (password !== confirm)   return setError("Passwords do not match");
    }
    if (!password) return setError("Enter your password");
    setLoading(true);
    try {
      const endpoint = mode === "setup" ? "/auth/setup" : "/auth/login";
      const body     = mode === "setup" ? { name, password } : { password };
      const data     = await apiFetch(endpoint, { method:"POST", body: JSON.stringify(body) });
      localStorage.setItem(TOKEN_KEY, data.token);
      onAuth(data.token, data.name);
    } catch (e) {
      triggerGlitch();
      setError(e.message);
    }
    setLoading(false);
  };

  const handleKey = e => { if (e.key === "Enter") submit(); };

  return (
    <div style={{
      height:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'Rajdhani',sans-serif", position:"relative", overflow:"hidden",
    }}>
      {/* Background speed lines */}
      <SpeedLines/>

      {/* Animated corner accents */}
      {[[0,0,"0 0,20px 0,0 20px"],[0,"auto","0 0,20px 0,0 20px"],[{right:0},0,null],[{right:0},"auto",null]].slice(0,2).map((_,i)=>(
        <div key={i} style={{
          position:"absolute", [i===0?"top":"bottom"]:0, [i===0?"left":"right"]:0,
          width:60, height:60,
          borderTop:i===0?`2px solid ${C.orange}`:undefined, borderLeft:i===0?`2px solid ${C.orange}`:undefined,
          borderBottom:i!==0?`2px solid ${C.orange}`:undefined, borderRight:i!==0?`2px solid ${C.orange}`:undefined,
        }}/>
      ))}
      <div style={{position:"absolute",top:0,right:0,width:60,height:60,borderTop:`2px solid ${C.orange}`,borderRight:`2px solid ${C.orange}`}}/>
      <div style={{position:"absolute",bottom:0,left:0,width:60,height:60,borderBottom:`2px solid ${C.orange}`,borderLeft:`2px solid ${C.orange}`}}/>

      {/* Main login card */}
      <div style={{
        width:380, padding:"32px 28px",
        background:"#0a0a14",
        border:`1px solid ${C.orange}44`,
        clipPath:"polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,18px 100%,0 calc(100% - 18px))",
        boxShadow:`0 0 40px ${C.orange}18`,
        position:"relative", overflow:"hidden",
        animation:glitch?"glitch 0.4s ease":"none",
      }}>
        <SpeedLines/>
        <div style={{position:"absolute",top:0,left:0,right:0,height:2,
          background:`linear-gradient(90deg,transparent,${C.orange},transparent)`}}/>

        <div style={{position:"relative",zIndex:1}}>
          {/* Logo */}
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{
              width:56,height:56,margin:"0 auto 12px",
              background:`${C.orange}18`,border:`2px solid ${C.orange}55`,
              display:"flex",alignItems:"center",justifyContent:"center",
              clipPath:clip(10),
            }}>
              <Gauge size={24} color={C.orange}/>
            </div>
            <div style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:20,color:C.white,letterSpacing:"0.1em"}}>LIFE OS</div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:8,color:C.textDim,letterSpacing:"0.2em",marginTop:3}}>PERSONAL SYSTEM v2.0</div>
          </div>

          {mode === null && (
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <Spinner/>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:10,color:C.grey,letterSpacing:"0.1em",marginTop:10}}>CONNECTING TO SERVER...</div>
            </div>
          )}

          {mode !== null && (
            <>
              {/* Mode label */}
              <div style={{
                fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:10,
                color:C.orange,letterSpacing:"0.16em",textAlign:"center",marginBottom:20,
              }}>
                {mode==="setup" ? "── FIRST TIME SETUP ──" : "── SYSTEM UNLOCK ──"}
              </div>

              {mode==="setup" && (
                <div style={{marginBottom:12}}>
                  <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.grey,letterSpacing:"0.1em",marginBottom:5}}>DRIVER NAME</div>
                  <Inp value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your name..." onKeyDown={handleKey}/>
                </div>
              )}

              <div style={{marginBottom:12}}>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.grey,letterSpacing:"0.1em",marginBottom:5}}>
                  {mode==="setup"?"CREATE PASSWORD":"PASSWORD"}
                </div>
                <div style={{position:"relative"}}>
                  <Inp value={password} onChange={e=>setPassword(e.target.value)}
                    placeholder={mode==="setup"?"Min. 6 characters...":"Enter password..."}
                    type={showPw?"text":"password"} onKeyDown={handleKey}
                    style={{paddingRight:36}}/>
                  <button onClick={()=>setShowPw(v=>!v)} style={{
                    position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
                    background:"none",border:"none",cursor:"pointer",padding:0,
                  }}>
                    {showPw?<EyeOff size={14} color={C.grey}/>:<Eye size={14} color={C.grey}/>}
                  </button>
                </div>
              </div>

              {mode==="setup" && (
                <div style={{marginBottom:12}}>
                  <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.grey,letterSpacing:"0.1em",marginBottom:5}}>CONFIRM PASSWORD</div>
                  <Inp value={confirm} onChange={e=>setConfirm(e.target.value)} type={showPw?"text":"password"}
                    placeholder="Repeat password..." onKeyDown={handleKey}/>
                </div>
              )}

              {error && (
                <div style={{
                  display:"flex",alignItems:"center",gap:6,padding:"7px 10px",
                  background:`${C.red}0f`,border:`1px solid ${C.red}44`,
                  marginBottom:14,clipPath:clip(5),
                }}>
                  <AlertTriangle size={12} color={C.red}/>
                  <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:C.red,fontWeight:700}}>{error}</span>
                </div>
              )}

              <button onClick={submit} disabled={loading} style={{
                width:"100%",padding:"12px",
                background:loading?`${C.orange}30`:C.orange,
                border:"none",color:"#000",
                fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:11,
                letterSpacing:"0.12em",cursor:loading?"not-allowed":"pointer",
                clipPath:clip(7),transition:"all 0.2s",
                display:"flex",alignItems:"center",justifyContent:"center",gap:8,
              }}>
                {loading
                  ? <><Spinner color="#000"/><span>AUTHENTICATING...</span></>
                  : <><Lock size={13}/><span>{mode==="setup"?"INITIALIZE SYSTEM":"UNLOCK SYSTEM"}</span></>
                }
              </button>

              <div style={{textAlign:"center",marginTop:14,fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.textDim}}>
                {mode==="setup"
                  ? "Your progress will be saved locally in a secure SQLite database."
                  : "Enter your password to access your personal dashboard."}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SUBJECT CARD — isolated component (hooks safe)
// ═══════════════════════════════════════════════════════════
function SubjectCard({ s, token, onUpdate }) {
  const [open,    setOpen]    = useState(false);
  const [tab,     setTab]     = useState("assignments");
  const [aTitle,  setATitle]  = useState("");
  const [aDue,    setADue]    = useState("");
  const [eTitle,  setETitle]  = useState("");
  const [eDate,   setEDate]   = useState("");
  const [noteTxt, setNoteTxt] = useState(s.notes||"");
  const [noteEdit,setNoteEdit]= useState(false);
  const [attDate, setAttDate] = useState("");
  const [busy,    setBusy]    = useState(false);

  const api = (path, opts) => apiFetch(path, opts, token);
  const doneA = s.assignments.filter(a=>a.done).length;
  const prog  = s.assignments.length > 0 ? Math.round((doneA/s.assignments.length)*100) : 0;
  const bc    = prog>=75?C.green:prog>=50?C.orange:C.red;
  const TABS  = [["assignments","ASSIGNMENTS"],["exams","EXAMS"],["attendance","ATTENDANCE"],["notes","NOTES"]];

  const addA = async () => {
    if (!aTitle.trim()) return;
    setBusy(true);
    const a = await api(`/subjects/${s.id}/assignments`,{method:"POST",body:JSON.stringify({title:aTitle,dueDate:aDue})});
    onUpdate({...s,assignments:[...s.assignments,{...a,done:false}]});
    setATitle(""); setADue("");
    setBusy(false);
  };
  const toggleA = async (id,cur) => {
    await api(`/subjects/${s.id}/assignments/${id}`,{method:"PUT",body:JSON.stringify({done:!cur})});
    onUpdate({...s,assignments:s.assignments.map(a=>a.id===id?{...a,done:!a.done}:a)});
  };
  const deleteA = async (id) => {
    await api(`/subjects/${s.id}/assignments/${id}`,{method:"DELETE"});
    onUpdate({...s,assignments:s.assignments.filter(a=>a.id!==id)});
  };
  const addE = async () => {
    if (!eTitle.trim()) return;
    const e = await api(`/subjects/${s.id}/exams`,{method:"POST",body:JSON.stringify({title:eTitle,date:eDate})});
    onUpdate({...s,exams:[...s.exams,{...e,done:false}]});
    setETitle(""); setEDate("");
  };
  const toggleE = async (id,cur) => {
    await api(`/subjects/${s.id}/exams/${id}`,{method:"PUT",body:JSON.stringify({done:!cur})});
    onUpdate({...s,exams:s.exams.map(e=>e.id===id?{...e,done:!e.done}:e)});
  };
  const logAtt = async (present) => {
    if (!attDate) return;
    const res = await api(`/subjects/${s.id}/attendance`,{method:"POST",body:JSON.stringify({date:attDate,present})});
    const log  = s.attendanceLog.find(a=>a.date===attDate)
      ? s.attendanceLog.map(a=>a.date===attDate?{...a,present}:a)
      : [...s.attendanceLog,{date:attDate,present}];
    onUpdate({...s,attendance:res.attendance,attendanceLog:log});
    setAttDate("");
  };
  const saveNote = async () => {
    await api(`/subjects/${s.id}/notes`,{method:"PUT",body:JSON.stringify({notes:noteTxt})});
    onUpdate({...s,notes:noteTxt});
    setNoteEdit(false);
  };

  return (
    <Card>
      <div onClick={()=>setOpen(o=>!o)} style={{cursor:"pointer"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
          <div style={{minWidth:0,flex:1}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:8,color:C.grey,letterSpacing:"0.12em",marginBottom:3}}>{s.code}</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:13,color:C.text}}>{s.name}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <span style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:16,color:C.white}}>{prog}%</span>
            <ChevronDown size={13} color={C.grey} style={{transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}/>
          </div>
        </div>
        <SpeedBar value={prog} max={100} color={bc} height={5}/>
        <div style={{display:"flex",gap:14,marginTop:7,flexWrap:"wrap"}}>
          {[{l:"ASSIGN",v:`${doneA}/${s.assignments.length}`,c:C.cyan},
            {l:"EXAMS", v:s.exams.length,                    c:C.red},
            {l:"ATTEND",v:`${s.attendance}%`,                c:C.green}].map(({l,v,c})=>(
            <span key={l} style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.grey,letterSpacing:"0.06em"}}>
              {l}: <span style={{color:c,fontWeight:700}}>{v}</span>
            </span>
          ))}
        </div>
      </div>

      {open&&(
        <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
          <div style={{display:"flex",gap:4,marginBottom:12}}>
            {TABS.map(([t,l])=>(
              <button key={t} onClick={()=>setTab(t)} style={{
                padding:"4px 10px",border:`1px solid ${tab===t?C.orange:C.border}`,
                background:tab===t?`${C.orange}18`:"transparent",
                color:tab===t?C.orange:C.grey,
                fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:8,
                cursor:"pointer",letterSpacing:"0.1em",clipPath:clip(4)}}>
                {l}
              </button>
            ))}
          </div>

          {tab==="assignments"&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {s.assignments.map(a=>(
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:C.surface,clipPath:clip(5)}}>
                  <button onClick={()=>toggleA(a.id,a.done)} style={{width:17,height:17,border:`2px solid ${a.done?C.green:C.greyDim}`,background:a.done?C.green:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,clipPath:clip(4)}}>
                    {a.done&&<Check size={8} color="#000"/>}
                  </button>
                  <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:12,flex:1,color:a.done?C.textDim:C.text,textDecoration:a.done?"line-through":"none"}}>{a.title}</span>
                  <span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:a.done?C.textDim:C.gold}}>{a.due_date}</span>
                  <button onClick={()=>deleteA(a.id)} style={{background:"none",border:"none",cursor:"pointer",padding:0}}><Trash2 size={10} color={C.textDim}/></button>
                </div>
              ))}
              <div style={{display:"flex",gap:6}}>
                <Inp value={aTitle} onChange={e=>setATitle(e.target.value)} placeholder="Assignment title..." style={{flex:2}}/>
                <Inp type="date" value={aDue} onChange={e=>setADue(e.target.value)} style={{flex:1}}/>
                <Btn onClick={addA} color={C.cyan} disabled={busy} style={{padding:"8px 12px",fontSize:9}}><Plus size={11}/></Btn>
              </div>
            </div>
          )}

          {tab==="exams"&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {s.exams.map(e=>(
                <div key={e.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:C.surface,clipPath:clip(5)}}>
                  <button onClick={()=>toggleE(e.id,e.done)} style={{width:17,height:17,border:`2px solid ${e.done?C.green:C.red}`,background:e.done?C.green:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,clipPath:clip(4)}}>
                    {e.done&&<Check size={8} color="#000"/>}
                  </button>
                  <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:12,flex:1,color:e.done?C.textDim:C.text,textDecoration:e.done?"line-through":"none"}}>{e.title}</span>
                  <span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:e.done?C.textDim:C.red}}>{e.date}</span>
                </div>
              ))}
              <div style={{display:"flex",gap:6}}>
                <Inp value={eTitle} onChange={e=>setETitle(e.target.value)} placeholder="Exam title..." style={{flex:2}}/>
                <Inp type="date" value={eDate} onChange={e=>setEDate(e.target.value)} style={{flex:1}}/>
                <Btn onClick={addE} color={C.red} style={{padding:"8px 12px",fontSize:9}}><Plus size={11}/></Btn>
              </div>
            </div>
          )}

          {tab==="attendance"&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:32,color:s.attendance>=80?C.green:s.attendance>=60?C.orange:C.red}}>{s.attendance}%</div>
                <div>
                  <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:C.grey}}>Attendance Rate</div>
                  <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.textDim}}>{s.attendanceLog.filter(a=>a.present).length}/{s.attendanceLog.length} classes</div>
                </div>
              </div>
              <SpeedBar value={s.attendance} max={100} color={s.attendance>=80?C.green:s.attendance>=60?C.orange:C.red} height={8}/>
              <div style={{background:C.surface,padding:"10px",clipPath:clip(6)}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:C.grey,letterSpacing:"0.1em",marginBottom:8}}>LOG CLASS</div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <Inp type="date" value={attDate} onChange={e=>setAttDate(e.target.value)} style={{flex:1}}/>
                  <Btn onClick={()=>logAtt(true)}  color={C.green} style={{padding:"8px 12px",fontSize:9}}>PRESENT</Btn>
                  <Btn onClick={()=>logAtt(false)} color={C.red}   style={{padding:"8px 12px",fontSize:9}}>ABSENT</Btn>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {[...s.attendanceLog].reverse().slice(0,8).map((a,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"5px 8px",background:C.surface,clipPath:clip(4)}}>
                    <div style={{width:8,height:8,background:a.present?C.green:C.red,clipPath:clip(2),flexShrink:0}}/>
                    <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:C.textMid,flex:1}}>{a.date}</span>
                    <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.06em",color:a.present?C.green:C.red}}>{a.present?"PRESENT":"ABSENT"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab==="notes"&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {noteEdit?(
                <>
                  <textarea value={noteTxt} onChange={e=>setNoteTxt(e.target.value)} rows={4}
                    style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,fontFamily:"'Rajdhani',sans-serif",fontSize:12,padding:"10px",width:"100%",outline:"none",resize:"vertical",minHeight:90,boxSizing:"border-box"}}/>
                  <div style={{display:"flex",gap:6}}>
                    <Btn onClick={saveNote} color={C.cyan} style={{flex:1,padding:"8px",fontSize:9}}>SAVE</Btn>
                    <Btn onClick={()=>setNoteEdit(false)}>CANCEL</Btn>
                  </div>
                </>
              ):(
                <div>
                  <div style={{background:C.surface,padding:"10px",minHeight:60,clipPath:clip(6),marginBottom:8}}>
                    <p style={{fontFamily:"'Rajdhani',sans-serif",fontSize:12,color:noteTxt?C.text:C.textDim,margin:0,lineHeight:1.6}}>{noteTxt||"No notes yet."}</p>
                  </div>
                  <Btn onClick={()=>setNoteEdit(true)} color={C.orange} style={{fontSize:9,padding:"6px 14px"}}><Pencil size={10} style={{display:"inline",marginRight:4}}/>EDIT NOTES</Btn>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
//  COURSE CARD
// ═══════════════════════════════════════════════════════════
function CourseCard({ c, token, onProgress, onUpdateCourse }) {
  const [noteOpen,  setNoteOpen]  = useState(false);
  const [noteDraft, setNoteDraft] = useState(c.notes||"");
  const pct = Math.round((c.done_modules/c.total_modules)*100);
  const hl  = Math.round(((c.total_modules-c.done_modules)/c.total_modules)*c.hours);
  const saveNote = async () => {
    await apiFetch(`/courses/${c.id}`,{method:"PUT",body:JSON.stringify({notes:noteDraft})},token);
    onUpdateCourse(c.id,{notes:noteDraft});
    setNoteOpen(false);
  };
  return (
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
        <div style={{minWidth:0,flex:1,paddingRight:10}}>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14,color:C.text,letterSpacing:"0.04em"}}>{c.name}</div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:8,color:C.grey,marginTop:2,letterSpacing:"0.1em"}}>{c.platform?.toUpperCase()}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:18,color:C.white}}>{pct}%</div>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.grey}}>{c.done_modules}/{c.total_modules} modules</div>
        </div>
      </div>
      <SpeedBar value={c.done_modules} max={c.total_modules} color={C.cyan} height={7}/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:8}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {c.tags?.map(t=><span key={t} style={{fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:C.cyan,background:`${C.cyan}14`,padding:"1px 6px",letterSpacing:"0.06em",fontWeight:700}}>{t}</span>)}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <Clock size={10} color={C.grey}/>
          <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.grey}}>~{hl}H LEFT</span>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:6,marginTop:10}}>
        <Btn onClick={()=>onProgress(c.id,1)}  color={C.cyan} style={{padding:"7px",fontSize:9}}>+ COMPLETE MODULE (+30 XP)</Btn>
        <Btn onClick={()=>onProgress(c.id,-1)} color={C.grey} style={{padding:"7px",fontSize:9}}>UNDO</Btn>
        <Btn onClick={()=>{setNoteOpen(o=>!o);setNoteDraft(c.notes||"");}} color={C.purple} style={{padding:"7px",fontSize:9}}><BookMarked size={11}/></Btn>
      </div>
      {noteOpen&&(
        <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`}}>
          <STag label="COURSE NOTES" color={C.purple}/>
          <textarea value={noteDraft} onChange={e=>setNoteDraft(e.target.value)} rows={3}
            placeholder="Add notes, resources, key points..."
            style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,fontFamily:"'Rajdhani',sans-serif",fontSize:12,padding:"8px 10px",width:"100%",outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
          <div style={{display:"flex",gap:6,marginTop:6}}>
            <Btn onClick={saveNote} color={C.cyan} style={{flex:1,padding:"7px",fontSize:9}}>SAVE NOTES</Btn>
            <Btn onClick={()=>setNoteOpen(false)}>CANCEL</Btn>
          </div>
        </div>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN LIFEOS APP
// ═══════════════════════════════════════════════════════════
function LifeOS({ token, playerName, onLogout }) {
  const [view,         setView]         = useState("dashboard");
  const [player,       setPlayer]       = useState(null);
  const [tasks,        setTasks]        = useState([]);
  const [subjects,     setSubjects]     = useState([]);
  const [courses,      setCourses]      = useState([]);
  const [habits,       setHabits]       = useState([]);
  const [skills,       setSkills]       = useState([]);
  const [moods,        setMoods]        = useState([]);
  const [sleepLog,     setSleepLog]     = useState([]);
  const [screenTime,   setScreenTime]   = useState([]);
  const [screenLimits, setScreenLimits] = useState({social:90,gaming:60,study:180,entertain:60,other:60});
  const [xpHistory,    setXpHistory]    = useState([]);
  const [toast,        setToast]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [showSecurity, setShowSecurity] = useState(false);

  const api = useCallback((path, opts) => apiFetch(path, opts, token), [token]);

  // ── Load all data on mount ──
  useEffect(() => {
    const load = async () => {
      try {
        const [p,t,sub,crs,hab,skl,md,sl,sc,lim,xp] = await Promise.all([
          api("/player"),
          api("/tasks"),
          api("/subjects"),
          api("/courses"),
          api("/habits"),
          api("/skills"),
          api("/moods"),
          api("/sleep"),
          api("/screen"),
          api("/screen/limits"),
          api("/xp/history"),
        ]);
        setPlayer(p);
        setTasks(t);
        setSubjects(sub);
        setCourses(crs);
        setHabits(hab);
        setSkills(skl);
        setMoods(md);
        setSleepLog(sl);
        setScreenTime(sc.length?sc:[{date:"Today",social:0,gaming:0,study:0,entertain:0,other:0}]);
        setScreenLimits({social:lim.social,gaming:lim.gaming,study:lim.study,entertain:lim.entertain,other:lim.other});
        setXpHistory(xp.length?xp:[{week:"W1",xp:0}]);
      } catch(e) {
        console.error("Load error", e);
      }
      setLoading(false);
    };
    load();
  }, [api]);

  // ── XP Engine ──
  const showToast = (msg, sub, levelUp, newLevel, color) => {
    setToast({msg,sub,levelUp,newLevel,color});
    setTimeout(()=>setToast(null), levelUp?4000:2800);
  };

  const addXP = useCallback(async (amount, reason) => {
    if (!player) return;
    const xpMax = xpForLevel(player.level);
    const newXP = player.xp + amount;
    let newLevel = player.level, finalXP = newXP;

    if (newXP >= xpMax) {
      newLevel = player.level + 1;
      finalXP  = newXP - xpMax;
      const nr = getRank(newLevel);
      showToast(`+${amount} XP`, "LEVEL UP!", true, newLevel, nr.color);
    } else {
      showToast(`+${amount} XP`, reason?.slice(0,32), false, null, C.orange);
    }
    const updated = { level: newLevel, xp: finalXP };
    setPlayer(p => ({ ...p, ...updated }));
    await api("/player", { method:"PUT", body: JSON.stringify(updated) });
    await api("/xp", { method:"POST", body: JSON.stringify({ amount, reason: reason||"" }) });
  }, [player, api]);

  const addSkillXP = useCallback(async (tags, xp) => {
    if (!tags?.length) return;
    for (const s of skills) {
      const match = tags.some(tag =>
        s.name.toLowerCase().includes(tag.toLowerCase().split(" ")[0]) ||
        tag.toLowerCase().includes(s.name.toLowerCase().split(" ")[0]));
      if (!match) continue;
      const nxp  = s.xp + Math.floor(xp * 0.4);
      const nlvl = Math.max(s.level, Math.floor(nxp / 100) + 1);
      setSkills(ss => ss.map(sk => sk.id===s.id ? {...sk,xp:nxp,level:nlvl} : sk));
      await api(`/skills/${s.id}`, { method:"PUT", body: JSON.stringify({xp:nxp,level:nlvl}) });
    }
  }, [skills, api]);

  // ── TASK ACTIONS ──
  const completeTask = async (id) => {
    const t = tasks.find(t=>t.id===id&&!t.done);
    if (!t) return;
    setTasks(ts => ts.map(t => t.id===id ? {...t,done:true} : t));
    await api(`/tasks/${id}`, { method:"PUT", body: JSON.stringify({done:true}) });
    const xp = PRI_XP[t.priority];
    await addXP(xp, t.title);
    await addSkillXP(t.tags, xp);
  };
  const addTask = async (task) => {
    const t = await api("/tasks", { method:"POST", body: JSON.stringify(task) });
    setTasks(ts => [t, ...ts]);
  };
  const deleteTask = async (id) => {
    setTasks(ts => ts.filter(t=>t.id!==id));
    await api(`/tasks/${id}`, { method:"DELETE" });
  };

  // ── HABIT ACTIONS ──
  const toggleHabit = async (id) => {
    const h = habits.find(h=>h.id===id&&!h.done);
    if (!h) return;
    const newStreak = h.streak + 1;
    setHabits(hs => hs.map(h => h.id===id ? {...h,done:true,streak:newStreak} : h));
    await api(`/habits/${id}`, { method:"PUT", body: JSON.stringify({done:true,streak:newStreak,last_completed:todayStr()}) });
    await addXP(h.xp, `HABIT: ${h.name}`);
  };
  const addHabit = async (h) => {
    const created = await api("/habits", { method:"POST", body: JSON.stringify(h) });
    setHabits(hs => [...hs, created]);
  };
  const deleteHabit = async (id) => {
    setHabits(hs => hs.filter(h=>h.id!==id));
    await api(`/habits/${id}`, { method:"DELETE" });
  };

  // ── SUBJECT ACTIONS ──
  const updateSubject = (s) => setSubjects(ss => ss.map(x => x.id===s.id ? s : x));

  // ── COURSE ACTIONS ──
  const courseProgress = async (id, delta) => {
    const c = courses.find(c=>c.id===id);
    if (!c) return;
    const done = Math.max(0, Math.min(c.total_modules, c.done_modules + delta));
    setCourses(cs => cs.map(c => c.id===id ? {...c,done_modules:done} : c));
    await api(`/courses/${id}`, { method:"PUT", body: JSON.stringify({done_modules:done}) });
    if (delta > 0 && done > c.done_modules) await addXP(30, "MODULE CLEARED");
  };
  const addCourse = async (c) => {
    const created = await api("/courses", { method:"POST", body: JSON.stringify({...c,modules:+c.modules,hours:+c.hours}) });
    setCourses(cs => [...cs, created]);
  };
  const updateCourse = (id, patch) => setCourses(cs => cs.map(c => c.id===id ? {...c,...patch} : c));

  // ── MOOD ──
  const addMood = async (entry) => {
    const d = new Date(), days=["SUN","MON","TUE","WED","THU","FRI","SAT"];
    const m = await api("/moods", { method:"POST", body: JSON.stringify({date:days[d.getDay()],...entry}) });
    setMoods(ms => [...ms.slice(-6), m]);
  };

  // ── SLEEP ──
  const addSleep = async (entry) => {
    const s = await api("/sleep", { method:"POST", body: JSON.stringify(entry) });
    setSleepLog(l => [...l, s]);
    await addXP(10, "SLEEP LOGGED");
  };

  // ── SCREEN TIME ──
  const logScreenToday = async (data) => {
    const d = new Date(), M=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const date = `${M[d.getMonth()]} ${d.getDate()}`;
    await api("/screen", { method:"POST", body: JSON.stringify({date,...data}) });
    setScreenTime(s => {
      const copy = [...s];
      copy[copy.length - 1] = { ...copy[copy.length-1], ...data };
      return copy;
    });
  };
  const updateScreenLimits = async (lim) => {
    setScreenLimits(lim);
    await api("/screen/limits", { method:"PUT", body: JSON.stringify(lim) });
  };

  // ── Derived ──
  const rank   = player ? getRank(player.level) : RANKS[0];
  const xpMax  = player ? xpForLevel(player.level) : 100;
  const xpPct  = player ? Math.min(100, Math.round((player.xp/xpMax)*100)) : 0;
  const active = NAV.find(n=>n.id===view);
  const achievements = [
    {name:"7-DAY STREAK",   desc:"7 habit days in a row",   done:habits.some(h=>h.streak>=7)},
    {name:"EXAM READY",     desc:"Mark 3+ exams done",      done:subjects.flatMap(s=>s.exams).filter(e=>e.done).length>=3},
    {name:"SKILL LV.3",     desc:"Reach Lv.3 in any skill", done:skills.some(s=>s.level>=3)},
    {name:"READER WARRIOR", desc:"21-day reading streak",   done:habits.find(h=>h.name==="READING")?.streak>=21},
    {name:"COURSE CLEAR",   desc:"Complete a full course",  done:courses.some(c=>c.done_modules>=c.total_modules)},
    {name:"30-DAY KING",    desc:"30-day habit streak",     done:habits.some(h=>h.streak>=30)},
    {name:"CENTURY CLUB",   desc:"100 tasks completed",     done:tasks.filter(t=>t.done).length>=100},
    {name:"PERFECT WEEK",   desc:"100% habits in one week", done:false},
  ];

  // ── LOADING SCREEN ──
  if (loading || !player) {
    return (
      <div style={{height:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,position:"relative",overflow:"hidden"}}>
        <SpeedLines/>
        <div style={{width:56,height:56,background:`${C.orange}18`,border:`2px solid ${C.orange}55`,display:"flex",alignItems:"center",justifyContent:"center",clipPath:clip(10)}}>
          <Gauge size={24} color={C.orange}/>
        </div>
        <Spinner color={C.orange}/>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:C.grey,letterSpacing:"0.14em"}}>LOADING SYSTEM DATA...</div>
      </div>
    );
  }

  // ── CHANGE PASSWORD MODAL ──
  const SecurityModal = () => {
    const [op,setOp]=useState(""),np=useState("")[0],setnp=useState("")[1],err=useState("")[0],setErr=useState("")[1],ok=useState(false)[0],setOk=useState(false)[1];
    const [newp,setNewp]=useState("");
    const submit=async()=>{
      setErr("");
      try{
        await api("/auth/change-password",{method:"POST",body:JSON.stringify({oldPassword:op,newPassword:newp})});
        setOk(true); setTimeout(()=>setShowSecurity(false),1500);
      }catch(e){setErr(e.message);}
    };
    return(
      <div style={{position:"fixed",inset:0,background:"#000000aa",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
        <Card style={{width:320,padding:"20px"}} glow>
          <STag label="CHANGE PASSWORD" color={C.orange}/>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <Inp type="password" value={op}   onChange={e=>setOp(e.target.value)}   placeholder="Current password..."/>
            <Inp type="password" value={newp} onChange={e=>setNewp(e.target.value)} placeholder="New password (min 6)..."/>
            {err&&<div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:C.red,fontWeight:700}}>{err}</div>}
            {ok &&<div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:C.green,fontWeight:700}}>PASSWORD UPDATED!</div>}
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={submit} bg={C.orange} color="#000" style={{flex:1,padding:"9px",fontSize:9}}>UPDATE</Btn>
              <Btn onClick={()=>setShowSecurity(false)}>CANCEL</Btn>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderSection = () => {
    const commonProps = { token, api };
    switch(view){
      case "dashboard": return <Dashboard player={player} tasks={tasks} habits={habits} moods={moods} skills={skills} subjects={subjects} sleepLog={sleepLog} screenTime={screenTime} screenLimits={screenLimits} onToggleHabit={toggleHabit} onCompleteTask={completeTask}/>;
      case "profile":   return <Profile   player={player} skills={skills} achievements={achievements}/>;
      case "tasks":     return <Tasks     tasks={tasks} subjects={subjects} courses={courses} onComplete={completeTask} onAdd={addTask} onDelete={deleteTask}/>;
      case "habits":    return <Habits    habits={habits} onToggle={toggleHabit} onAdd={addHabit} onDelete={deleteHabit}/>;
      case "academic":  return <div style={{display:"flex",flexDirection:"column",gap:10}}>{subjects.map(s=><SubjectCard key={s.id} s={s} token={token} onUpdate={updateSubject}/>)}</div>;
      case "courses":   return <CoursesView courses={courses} token={token} onProgress={courseProgress} onAdd={addCourse} onUpdateCourse={updateCourse}/>;
      case "vitals":    return <Vitals  moods={moods} onAdd={addMood}/>;
      case "sleep":     return <SleepLog sleepLog={sleepLog} onAdd={addSleep}/>;
      case "screen":    return <ScreenTimeView screenTime={screenTime} screenLimits={screenLimits} onLogToday={logScreenToday} onUpdateLimits={updateScreenLimits}/>;
      case "analytics": return <Analytics tasks={tasks} habits={habits} skills={skills} xpHistory={xpHistory} moods={moods} sleepLog={sleepLog} screenTime={screenTime} screenLimits={screenLimits}/>;
      default: return null;
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600;700;800&display=swap');
        @keyframes nfsIn{from{transform:translateX(30px) scale(0.92);opacity:0}to{transform:translateX(0) scale(1);opacity:1}}
        @keyframes scanEdge{0%,100%{opacity:0.4}50%{opacity:0.9}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes glitch{0%{transform:translate(0)}25%{transform:translate(-3px,1px)}50%{transform:translate(3px,-1px)}75%{transform:translate(-1px,2px)}100%{transform:translate(0)}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${C.greyDim}}
        button,select,input,textarea{font-family:'Rajdhani',sans-serif}
        input[type=range]{cursor:pointer;height:4px}
        input[type=date],input[type=time]{color-scheme:dark}
      `}</style>

      <div style={{display:"flex",height:"100vh",background:C.bg,color:C.text,fontFamily:"'Rajdhani',sans-serif",overflow:"hidden"}}>
        {/* SIDEBAR */}
        <aside style={{width:198,background:"#060610",borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,position:"relative",overflow:"hidden"}}>
          <SpeedLines/>
          <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,position:"relative",zIndex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:32,height:32,background:C.orange,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,clipPath:clip(7)}}>
                <Gauge size={15} color="#000"/>
              </div>
              <div>
                <div style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:12,color:C.white,letterSpacing:"0.12em"}}>LIFE OS</div>
                <div style={{fontSize:7,color:C.textDim,letterSpacing:"0.14em"}}>PERSONAL SYSTEM v2.0</div>
              </div>
            </div>
          </div>

          <div style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`,position:"relative",zIndex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
              <div style={{width:34,height:34,flexShrink:0,background:`${rank.color}16`,border:`1.5px solid ${rank.color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:13,color:rank.color,clipPath:clip(7)}}>{player.level}</div>
              <div style={{minWidth:0}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:10,color:C.white,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"0.08em"}}>{player.name}</div>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:rank.color,letterSpacing:"0.1em"}}>{rank.name}</div>
              </div>
            </div>
            <SpeedBar value={player.xp} max={xpMax} color={rank.color} height={4}/>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,color:C.textDim,marginTop:3}}>{player.xp}/{xpMax} XP</div>
          </div>

          <nav style={{flex:1,padding:"6px",overflowY:"auto",position:"relative",zIndex:1}}>
            {NAV.map(({id,label,Icon})=>{
              const on=view===id;
              return(
                <button key={id} onClick={()=>setView(id)} style={{width:"100%",display:"flex",alignItems:"center",gap:7,padding:"6px 9px",border:"none",marginBottom:1,fontFamily:"'Orbitron',monospace",fontWeight:on?700:400,fontSize:8,letterSpacing:"0.1em",background:on?`${rank.color}16`:"transparent",color:on?rank.color:C.grey,borderLeft:on?`2px solid ${rank.color}`:"2px solid transparent",transition:"all 0.15s",textAlign:"left",cursor:"pointer"}}>
                  <Icon size={12}/>{label}
                </button>
              );
            })}
          </nav>

          {/* Bottom: security + logout */}
          <div style={{padding:"8px",borderTop:`1px solid ${C.border}`,position:"relative",zIndex:1,display:"flex",flexDirection:"column",gap:4}}>
            <button onClick={()=>setShowSecurity(true)} style={{width:"100%",display:"flex",alignItems:"center",gap:7,padding:"5px 9px",border:"none",background:"transparent",color:C.grey,fontFamily:"'Orbitron',monospace",fontSize:8,letterSpacing:"0.1em",cursor:"pointer",textAlign:"left"}}>
              <KeyRound size={11}/> CHANGE PWD
            </button>
            <button onClick={onLogout} style={{width:"100%",display:"flex",alignItems:"center",gap:7,padding:"5px 9px",border:"none",background:"transparent",color:`${C.red}bb`,fontFamily:"'Orbitron',monospace",fontSize:8,letterSpacing:"0.1em",cursor:"pointer",textAlign:"left"}}>
              <LogOut size={11}/> LOCK SYSTEM
            </button>
            <div style={{display:"flex",gap:2,marginTop:3}}>
              {[0,1,2,3,4].map(i=>(
                <div key={i} style={{flex:1,height:3,background:i<Math.floor((player.xp/xpMax)*5)?rank.color:C.greyDim,transition:"all 0.5s"}}/>
              ))}
            </div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:7,color:C.textDim,textAlign:"center",letterSpacing:"0.1em"}}>FUEL: {xpPct}%</div>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:C.bg}}>
          <header style={{background:"#060610",borderBottom:`1px solid ${C.border}`,padding:"9px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",bottom:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${rank.color}55,transparent)`,animation:"scanEdge 2s infinite"}}/>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              {active&&<active.Icon size={13} color={rank.color}/>}
              <h1 style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:12,color:C.white,letterSpacing:"0.1em",margin:0}}>{active?.label}</h1>
              <div style={{width:1,height:12,background:C.greyDim}}/>
              <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:C.green,letterSpacing:"0.06em"}}>● SYNCED</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:5,background:`${C.orange}0a`,border:`1px solid ${C.orange}44`,padding:"3px 10px",clipPath:clip(5)}}>
                <Zap size={9} color={C.orange}/>
                <span style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:11,color:C.orange}}>{player.xp} XP</span>
              </div>
              <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.grey,letterSpacing:"0.06em"}}>LV.{player.level} · {rank.name}</span>
            </div>
          </header>

          <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
            <div style={{maxWidth:740,margin:"0 auto"}}>
              {renderSection()}
              <div style={{height:40}}/>
            </div>
          </div>
        </main>

        {/* XP TOAST */}
        {toast&&(
          <div style={{position:"fixed",bottom:20,right:20,zIndex:9999,background:"#07070d",border:`1px solid ${toast.color}55`,padding:"10px 14px",minWidth:170,clipPath:clip(8),boxShadow:`0 0 20px ${toast.color}30`,animation:"nfsIn 0.3s cubic-bezier(0.34,1.56,0.64,1)"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${toast.color},transparent)`}}/>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <Zap size={13} color={toast.color}/>
              <span style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:13,color:toast.color}}>{toast.msg}</span>
              {toast.levelUp&&<span style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:9,color:"#000",background:toast.color,padding:"2px 7px"}}>LEVEL {toast.newLevel}</span>}
            </div>
            {toast.sub&&<div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.grey,marginTop:3,letterSpacing:"0.06em"}}>{toast.sub}</div>}
          </div>
        )}

        {showSecurity && <SecurityModal/>}
      </div>
    </>
  );
}

// ─── Sections (unchanged from previous version, just pass token where needed) ──

function Dashboard({player,tasks,habits,moods,skills,subjects,sleepLog,screenTime,screenLimits,onToggleHabit,onCompleteTask}){
  const rank=getRank(player.level),xpMax=xpForLevel(player.level);
  const doneHab=habits.filter(h=>h.done).length,pending=tasks.filter(t=>!t.done);
  const avgMood=(moods.reduce((s,m)=>s+m.mood,0)/Math.max(moods.length,1)).toFixed(1);
  const lastSleep=sleepLog[sleepLog.length-1],todaySc=screenTime[screenTime.length-1]||{};
  const scAlert=Object.entries(screenLimits).some(([k,lim])=>(todaySc[k]||0)>lim);
  const upExams=subjects.flatMap(s=>s.exams.filter(e=>!e.done).map(e=>({...e,code:s.code}))).slice(0,3);
  const upDue=subjects.flatMap(s=>s.assignments.filter(a=>!a.done).map(a=>({...a,code:s.code}))).sort((a,b)=>a.due_date>b.due_date?1:-1).slice(0,3);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{background:`linear-gradient(135deg,#09090f,${rank.color}0b,#09090f)`,border:`1px solid ${rank.color}44`,padding:"16px 18px",position:"relative",overflow:"hidden",clipPath:clip(16),boxShadow:`0 0 28px ${rank.color}14`}}>
        <SpeedLines/>
        <div style={{position:"absolute",top:0,right:16,width:0,height:0,borderLeft:"16px solid transparent",borderTop:`16px solid ${rank.color}44`}}/>
        <div style={{position:"relative",zIndex:1,display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:70,height:70,flexShrink:0,background:`${rank.color}14`,border:`2px solid ${rank.color}66`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:26,color:rank.color,clipPath:clip(9)}}>{player.level}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap"}}>
              <span style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:15,color:C.white,letterSpacing:"0.08em"}}>{player.name}</span>
              <span style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:9,color:rank.color,background:`${rank.color}18`,border:`1px solid ${rank.color}44`,padding:"2px 8px",letterSpacing:"0.12em"}}>{rank.name}</span>
            </div>
            <SpeedBar value={player.xp} max={xpMax} color={rank.color} height={9}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
              <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.grey}}>{player.xp.toLocaleString()} XP</span>
              <span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:rank.color}}>{xpMax-player.xp} TO LV.{player.level+1}</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
        {[{l:"HABITS",v:`${doneHab}/${habits.length}`,color:C.green,Icon:Flame},{l:"MISSIONS",v:pending.length,color:C.cyan,Icon:Target},{l:"AVG MOOD",v:`${avgMood}/10`,color:C.purple,Icon:Smile},{l:"SLEEP",v:lastSleep?fmtMin(lastSleep.duration):"—",color:C.cyan,Icon:Moon}].map(({l,v,color,Icon})=>(
          <Card key={l} style={{textAlign:"center",padding:"10px 6px"}}><Icon size={12} style={{color,margin:"0 auto 4px"}}/><div style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:13,color:C.white}}>{v}</div><div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:C.grey,marginTop:2,letterSpacing:"0.1em"}}>{l}</div></Card>
        ))}
      </div>
      {scAlert&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:`${C.red}0f`,border:`1px solid ${C.red}44`,clipPath:clip(6)}}><AlertTriangle size={13} color={C.red}/><span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:12,color:C.red,fontWeight:700,letterSpacing:"0.04em"}}>SCREEN TIME LIMIT EXCEEDED — Go to Screen Time</span></div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Card><STag label="DAILY OPS" color={C.green}/><div style={{display:"flex",flexDirection:"column",gap:9}}>{habits.map(h=>(
          <div key={h.id} style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={()=>onToggleHabit(h.id)} style={{width:19,height:19,border:`2px solid ${h.done?h.color:h.color+"44"}`,background:h.done?h.color:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,clipPath:clip(5),transition:"all 0.15s"}}>{h.done&&<Check size={9} color="#000"/>}</button>
            <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:600,fontSize:12,flex:1,color:h.done?C.textDim:C.text,textDecoration:h.done?"line-through":"none",letterSpacing:"0.04em"}}>{h.name}</span>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:10,color:h.color,fontWeight:700}}>{h.streak}</span>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:C.orange}}>+{h.xp}</span>
          </div>
        ))}</div></Card>
        <Card><STag label="ACTIVE MISSIONS" color={C.orange}/><div style={{display:"flex",flexDirection:"column",gap:8}}>{pending.slice(0,5).map(t=>(
          <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:8}}>
            <button onClick={()=>onCompleteTask(t.id)} style={{width:15,height:15,border:`1.5px solid ${C.greyDim}`,background:"transparent",cursor:"pointer",marginTop:1,flexShrink:0,clipPath:clip(4)}}/>
            <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:C.textMid,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</span>
            <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:800,fontSize:9,color:PRI_C[t.priority].c,background:PRI_C[t.priority].bg,padding:"1px 5px",flexShrink:0,letterSpacing:"0.08em"}}>{PRI_C[t.priority].t}</span>
          </div>
        ))}</div></Card>
      </div>
      {upExams.length>0&&<Card><STag label="UPCOMING EXAMS" color={C.red}/>{upExams.map(e=><div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"5px 0",borderBottom:`1px solid ${C.greyDim}30`}}><div style={{width:6,height:6,background:C.red,clipPath:clip(2),flexShrink:0}}/><span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:12,flex:1,color:C.text}}>{e.title}</span><span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.grey}}>{e.code}</span><span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:C.red}}>{e.date}</span></div>)}</Card>}
      {upDue.length>0&&<Card><STag label="DUE ASSIGNMENTS" color={C.gold}/>{upDue.map(a=><div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"5px 0",borderBottom:`1px solid ${C.greyDim}30`}}><div style={{width:6,height:6,background:C.gold,clipPath:clip(2),flexShrink:0}}/><span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:12,flex:1,color:C.text}}>{a.title}</span><span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.grey}}>{a.code}</span><span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:C.gold}}>{a.due_date}</span></div>)}</Card>}
      <Card><STag label="7-DAY PERFORMANCE SCAN" color={C.purple}/>
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={moods}>
            <defs><linearGradient id="mg3" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.purple} stopOpacity={0.3}/><stop offset="95%" stopColor={C.purple} stopOpacity={0}/></linearGradient><linearGradient id="pg3" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.25}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient></defs>
            <XAxis dataKey="date" tick={{fill:C.textDim,fontSize:9}} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{background:"#0a0a14",border:`1px solid ${C.border}`,borderRadius:0,fontSize:11}}/>
            <Area type="monotone" dataKey="mood" stroke={C.purple} strokeWidth={1.5} fill="url(#mg3)" dot={false} name="MOOD"/>
            <Area type="monotone" dataKey="prod" stroke={C.green}  strokeWidth={1.5} fill="url(#pg3)" dot={false} name="PERFORMANCE"/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function Profile({player,skills,achievements}){
  const rank=getRank(player.level),xpMax=xpForLevel(player.level),pct=Math.min(100,Math.round((player.xp/xpMax)*100)),earned=achievements.filter(a=>a.done).length;
  return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
    <div style={{background:`linear-gradient(145deg,#09090f,${rank.color}0a,#09090f)`,border:`1px solid ${rank.color}44`,padding:"22px 18px",textAlign:"center",position:"relative",overflow:"hidden",clipPath:clip(16)}}><SpeedLines/>
      <div style={{position:"relative",zIndex:1}}>
        <div style={{width:78,height:78,margin:"0 auto 10px",background:`${rank.color}14`,border:`2px solid ${rank.color}66`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:28,color:rank.color,clipPath:clip(10)}}>{player.level}</div>
        <div style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:18,color:C.white,letterSpacing:"0.1em"}}>{player.name}</div>
        <span style={{display:"inline-block",marginTop:6,padding:"3px 14px",fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:9,color:rank.color,border:`1px solid ${rank.color}44`,background:`${rank.color}14`,letterSpacing:"0.14em"}}>{rank.name}</span>
        <div style={{maxWidth:300,margin:"12px auto 0"}}><SpeedBar value={player.xp} max={xpMax} color={rank.color} height={9}/><div style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:C.grey,marginTop:5}}>{player.xp}/{xpMax} XP — {pct}%</div></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginTop:16,paddingTop:14,borderTop:`1px solid ${rank.color}20`}}>
          {[{v:earned,l:"ACHIEVEMENTS"},{v:skills.length,l:"SKILLS"},{v:skills.reduce((s,sk)=>s+sk.level,0),l:"TOTAL LVL"}].map(({v,l})=><div key={l}><div style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:20,color:C.white}}>{v}</div><div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:C.grey,letterSpacing:"0.1em"}}>{l}</div></div>)}
        </div>
      </div>
    </div>
    <Card><STag label="RANK ROAD" color={C.grey}/><div style={{display:"flex",gap:4}}>{RANKS.map(r=><div key={r.name} style={{flex:1,textAlign:"center"}}><div style={{height:4,background:r.color,opacity:player.level>=r.min?1:0.1}}/><div style={{marginTop:5,fontFamily:"'Orbitron',monospace",fontSize:7,fontWeight:700,color:player.level>=r.min?r.color:C.textDim}}>{r.tag}</div><div style={{fontFamily:"'Orbitron',monospace",fontSize:7,color:C.textDim}}>L{r.min}</div></div>)}</div></Card>
    <Card><STag label="SKILL GRID" color={C.orange}/><div style={{display:"flex",flexDirection:"column",gap:11}}>{[...skills].sort((a,b)=>b.level-a.level).map(s=><div key={s.name}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:12,color:C.text,letterSpacing:"0.04em"}}>{s.name}</span><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.grey}}>{s.xp} XP</span><span style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:10,color:s.color,background:`${s.color}14`,padding:"1px 7px",border:`1px solid ${s.color}33`}}>LV.{s.level}</span></div></div><SpeedBar value={s.xp%100} max={100} color={s.color} height={4}/></div>)}</div></Card>
    <Card><STag label={`ACHIEVEMENTS — ${earned}/${achievements.length}`} color={C.gold}/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{achievements.map(a=><div key={a.name} style={{padding:"10px",background:a.done?`${C.orange}08`:C.surface,border:`1px solid ${a.done?C.orange+"2a":C.border}`,clipPath:clip(6),opacity:a.done?1:0.35}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><div style={{width:15,height:15,background:a.done?C.orange:C.greyDim,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,clipPath:clip(4)}}>{a.done?<Check size={8} color="#000"/>:<X size={7} color={C.textDim}/>}</div><span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:800,fontSize:10,color:a.done?C.orange:C.textDim,letterSpacing:"0.06em"}}>{a.name}</span></div><p style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.grey,margin:0}}>{a.desc}</p></div>)}</div></Card>
  </div>);
}

function Tasks({tasks,subjects,courses,onComplete,onAdd,onDelete}){
  const [period,setPeriod]=useState("Daily"),[catF,setCatF]=useState("ALL"),[showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({title:"",category:"Academic",period:"Daily",priority:"Medium",tags:"",subjectId:"",courseId:""});
  const cats=["ALL","Academic","Learning","Project","Health","Personal"];
  const filtered=tasks.filter(t=>t.period===period&&(catF==="ALL"||t.category===catF));
  const pending=filtered.filter(t=>!t.done),done=filtered.filter(t=>t.done);
  const handleAdd=()=>{if(!form.title.trim())return;onAdd({...form,tags:form.tags.split(",").map(s=>s.trim()).filter(Boolean),subjectId:form.subjectId?+form.subjectId:null,courseId:form.courseId?+form.courseId:null});setForm({title:"",category:"Academic",period:"Daily",priority:"Medium",tags:"",subjectId:"",courseId:""});setShowAdd(false);};
  return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{TASK_PERIODS.map(p=><button key={p} onClick={()=>setPeriod(p)} style={{padding:"5px 12px",border:`1px solid ${period===p?C.orange:C.border}`,background:period===p?`${C.orange}18`:"transparent",color:period===p?C.orange:C.grey,fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:8,cursor:"pointer",letterSpacing:"0.1em",clipPath:clip(5)}}>{p.toUpperCase()}</button>)}</div>
    <div style={{display:"flex",flexWrap:"wrap",gap:6,alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{cats.map(c=><button key={c} onClick={()=>setCatF(c)} style={{padding:"3px 10px",border:`1px solid ${catF===c?C.cyan:C.border}`,background:catF===c?`${C.cyan}14`:"transparent",color:catF===c?C.cyan:C.grey,fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:10,cursor:"pointer",clipPath:clip(4)}}>{c}</button>)}</div>
      <Btn onClick={()=>setShowAdd(v=>!v)} bg={C.orange} color="#000" style={{padding:"6px 14px",fontSize:9}}><Plus size={11} style={{display:"inline",marginRight:4}}/>NEW MISSION</Btn>
    </div>
    {showAdd&&<Card glow><STag label="NEW MISSION" color={C.orange}/><div style={{display:"flex",flexDirection:"column",gap:8}}>
      <Inp value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Mission title..."/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Sel value={form.period} onChange={e=>setForm(f=>({...f,period:e.target.value}))}>{TASK_PERIODS.map(p=><option key={p} style={{background:C.surface}}>{p}</option>)}</Sel>
        <Sel value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>{["Low","Medium","High","Critical"].map(p=><option key={p} style={{background:C.surface}}>{p}</option>)}</Sel>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Sel value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{cats.filter(c=>c!=="ALL").map(c=><option key={c} style={{background:C.surface}}>{c}</option>)}</Sel>
        <Sel value={form.subjectId} onChange={e=>setForm(f=>({...f,subjectId:e.target.value,courseId:""}))}>
          <option value="" style={{background:C.surface}}>— Link Subject —</option>
          {subjects.map(s=><option key={s.id} value={s.id} style={{background:C.surface}}>{s.code}: {s.name.slice(0,22)}</option>)}
        </Sel>
      </div>
      <Sel value={form.courseId} onChange={e=>setForm(f=>({...f,courseId:e.target.value,subjectId:""}))}><option value="" style={{background:C.surface}}>— Link Course —</option>{courses.map(c=><option key={c.id} value={c.id} style={{background:C.surface}}>{c.name.slice(0,35)}</option>)}</Sel>
      <Inp value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} placeholder="SKILL TAGS: Python, C, Fitness (comma separated)"/>
      <div style={{display:"flex",gap:8}}><Btn onClick={handleAdd} bg={C.orange} color="#000" style={{flex:1,padding:"9px",fontSize:9}}>ACCEPT (+{PRI_XP[form.priority]} XP)</Btn><Btn onClick={()=>setShowAdd(false)}>ABORT</Btn></div>
    </div></Card>}
    {pending.length>0&&<div><div style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:C.grey,letterSpacing:"0.14em",marginBottom:8}}>ACTIVE — {pending.length}</div><div style={{display:"flex",flexDirection:"column",gap:7}}>{pending.map(t=>{const sub=subjects.find(s=>s.id===t.subject_id),crs=courses.find(c=>c.id===t.course_id);return(<Card key={t.id}><div style={{display:"flex",alignItems:"flex-start",gap:10}}><button onClick={()=>onComplete(t.id)} style={{width:17,height:17,border:`1.5px solid ${C.greyDim}`,background:"transparent",cursor:"pointer",flexShrink:0,marginTop:1,clipPath:clip(4)}}/><div style={{flex:1,minWidth:0}}><div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:13,color:C.text,fontWeight:600}}>{t.title}</div><div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}><span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:C.textDim,letterSpacing:"0.06em"}}>{t.category}·{t.period}</span>{sub&&<span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:C.cyan,background:`${C.cyan}14`,padding:"0 5px"}}>{sub.code}</span>}{crs&&<span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:C.purple,background:`${C.purple}14`,padding:"0 5px"}}>{crs.name.slice(0,18)}</span>}{(t.tags||[]).map(tag=><span key={tag} style={{fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:C.grey,background:C.greyDim,padding:"0 5px"}}>{tag}</span>)}</div></div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}><span style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:9,color:PRI_C[t.priority].c,background:PRI_C[t.priority].bg,padding:"2px 6px",letterSpacing:"0.1em"}}>{PRI_C[t.priority].t}</span><span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:C.orange}}>+{PRI_XP[t.priority]}</span><button onClick={()=>onDelete(t.id)} style={{background:"none",border:"none",cursor:"pointer",padding:0}}><Trash2 size={10} color={C.textDim}/></button></div></div></Card>);})}</div></div>}
    {done.length>0&&<div style={{opacity:0.38}}><div style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:C.grey,letterSpacing:"0.14em",marginBottom:8}}>CLEARED — {done.length}</div><div style={{display:"flex",flexDirection:"column",gap:6}}>{done.map(t=><Card key={t.id} style={{padding:"8px 12px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:14,height:14,background:C.green,display:"flex",alignItems:"center",justifyContent:"center",clipPath:clip(3),flexShrink:0}}><Check size={7} color="#000"/></div><span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:12,color:C.textDim,textDecoration:"line-through"}}>{t.title}</span></div></Card>)}</div></div>}
    {pending.length===0&&done.length===0&&<Card style={{textAlign:"center",padding:"28px"}}><CheckSquare size={24} color={C.textDim} style={{margin:"0 auto 8px"}}/><div style={{fontFamily:"'Orbitron',monospace",fontSize:10,color:C.textDim,letterSpacing:"0.1em"}}>NO MISSIONS IN {period.toUpperCase()}</div></Card>}
  </div>);
}

function Habits({habits,onToggle,onAdd,onDelete}){
  const [showAdd,setShowAdd]=useState(false),[form,setForm]=useState({name:"",xp:15,color:C.cyan,target:"Daily"});
  const done=habits.filter(h=>h.done).length,rate=Math.round((done/Math.max(habits.length,1))*100);
  const COLORS=[C.green,C.cyan,C.orange,C.gold,C.purple,C.red,"#FF69B4"];
  const handleAdd=()=>{if(!form.name.trim())return;onAdd({...form,name:form.name.toUpperCase(),xp:+form.xp});setForm({name:"",xp:15,color:C.cyan,target:"Daily"});setShowAdd(false);};
  return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
    <Card glow><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><STag label="TODAY'S COMPLETION" color={C.green}/><span style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:16,color:C.white,marginTop:-10}}>{done}/{habits.length}</span></div><SpeedBar value={done} max={habits.length} color={C.green} height={11}/><div style={{fontFamily:"'Orbitron',monospace",fontSize:10,color:C.green,marginTop:5}}>{rate}% COMPLETE</div></Card>
    <div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>setShowAdd(v=>!v)} bg={C.orange} color="#000" style={{padding:"6px 14px",fontSize:9}}><Plus size={11} style={{display:"inline",marginRight:4}}/>ADD HABIT</Btn></div>
    {showAdd&&<Card glow><STag label="NEW HABIT" color={C.green}/><div style={{display:"flex",flexDirection:"column",gap:8}}>
      <Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Habit name..."/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Inp type="number" value={form.xp} onChange={e=>setForm(f=>({...f,xp:e.target.value}))} placeholder="XP per day"/>
        <Sel value={form.target} onChange={e=>setForm(f=>({...f,target:e.target.value}))}>{["Daily","Weekdays","Weekends"].map(t=><option key={t} style={{background:C.surface}}>{t}</option>)}</Sel>
      </div>
      <div><div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:C.grey,marginBottom:6,letterSpacing:"0.06em"}}>PICK COLOUR</div><div style={{display:"flex",gap:6}}>{COLORS.map(col=><button key={col} onClick={()=>setForm(f=>({...f,color:col}))} style={{width:24,height:24,background:col,border:`2px solid ${form.color===col?"#fff":col+"44"}`,clipPath:clip(5),cursor:"pointer"}}/>)}</div></div>
      <div style={{display:"flex",gap:8}}><Btn onClick={handleAdd} bg={C.orange} color="#000" style={{flex:1,padding:"9px",fontSize:9}}>CREATE HABIT</Btn><Btn onClick={()=>setShowAdd(false)}>CANCEL</Btn></div>
    </div></Card>}
    <div style={{display:"flex",flexDirection:"column",gap:10}}>{habits.map(h=><Card key={h.id} style={h.done?{borderColor:`${h.color}30`}:{}}><div style={{display:"flex",alignItems:"center",gap:12}}><button onClick={()=>onToggle(h.id)} style={{width:44,height:44,border:`2px solid ${h.done?h.color:h.color+"44"}`,background:h.done?`${h.color}18`:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",clipPath:clip(8),flexShrink:0,transition:"all 0.15s"}}>{h.done?<Check size={17} color={h.color}/>:<Flame size={15} color={`${h.color}55`}/>}</button><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:12,color:h.done?C.textDim:C.white,letterSpacing:"0.06em"}}>{h.name}</span>{h.done&&<span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:C.green,fontWeight:700,letterSpacing:"0.1em"}}>CLEARED</span>}</div><div style={{display:"flex",gap:12,marginTop:3}}><span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:h.color}}>{h.streak}-DAY STREAK</span><span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:C.orange}}>+{h.xp} XP</span></div></div><div style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:28,color:h.color,flexShrink:0}}>{h.streak}</div><button onClick={()=>onDelete(h.id)} style={{background:"none",border:"none",cursor:"pointer",padding:0,marginLeft:4}}><Trash2 size={12} color={C.textDim}/></button></div></Card>)}</div>
  </div>);
}

function CoursesView({courses,token,onProgress,onAdd,onUpdateCourse}){
  const [showAdd,setShowAdd]=useState(false),[form,setForm]=useState({name:"",platform:"",modules:10,hours:10,tags:""});
  const handleAdd=()=>{if(!form.name.trim())return;onAdd({...form,modules:+form.modules,hours:+form.hours,tags:form.tags.split(",").map(s=>s.trim()).filter(Boolean)});setForm({name:"",platform:"",modules:10,hours:10,tags:""});setShowAdd(false);};
  return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
    <div style={{display:"flex",justifyContent:"flex-end"}}><Btn onClick={()=>setShowAdd(v=>!v)} bg={C.orange} color="#000" style={{padding:"6px 14px",fontSize:9}}><Plus size={11} style={{display:"inline",marginRight:4}}/>ADD COURSE</Btn></div>
    {showAdd&&<Card glow><STag label="NEW COURSE" color={C.cyan}/><div style={{display:"flex",flexDirection:"column",gap:8}}>
      <Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Course name..."/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Inp value={form.platform} onChange={e=>setForm(f=>({...f,platform:e.target.value}))} placeholder="Platform (Udemy, Coursera...)"/><Inp type="number" value={form.modules} onChange={e=>setForm(f=>({...f,modules:e.target.value}))} placeholder="Total modules"/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Inp type="number" value={form.hours} onChange={e=>setForm(f=>({...f,hours:e.target.value}))} placeholder="Est. hours"/><Inp value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} placeholder="Tags: Python, C..."/></div>
      <div style={{display:"flex",gap:8}}><Btn onClick={handleAdd} color={C.cyan} style={{flex:1,padding:"9px",fontSize:9}}>CREATE COURSE</Btn><Btn onClick={()=>setShowAdd(false)}>CANCEL</Btn></div>
    </div></Card>}
    {courses.map(c=><CourseCard key={c.id} c={c} token={token} onProgress={onProgress} onUpdateCourse={onUpdateCourse}/>)}
  </div>);
}

function Vitals({moods,onAdd}){
  const [mood,setMood]=useState(7),[prod,setProd]=useState(7),[note,setNote]=useState(""),[flash,setFlash]=useState(false);
  const lbl=v=>v>=9?"PEAK":v>=7?"OPTIMAL":v>=5?"NOMINAL":v>=3?"LOW":"CRITICAL";
  const avg=(moods.reduce((s,m)=>s+m.mood,0)/Math.max(moods.length,1)).toFixed(1);
  const avgP=(moods.reduce((s,m)=>s+m.prod,0)/Math.max(moods.length,1)).toFixed(1);
  const submit=()=>{onAdd({mood,prod,note});setFlash(true);setNote("");setTimeout(()=>setFlash(false),2000);};
  return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
    <Card glow><STag label="VITAL SCAN" color={C.purple}/><div style={{display:"flex",flexDirection:"column",gap:14}}>
      {[{l:"MOOD LEVEL",v:mood,s:setMood,c:C.purple,d:lbl(mood)},{l:"PERFORMANCE",v:prod,s:setProd,c:C.green,d:`${prod}/10`}].map(({l,v,s,c,d})=><div key={l}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:C.grey,letterSpacing:"0.1em"}}>{l}</span><span style={{fontFamily:"'Orbitron',monospace",fontSize:10,color:c,fontWeight:700}}>{v}/10 — {d}</span></div><input type="range" min={1} max={10} value={v} onChange={e=>s(+e.target.value)} style={{width:"100%",accentColor:c}}/></div>)}
      <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="SITUATION NOTES (optional)..." rows={2} style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,fontFamily:"'Rajdhani',sans-serif",fontSize:12,padding:"8px 10px",width:"100%",outline:"none",resize:"none",boxSizing:"border-box"}}/>
      <button onClick={submit} style={{padding:"10px",width:"100%",cursor:"pointer",background:flash?`${C.green}20`:`${C.purple}20`,color:flash?C.green:C.purple,border:`1px solid ${flash?C.green:C.purple}55`,fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:10,letterSpacing:"0.12em",clipPath:clip(6),transition:"all 0.2s"}}>{flash?"VITALS RECORDED":"SUBMIT SCAN"}</button>
    </div></Card>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[{l:"AVG MOOD",v:avg,c:C.purple},{l:"AVG OUTPUT",v:avgP,c:C.green}].map(({l,v,c})=><Card key={l} style={{textAlign:"center"}}><div style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:28,color:c}}>{v}</div><div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:C.grey,letterSpacing:"0.1em"}}>{l} (7D)</div></Card>)}</div>
    <Card><STag label="MOOD HISTORY" color={C.purple}/>{[...moods].reverse().slice(0,7).map((m,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 8px",background:C.surface,clipPath:clip(5),marginBottom:5}}><span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:C.textMid,width:36}}>{m.date}</span><div style={{flex:1}}><div style={{display:"flex",gap:4,alignItems:"center",marginBottom:3}}><span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:C.grey,width:32}}>MOOD</span><div style={{flex:1,height:4,background:C.greyDim}}><div style={{height:"100%",width:`${m.mood*10}%`,background:C.purple}}/></div><span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:C.purple,width:14,textAlign:"right"}}>{m.mood}</span></div><div style={{display:"flex",gap:4,alignItems:"center"}}><span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:C.grey,width:32}}>PROD</span><div style={{flex:1,height:4,background:C.greyDim}}><div style={{height:"100%",width:`${m.prod*10}%`,background:C.green}}/></div><span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:C.green,width:14,textAlign:"right"}}>{m.prod}</span></div></div></div>)}</Card>
  </div>);
}

function SleepLog({sleepLog,onAdd}){
  const [form,setForm]=useState({bedtime:"22:30",wake:"06:30",quality:4}),[flash,setFlash]=useState(false);
  const calcDur=(b,w)=>{if(!b||!w)return 0;const[bh,bm]=b.split(":").map(Number),[wh,wm]=w.split(":").map(Number);let m=(wh*60+wm)-(bh*60+bm);if(m<0)m+=24*60;return m;};
  const dur=calcDur(form.bedtime,form.wake),avg=sleepLog.length>0?Math.round(sleepLog.reduce((s,l)=>s+l.duration,0)/sleepLog.length):0;
  const avgQ=sleepLog.length>0?(sleepLog.reduce((s,l)=>s+l.quality,0)/sleepLog.length).toFixed(1):"—";
  const qC=q=>q>=4?C.green:q>=3?C.orange:C.red;
  const submit=()=>{if(!dur)return;onAdd({date:todayStr(),bedtime:form.bedtime,wake:form.wake,duration:dur,quality:form.quality});setFlash(true);setTimeout(()=>setFlash(false),2000);};
  return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
    <Card glow><STag label="LOG SLEEP SESSION" color={C.cyan}/><div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><div><div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.grey,marginBottom:5,letterSpacing:"0.08em"}}>BEDTIME</div><Inp type="time" value={form.bedtime} onChange={e=>setForm(f=>({...f,bedtime:e.target.value}))}/></div><div><div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.grey,marginBottom:5,letterSpacing:"0.08em"}}>WAKE TIME</div><Inp type="time" value={form.wake} onChange={e=>setForm(f=>({...f,wake:e.target.value}))}/></div></div>
      {dur>0&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.surface,clipPath:clip(5)}}><Moon size={14} color={C.cyan}/><span style={{fontFamily:"'Orbitron',monospace",fontSize:13,color:C.cyan,fontWeight:700}}>{fmtMin(dur)}</span><span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:dur>=480?C.green:dur>=360?C.orange:C.red}}>{dur>=480?"EXCELLENT":dur>=420?"GOOD":dur>=360?"FAIR":"POOR"} SLEEP</span></div>}
      <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:C.grey,letterSpacing:"0.1em"}}>SLEEP QUALITY</span><span style={{fontFamily:"'Orbitron',monospace",fontSize:10,color:qC(form.quality),fontWeight:700}}>{["","POOR","BAD","OKAY","GOOD","EXCELLENT"][form.quality]} ({form.quality}/5)</span></div><input type="range" min={1} max={5} value={form.quality} onChange={e=>setForm(f=>({...f,quality:+e.target.value}))} style={{width:"100%",accentColor:qC(form.quality)}}/></div>
      <button onClick={submit} style={{padding:"10px",width:"100%",cursor:"pointer",background:flash?`${C.green}20`:`${C.cyan}14`,color:flash?C.green:C.cyan,border:`1px solid ${flash?C.green:C.cyan}55`,clipPath:clip(6),fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:10,letterSpacing:"0.12em",transition:"all 0.2s"}}>{flash?"SLEEP LOGGED! (+10 XP)":"LOG SLEEP SESSION (+10 XP)"}</button>
    </div></Card>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>{[{l:"AVG SLEEP",v:fmtMin(avg),c:C.cyan},{l:"AVG QUALITY",v:`${avgQ}/5`,c:qC(+avgQ||0)},{l:"LAST NIGHT",v:sleepLog.length>0?fmtMin(sleepLog[sleepLog.length-1].duration):"—",c:C.white}].map(({l,v,c})=><Card key={l} style={{textAlign:"center",padding:"10px 6px"}}><div style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:14,color:c}}>{v}</div><div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:C.grey,marginTop:2,letterSpacing:"0.1em"}}>{l}</div></Card>)}</div>
    <Card><STag label="SLEEP HISTORY" color={C.cyan}/>{[...sleepLog].reverse().slice(0,7).map((l,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:C.surface,clipPath:clip(5),marginBottom:5}}><Moon size={11} color={C.cyan}/><span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:C.textMid,width:38}}>{l.date}</span><span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.grey,flex:1}}>{l.bedtime} → {l.wake}</span><span style={{fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:700,color:l.duration>=480?C.green:l.duration>=360?C.orange:C.red}}>{fmtMin(l.duration)}</span><div style={{display:"flex",gap:2}}>{[1,2,3,4,5].map(star=><div key={star} style={{width:6,height:6,background:star<=l.quality?C.gold:C.greyDim,clipPath:clip(2)}}/>)}</div></div>)}</Card>
  </div>);
}

function ScreenTimeView({screenTime,screenLimits,onLogToday,onUpdateLimits}){
  const CATS=[{key:"social",label:"SOCIAL MEDIA",color:C.orange},{key:"gaming",label:"GAMING",color:C.red},{key:"study",label:"STUDY",color:C.green},{key:"entertain",label:"ENTERTAINMENT",color:C.purple},{key:"other",label:"OTHER",color:C.grey}];
  const todayData=screenTime[screenTime.length-1]||{social:0,gaming:0,study:0,entertain:0,other:0};
  const [form,setForm]=useState({...todayData}),[limForm,setLimForm]=useState({...screenLimits}),[editLim,setEditLim]=useState(false),[flash,setFlash]=useState(false);
  const totalForm=Object.values(form).reduce((a,b)=>a+(+b),0),totalLimit=Object.values(screenLimits).reduce((a,b)=>a+b,0);
  const submit=()=>{onLogToday({social:+form.social,gaming:+form.gaming,study:+form.study,entertain:+form.entertain,other:+form.other});setFlash(true);setTimeout(()=>setFlash(false),2000);};
  const weeklyData=screenTime.slice(-7).map(d=>({date:d.date,Social:d.social,Gaming:d.gaming,Study:d.study,Ent:d.entertain,Other:d.other}));
  return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
    <Card glow={Object.entries(screenLimits).some(([k,lim])=>(todayData[k]||0)>lim)}><STag label="LOG TODAY'S SCREEN TIME (minutes)" color={C.orange}/><div style={{display:"flex",flexDirection:"column",gap:10}}>
      {CATS.map(({key,label,color})=>{const val=+form[key],lim=screenLimits[key],over=val>lim;return(<div key={key}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:12,color:over?C.red:C.text,letterSpacing:"0.04em",flex:1}}>{label}</span>{over&&<span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:C.red,fontWeight:700,letterSpacing:"0.06em"}}>⚠ OVER LIMIT</span>}<input type="number" min={0} max={720} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} style={{background:C.surface,border:`1px solid ${over?C.red:C.border}`,color:C.text,fontFamily:"'Orbitron',monospace",fontSize:11,padding:"4px 8px",width:64,outline:"none",textAlign:"right"}}/><span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.grey,width:20}}>min</span></div><div style={{height:5,background:C.greyDim,position:"relative"}}><div style={{position:"absolute",left:`${Math.min(100,(lim/720)*100)}%`,top:-2,width:2,height:9,background:color,zIndex:1}}/><div style={{height:"100%",width:`${Math.min(100,(val/720)*100)}%`,background:over?C.red:color,transition:"width 0.4s"}}/></div><div style={{display:"flex",justifyContent:"space-between",marginTop:2}}><span style={{fontFamily:"'Orbitron',monospace",fontSize:8,color:over?C.red:color}}>{fmtMin(val)}</span><span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:8,color:C.textDim}}>LIMIT: {fmtMin(lim)}</span></div></div>);})}
      <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:`1px solid ${C.border}`}}><span style={{fontFamily:"'Orbitron',monospace",fontSize:10,color:C.textMid,letterSpacing:"0.08em"}}>TOTAL TODAY</span><span style={{fontFamily:"'Orbitron',monospace",fontSize:14,fontWeight:700,color:totalForm>totalLimit?C.red:C.white}}>{fmtMin(totalForm)}</span></div>
      <button onClick={submit} style={{padding:"9px",width:"100%",cursor:"pointer",background:flash?`${C.green}20`:`${C.orange}18`,color:flash?C.green:C.orange,border:`1px solid ${flash?C.green:C.orange}44`,clipPath:clip(6),fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:10,letterSpacing:"0.12em",transition:"all 0.2s"}}>{flash?"USAGE LOGGED!":"SAVE TODAY'S USAGE"}</button>
    </div></Card>
    <Card><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}><STag label="DAILY LIMITS" color={C.gold}/><Btn onClick={()=>setEditLim(v=>!v)} color={C.gold} style={{marginTop:-8,padding:"4px 10px",fontSize:8}}>{editLim?"CLOSE":"EDIT LIMITS"}</Btn></div>
      {editLim?(<div style={{display:"flex",flexDirection:"column",gap:8}}>{CATS.map(({key,label,color})=><div key={key} style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:C.text,flex:1,letterSpacing:"0.04em"}}>{label}</span><input type="number" min={0} max={720} value={limForm[key]} onChange={e=>setLimForm(f=>({...f,[key]:+e.target.value}))} style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,fontFamily:"'Orbitron',monospace",fontSize:11,padding:"4px 8px",width:64,outline:"none",textAlign:"right"}}/><span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:C.grey,width:20}}>min</span></div>)}<Btn onClick={()=>{onUpdateLimits(limForm);setEditLim(false);}} bg={C.orange} color="#000" style={{padding:"8px",fontSize:9}}>SAVE LIMITS</Btn></div>)
      :(<div style={{display:"flex",flexDirection:"column",gap:5}}>{CATS.map(({key,label,color})=><div key={key} style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:6,height:6,background:color,clipPath:clip(2),flexShrink:0}}/><span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:C.textMid,flex:1}}>{label}</span><span style={{fontFamily:"'Orbitron',monospace",fontSize:10,color:color}}>{fmtMin(screenLimits[key])}</span></div>)}</div>)}
    </Card>
    <Card><STag label="WEEKLY USAGE TREND" color={C.orange}/>
      <ResponsiveContainer width="100%" height={160}><BarChart data={weeklyData}><XAxis dataKey="date" tick={{fill:C.textDim,fontSize:9}} axisLine={false} tickLine={false}/><YAxis tick={{fill:C.textDim,fontSize:9}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:"#0a0a14",border:`1px solid ${C.border}`,borderRadius:0,fontSize:11}} formatter={v=>[`${v}min`]}/><Bar dataKey="Social" fill={C.orange} stackId="a"/><Bar dataKey="Gaming" fill={C.red} stackId="a"/><Bar dataKey="Study" fill={C.green} stackId="a"/><Bar dataKey="Ent" fill={C.purple} stackId="a"/><Bar dataKey="Other" fill={C.grey} stackId="a" radius={[2,2,0,0]}/></BarChart></ResponsiveContainer>
      <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:6}}>{[[C.orange,"SOCIAL"],[C.red,"GAMING"],[C.green,"STUDY"],[C.purple,"ENTERTAIN"],[C.grey,"OTHER"]].map(([c,l])=><div key={l} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,background:c}}/><span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:C.grey,letterSpacing:"0.06em"}}>{l}</span></div>)}</div>
    </Card>
  </div>);
}

function Analytics({tasks,habits,skills,xpHistory,moods,sleepLog,screenTime,screenLimits}){
  const rate=Math.round((tasks.filter(t=>t.done).length/Math.max(tasks.length,1))*100);
  const totS=habits.reduce((s,h)=>s+h.streak,0),avgSl=sleepLog.length>0?Math.round(sleepLog.reduce((s,l)=>s+l.duration,0)/sleepLog.length):0;
  const cats=["Academic","Learning","Project","Health","Personal"].map(c=>({cat:c,total:tasks.filter(t=>t.category===c).length,done:tasks.filter(t=>t.category===c&&t.done).length})).filter(d=>d.total>0);
  return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>{[{l:"MISSION RATE",v:`${rate}%`,c:C.green},{l:"TOTAL STREAKS",v:totS,c:C.gold},{l:"AVG SLEEP",v:fmtMin(avgSl),c:C.cyan}].map(({l,v,c})=><Card key={l} style={{textAlign:"center",padding:"12px 6px"}}><div style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:18,color:c}}>{v}</div><div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:C.grey,letterSpacing:"0.1em",marginTop:3}}>{l}</div></Card>)}</div>
    <Card><STag label="WEEKLY XP EARNED" color={C.orange}/>
      <ResponsiveContainer width="100%" height={120}><BarChart data={xpHistory}><XAxis dataKey="week" tick={{fill:C.textDim,fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:C.textDim,fontSize:10}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:"#0a0a14",border:`1px solid ${C.border}`,borderRadius:0,fontSize:11}}/><Bar dataKey="xp" fill={C.orange} name="XP"/></BarChart></ResponsiveContainer>
    </Card>
    <Card><STag label="MISSION COMPLETION BY SECTOR" color={C.cyan}/>{cats.map(d=><div key={d.cat} style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:C.textMid,letterSpacing:"0.06em"}}>{d.cat.toUpperCase()}</span><span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:C.grey}}>{d.done}/{d.total}</span></div><SpeedBar value={d.done} max={d.total} color={C.cyan} height={4}/></div>)}</Card>
    <Card><STag label="SKILL PROGRESSION" color={C.gold}/>{[...skills].sort((a,b)=>b.level-a.level).map(s=><div key={s.name} style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}><span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:C.textMid,width:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flexShrink:0}}>{s.name}</span><div style={{flex:1}}><SpeedBar value={s.level} max={10} color={s.color} height={4}/></div><span style={{fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:10,color:s.color,width:34,textAlign:"right",flexShrink:0}}>LV.{s.level}</span></div>)}</Card>
    <Card><STag label="SLEEP vs MOOD CORRELATION" color={C.purple}/>
      <ResponsiveContainer width="100%" height={130}><LineChart data={sleepLog.map((l,i)=>({date:l.date,sleep:+(l.duration/60).toFixed(1),mood:moods[i]?.mood||5}))}><CartesianGrid strokeDasharray="2 4" stroke={`${C.greyDim}44`}/><XAxis dataKey="date" tick={{fill:C.textDim,fontSize:9}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:"#0a0a14",border:`1px solid ${C.border}`,borderRadius:0,fontSize:11}}/><Line type="monotone" dataKey="sleep" stroke={C.cyan} strokeWidth={2} dot={false} name="Sleep (h)"/><Line type="monotone" dataKey="mood" stroke={C.purple} strokeWidth={2} dot={false} name="Mood"/></LineChart></ResponsiveContainer>
    </Card>
  </div>);
}

// ═══════════════════════════════════════════════════════════
//  ROOT APP — Auth Gate
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [token,  setToken]  = useState(() => localStorage.getItem(TOKEN_KEY));
  const [pname,  setPname]  = useState("");

  const handleAuth = (tok, name) => {
    localStorage.setItem(TOKEN_KEY, tok);
    setToken(tok);
    setPname(name);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setPname("");
  };

  if (!token) return <LoginGate onAuth={handleAuth}/>;
  return <LifeOS token={token} playerName={pname} onLogout={handleLogout}/>;
}
