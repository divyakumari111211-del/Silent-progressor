const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const KEY = "silent-progressor-v1";
const today = () => new Date().toISOString().slice(0,10);
const uid = () => Math.random().toString(36).slice(2,10);
const initial = () => ({
  tasks: [], workouts: [], notes: [], messages: [],
  settings: { aiEnabled: true },
  study: { subject: "Maths", topic: "", minutes: 25, sessions: 0 },
  fitness: { water: 0, streak: 0 }
});
let data;
try { data = {...initial(), ...JSON.parse(localStorage.getItem(KEY) || "{}")}; }
catch { data = initial(); }
data.tasks ||= []; data.workouts ||= []; data.notes ||= []; data.messages ||= [];
data.study ||= initial().study; data.fitness ||= initial().fitness;
let page = "home", deferredInstall = null, recognizing = false, recognition = null;
const titles = {home:"Dashboard",chat:"AI Chat",study:"Study",fitness:"Fitness",tasks:"Tasks","files":"Files & Notes",web:"Web Search"};
function save(){ localStorage.setItem(KEY, JSON.stringify(data)); }
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.remove("hidden");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.add("hidden"),2800);}
function dateLabel(){return new Intl.DateTimeFormat(undefined,{weekday:"short",month:"short",day:"numeric"}).format(new Date());}
function go(p){page=p;$("#pageTitle").textContent=titles[p]||"Dashboard";$$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===p));$(".sidebar").classList.remove("open");render();}
$("#todayLabel").textContent=dateLabel();
$("#nav").addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b)go(b.dataset.page);});
$("#menuBtn").onclick=()=>$(".sidebar").classList.toggle("open");
function card(title,body,extra=""){return `<section class="card ${extra}"><h3>${title}</h3>${body}</section>`;}
function taskMarkup(t){return `<div class="task ${t.done?"done":""}"><input type="checkbox" data-task-check="${t.id}" ${t.done?"checked":""}><div class="task-text">${esc(t.text)}<div class="meta">${t.due?esc(t.due):"No due date"}</div></div><button class="icon-btn" data-task-delete="${t.id}" aria-label="Delete task">×</button></div>`;}
function renderHome(){
 const done=data.tasks.filter(t=>t.done).length, active=data.tasks.filter(t=>!t.done).length;
 const workouts=data.workouts.filter(w=>w.date===today()).length;
 const sessions=data.study.sessions||0;
 return `<div class="hero"><div class="eyebrow">SMALL STEPS. CONSISTENT WINS.</div><h2>Build your future,<br><span class="accent">one day at a time.</span></h2><p>Welcome to SILENT PROGRESSOR — your personal space for learning, fitness, ideas and focused progress.</p><div class="actions"><button class="btn" data-go="chat">✦ Talk to your AI</button><button class="btn secondary" data-go="tasks">+ Add a task</button></div></div>
 <div class="grid stats">
 ${stat("Open tasks",active,"Keep the next step clear")}${stat("Tasks completed",done,"Your progress adds up")}${stat("Study sessions",sessions,"Sessions logged")}${stat("Today's workouts",workouts,"Workout entries today")}
 </div>
 <div class="section-head"><h2>Quick access</h2><span class="tag">YOUR WORKSPACE</span></div>
 <div class="quick-grid">
 <button class="quick" data-go="chat"><span class="glyph">✦</span><b>AI Chat</b><small>Ask, learn, brainstorm</small></button>
 <button class="quick" data-go="study"><span class="glyph">▤</span><b>Study mode</b><small>Focus timer & topic notes</small></button>
 <button class="quick" data-go="fitness"><span class="glyph">◈</span><b>Fitness log</b><small>Record sets and activity</small></button>
 <button class="quick" data-go="files"><span class="glyph">▧</span><b>Files & notes</b><small>Save notes or import a file</small></button>
 </div>
 <div class="grid two">
 ${card("Next actions",`<div class="task-list">${data.tasks.filter(t=>!t.done).slice(0,4).map(taskMarkup).join("")||'<div class="empty">No open tasks. Add one small goal for today.</div>'}</div><div class="actions"><button class="btn secondary" data-go="tasks">Manage tasks</button></div>`)}
 ${card("Daily intention",`<p class="small">What matters most today?</p><textarea id="intention" class="field" rows="3" placeholder="Example: Understand one maths concept...">${esc(localStorage.getItem("sp-intention-"+today())||"")}</textarea><div class="actions"><button class="btn secondary" id="saveIntention">Save intention</button></div>`)}
 </div>`;
}
function stat(label,value,note){return `<section class="card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></section>`;}
function renderChat(){
 const messages=data.messages.map(m=>`<div class="bubble ${m.role==="user"?"user":"assistant"}"><span class="who">${m.role==="user"?"YOU":"SILENT PROGRESSOR"}</span>${esc(m.content)}</div>`).join("");
 return `<section class="card"><div class="pill-row"><span class="tag">CHAT</span><span class="tag">TEXT + VOICE</span><span class="tag">${location.protocol==="https:"||location.hostname==="localhost"?"Voice may be available":"Voice needs HTTPS or localhost"}</span></div><p class="small">When the AI backend is configured, this page sends your message to it. Without an API key, a small local helper answers common prompts and can still save your chat on this device.</p><div class="chat-wrap"><div id="chatLog" class="chat-log">${messages||'<div class="bubble assistant"><span class="who">SILENT PROGRESSOR</span>Hi! I am ready. Ask me about study, fitness, tasks, or anything you are curious about.</div>'}</div><div class="chat-compose"><textarea id="chatInput" class="field" placeholder="Type a message… (Enter to send, Shift+Enter for a new line)"></textarea><button id="micBtn" class="icon-btn" title="Speak your message" aria-label="Voice input">🎙</button><button id="sendBtn" class="btn">Send</button></div><div class="actions"><button id="speakLast" class="btn ghost">🔊 Read latest reply</button><button id="clearChat" class="btn ghost">Clear chat</button></div></div></section>`;
}
function renderStudy(){
 const s=data.study, pct=Math.min(100,Math.round((s.minutes||25)/60*100));
 return `<div class="grid two">
 ${card("Focus session",`<p class="small">Pick a subject and topic. This starter tracks sessions; use your phone clock for the actual focus timer.</p><div class="form-stack"><label class="small">Subject<select id="studySubject" class="field"><option ${s.subject==="Maths"?"selected":""}>Maths</option><option ${s.subject==="Science"?"selected":""}>Science</option><option ${s.subject==="Social Science"?"selected":""}>Social Science</option><option ${s.subject==="English"?"selected":""}>English</option><option ${s.subject==="Hindi"?"selected":""}>Hindi</option><option>Other</option></select></label><label class="small">Topic<input id="studyTopic" class="field" value="${esc(s.topic)}" placeholder="e.g. Motion — equations"></label><label class="small">Focus minutes<input id="studyMinutes" class="field" type="number" min="5" max="120" value="${Number(s.minutes)||25}"></label><button class="btn" id="saveStudy">Save study plan</button><button class="btn secondary" id="logStudy">✓ Log completed session</button></div>`)}
 ${card("Study stats",`<div class="stat-label">Sessions completed</div><div class="stat-value">${s.sessions||0}</div><div class="progress"><span style="width:${Math.min(100,(s.sessions||0)*10)}%"></span></div><p class="small">Try one focused session, then take a short break. Understanding matters more than rushing.</p><div class="divider"></div><div class="stat-label">Current focus</div><p>${esc(s.subject||"Not set")}: ${esc(s.topic||"Add a topic")}</p>`)}
 </div>
 ${card("Quick study note",`<form id="studyNoteForm" class="form-stack"><input id="studyNoteTitle" class="field" placeholder="Note title" required><textarea id="studyNoteBody" class="field" placeholder="Write a definition, formula, or question…" required></textarea><button class="btn">Save note</button></form>`,"")}`;
}
function renderFitness(){
 const todays=data.workouts.filter(w=>w.date===today());
 return `<div class="grid two">
 ${card("Log a workout",`<form id="workoutForm" class="form-stack"><label class="small">Exercise<input class="field" id="exercise" placeholder="e.g. Push-ups" required></label><div class="form-row"><label class="small" style="flex:1">Sets<input class="field" id="sets" type="number" min="1" max="50" value="3" required></label><label class="small" style="flex:1">Reps / seconds<input class="field" id="reps" type="number" min="1" max="1000" value="10" required></label></div><label class="small">Notes (optional)<input class="field" id="workoutNotes" placeholder="Form, difficulty, etc."></label><button class="btn">Save workout</button></form>`)}
 ${card("Today",`<div class="stat-value">${todays.length}</div><div class="stat-note">workout entries logged</div><div class="divider"></div><p class="small">Warm up first, use controlled form, rest when needed, and stop if you feel pain or dizziness. Progress gradually.</p>`)}
 </div>
 ${card("Workout history",`<div class="task-list">${data.workouts.slice().reverse().slice(0,20).map(w=>`<div class="task"><div class="task-text"><b>${esc(w.exercise)}</b><div class="meta">${w.sets} sets × ${w.reps} reps/sec · ${esc(w.date)} ${w.notes?"· "+esc(w.notes):""}</div></div><button class="icon-btn" data-workout-delete="${w.id}">×</button></div>`).join("")||'<div class="empty">No workouts logged yet.</div>'}</div>`)}
 `;
}
function renderTasks(){
 return `<div class="grid two">${card("Create a task",`<form id="taskForm" class="form-stack"><input id="taskText" class="field" placeholder="What do you want to do?" required maxlength="180"><label class="small">Due date (optional)<input id="taskDue" type="date" class="field" min="${today()}"></label><button class="btn">+ Add task</button></form><p class="small">Tasks are saved on this device. Browser notifications are not enabled in this starter.</p>`)}
 ${card("Progress",`<div class="stat-value">${data.tasks.filter(t=>t.done).length}/${data.tasks.length}</div><div class="progress"><span style="width:${data.tasks.length?data.tasks.filter(t=>t.done).length/data.tasks.length*100:0}%"></span></div><p class="small">Done is better than perfect. Pick one next action.</p>`)}
 </div>
 ${card("All tasks",`<div class="task-list">${data.tasks.slice().sort((a,b)=>Number(a.done)-Number(b.done)).map(taskMarkup).join("")||'<div class="empty">No tasks yet. Add your first one above.</div>'}</div><div class="actions"><button id="clearDone" class="btn ghost">Remove completed tasks</button></div>`)}
 `;
}
function renderFiles(){
 return `<div class="grid two">
 ${card("Save a note",`<form id="noteForm" class="form-stack"><input id="noteTitle" class="field" placeholder="Note title" required maxlength="120"><textarea id="noteBody" class="field" placeholder="Write your notes here…" required></textarea><button class="btn">Save note</button></form>`)}
 ${card("Import a text file",`<p class="small">Choose a TXT, Markdown, or other readable text file. The text is stored locally as a note. This starter does not upload files to an AI service.</p><input id="fileInput" type="file" class="field" accept=".txt,.md,.csv,.json,.html,.log,text/*"><p class="small">For PDFs, DOCX, and images, add a document parser or upload integration in a later version.</p><div class="divider"></div><button class="btn secondary" id="exportData">Export all app data (JSON)</button><button class="btn ghost" id="importData">Import app backup (JSON)</button><input id="backupInput" type="file" accept=".json,application/json" class="hidden">`)}
 </div>
 ${card("Saved notes",`${data.notes.map(n=>`<article class="note-item"><h4>${esc(n.title)}</h4><div class="meta">${esc(n.date||"")}</div><p>${esc(n.body)}</p><div class="note-actions"><button class="btn ghost" data-note-export="${n.id}">Export note</button><button class="btn danger" data-note-delete="${n.id}">Delete</button></div></article>`).join("")||'<div class="empty">No saved notes yet.</div>'}`)}
 `;
}
function renderWeb(){
 return `${card("Search the web",`<p class="small">This opens a search in your browser. It does not automatically read or summarize web pages yet. Live search inside the AI chat requires a search API or a server-side web-search integration.</p><form id="webForm" class="form-row"><input id="webQuery" class="field" placeholder="Search for a topic…" required><button class="btn">Search</button></form><div class="actions"><button class="btn secondary" data-search="Class 9 NCERT study resources">Class 9 study resources</button><button class="btn secondary" data-search="beginner bodyweight workout safety">Beginner workout tips</button></div>`)}
 ${card("Privacy reminder",`<p class="small">Use trusted sources and avoid entering passwords, private account details, or sensitive personal information into searches or AI prompts.</p>`)}
 `;
}
function render(){
 const target=$("#page");
 const renderers={home:renderHome,chat:renderChat,study:renderStudy,fitness:renderFitness,tasks:renderTasks,files:renderFiles,web:renderWeb};
 target.innerHTML=(renderers[page]||renderHome)();
 bindPage();
 if(page==="chat") $("#chatLog").scrollTop=$("#chatLog").scrollHeight;
}
function bindPage(){
 $$("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
 $("#saveIntention")?.addEventListener("click",()=>{localStorage.setItem("sp-intention-"+today(),$("#intention").value);toast("Daily intention saved.");});
 $$("[data-task-check]").forEach(el=>el.onchange=()=>{const t=data.tasks.find(x=>x.id===el.dataset.taskCheck);if(t)t.done=el.checked;save();render();});
 $$("[data-task-delete]").forEach(el=>el.onclick=()=>{data.tasks=data.tasks.filter(t=>t.id!==el.dataset.taskDelete);save();render();});
 $("#taskForm")?.addEventListener("submit",e=>{e.preventDefault();data.tasks.push({id:uid(),text:$("#taskText").value.trim(),due:$("#taskDue").value,done:false,created:today()});save();render();toast("Task added.");});
 $("#clearDone")?.addEventListener("click",()=>{data.tasks=data.tasks.filter(t=>!t.done);save();render();toast("Completed tasks removed.");});
 $("#saveStudy")?.addEventListener("click",()=>{data.study.subject=$("#studySubject").value;data.study.topic=$("#studyTopic").value;data.study.minutes=Math.max(5,Math.min(120,Number($("#studyMinutes").value)||25));save();render();toast("Study plan saved.");});
 $("#logStudy")?.addEventListener("click",()=>{data.study.subject=$("#studySubject").value;data.study.topic=$("#studyTopic").value;data.study.sessions=(data.study.sessions||0)+1;save();render();toast("Study session logged.");});
 $("#studyNoteForm")?.addEventListener("submit",e=>{e.preventDefault();data.notes.unshift({id:uid(),title:$("#studyNoteTitle").value.trim(),body:$("#studyNoteBody").value.trim(),date:today()});save();go("files");toast("Study note saved.");});
 $("#noteForm")?.addEventListener("submit",e=>{e.preventDefault();data.notes.unshift({id:uid(),title:$("#noteTitle").value.trim(),body:$("#noteBody").value.trim(),date:today()});save();render();toast("Note saved.");});
 $("#workoutForm")?.addEventListener("submit",e=>{e.preventDefault();data.workouts.push({id:uid(),exercise:$("#exercise").value.trim(),sets:Math.max(1,Number($("#sets").value)||1),reps:Math.max(1,Number($("#reps").value)||1),notes:$("#workoutNotes").value.trim(),date:today()});save();render();toast("Workout saved.");});
 $$("[data-workout-delete]").forEach(b=>b.onclick=()=>{data.workouts=data.workouts.filter(w=>w.id!==b.dataset.workoutDelete);save();render();});
 $$("[data-note-delete]").forEach(b=>b.onclick=()=>{data.notes=data.notes.filter(n=>n.id!==b.dataset.noteDelete);save();render();toast("Note deleted.");});
 $$("[data-note-export]").forEach(b=>b.onclick=()=>{const n=data.notes.find(x=>x.id===b.dataset.noteExport);if(n)download(`${n.title||"note"}.txt`,n.body,"text/plain");});
 $("#fileInput")?.addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{const body=await f.text();data.notes.unshift({id:uid(),title:f.name,body,date:today()});save();render();toast("Text file imported as a note.");}catch{toast("Could not read that file.");}});
 $("#exportData")?.addEventListener("click",()=>download("silent-progressor-backup.json",JSON.stringify(data,null,2),"application/json"));
 $("#importData")?.addEventListener("click",()=>$("#backupInput").click());
 $("#backupInput")?.addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{const v=JSON.parse(await f.text());if(!v||typeof v!=="object"||!Array.isArray(v.tasks)||!Array.isArray(v.notes))throw Error();if(!confirm("Importing will replace the current app data in this browser. Continue?"))return;data={...initial(),...v};save();render();toast("Backup imported.");}catch{toast("Invalid backup file.");}});
 $("#webForm")?.addEventListener("submit",e=>{e.preventDefault();const q=$("#webQuery").value.trim();if(q)window.open("https://www.google.com/search?q="+encodeURIComponent(q),"_blank","noopener,noreferrer");});
 $$("[data-search]").forEach(b=>b.onclick=()=>window.open("https://www.google.com/search?q="+encodeURIComponent(b.dataset.search),"_blank","noopener,noreferrer"));
 $("#sendBtn")?.addEventListener("click",sendChat);
 $("#chatInput")?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat();}});
 $("#micBtn")?.addEventListener("click",toggleRecognition);
 $("#speakLast")?.addEventListener("click",()=>{const last=[...data.messages].reverse().find(m=>m.role==="assistant");if(last)speak(last.content);else toast("No AI reply to read yet.");});
 $("#clearChat")?.addEventListener("click",()=>{if(confirm("Clear saved chat history?")){data.messages=[];save();render();}});
}
function download(filename,content,type){const a=document.createElement("a"),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function localReply(message){
 const m=message.toLowerCase();
 if(/hello|hi\b|hey|namaste/.test(m))return "Hello! I’m SILENT PROGRESSOR. Tell me what you want to learn or work on today.";
 if(/study|homework|math|science|class 9|revision|ncert/.test(m))return "Study plan: 1) Choose one small topic. 2) Learn the concept for 20–25 minutes. 3) Close your notes and explain it in your own words. 4) Solve 3–5 questions. Tell me the exact topic and I’ll help you plan it. For full AI explanations, connect the optional AI backend.";
 if(/workout|fitness|push.?up|handstand|exercise/.test(m))return "Fitness reminder: warm up first, practise controlled form, and increase difficulty gradually. A simple bodyweight session can include comfortable push-ups, squats, a plank, and mobility work. Rest if you feel pain or dizziness. Tell me your goal and equipment for a tailored routine.";
 if(/task|todo|remind|plan my day/.test(m))return "Open Tasks to add your to-dos. For reminders that fire while the app is closed, you’ll need a notification service and a backend or native Android integration.";
 if(/web|search|internet/.test(m))return "Open Web Search to search in your browser. Automatic search-and-summary inside chat needs a web-search API or server-side integration.";
 if(/file|pdf|document|note/.test(m))return "Open Files & Notes to save notes or import readable text files. PDF/DOCX parsing and asking questions about documents need an added parser or document service.";
 return "I’m currently in local demo mode, so my answers are limited. Add an AI API key to the server’s .env file to enable full AI chat. You can still use Study, Fitness, Tasks, Files & Notes, and Web Search from the menu.";
}
async function sendChat(){
 const input=$("#chatInput");if(!input)return;
 const message=input.value.trim();if(!message)return;
 data.messages.push({role:"user",content:message});save();render();
 const log=$("#chatLog");
 const loading=document.createElement("div");loading.className="bubble assistant";loading.innerHTML='<span class="who">SILENT PROGRESSOR</span>Thinking…';log.append(loading);log.scrollTop=log.scrollHeight;
 try{
   const history=data.messages.slice(-11,-1);
   const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message,history})});
   const result=await r.json();
   if(!r.ok)throw new Error(result.error||"AI backend unavailable.");
   data.messages.push({role:"assistant",content:result.answer});
 }catch(err){
   data.messages.push({role:"assistant",content:localReply(message)+(String(err.message).includes("AI API is not configured")?"\n\nTo enable full AI: configure OPENAI_API_KEY in .env and restart the server.":"")});
 }
 save();render();
}
function speak(text){
 if(!("speechSynthesis" in window)){toast("Text-to-speech is not supported in this browser.");return;}
 window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=/[\u0900-\u097F]/.test(text)?"hi-IN":"en-IN";u.rate=1;window.speechSynthesis.speak(u);
}
function toggleRecognition(){
 const btn=$("#micBtn");
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){toast("Voice input isn't supported here. Try Chrome on Android or use typing.");return;}
 if(recognizing&&recognition){recognition.stop();return;}
 recognition=new SR();recognition.lang="hi-IN";recognition.interimResults=false;recognition.maxAlternatives=1;
 recognition.onstart=()=>{recognizing=true;btn.classList.add("listening");btn.textContent="■";toast("Listening… speak now.");};
 recognition.onresult=e=>{$("#chatInput").value=($("#chatInput").value+" "+e.results[0][0].transcript).trim();};
 recognition.onerror=()=>toast("Voice input failed. Check microphone permission and internet.");
 recognition.onend=()=>{recognizing=false;const b=$("#micBtn");if(b){b.classList.remove("listening");b.textContent="🎙";}};
 recognition.start();
}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("#installBtn").classList.remove("hidden");});
$("#installBtn").addEventListener("click",async()=>{if(!deferredInstall){toast("Use your browser menu → Add to Home screen.");return;}deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("#installBtn").classList.add("hidden");});
if("serviceWorker" in navigator && (location.protocol==="https:"||location.hostname==="localhost"))navigator.serviceWorker.register("/sw.js").catch(()=>{});
render();
