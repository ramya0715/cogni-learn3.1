// Admin module: cross-user data inspection + materials/feedback/tasks
window.CLAPT_ADMIN = (function(){
  const STATE_BASE = 'clapt.state.v1';
  const ADMIN_DATA_KEY = 'clapt.admin.v1'; // { feedback:{user:[{ts,from,text}]}, materials:[...], tasks:{user:[...]} }

  function loadAdminData(){
    try{ return Object.assign({feedback:{},materials:[],tasks:{}}, JSON.parse(localStorage.getItem(ADMIN_DATA_KEY)||'{}')); }
    catch(e){ return {feedback:{},materials:[],tasks:{}}; }
  }
  function saveAdminData(d){ localStorage.setItem(ADMIN_DATA_KEY, JSON.stringify(d)); }

  function listStudents(){
    const users = CLAPT_AUTH.loadUsers();
    return Object.keys(users)
      .filter(u => (users[u].role||'student') !== 'admin')
      .map(u => Object.assign({username:u}, users[u]));
  }
  function getStudentState(username){
    try{
      const raw = localStorage.getItem(STATE_BASE+'::'+username);
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(e){ return null; }
  }
  function summarize(s){
    if(!s) return {quizzes:0, avg:0, best:0, weak:[], strong:[], lastAt:null, accuracy:0};
    const h = s.history||[]; const ts = s.topicStats||{};
    const avg = h.length ? Math.round(h.reduce((a,q)=>a+(q.score||0),0)/h.length) : 0;
    const best = h.reduce((a,q)=>Math.max(a,q.score||0),0);
    const lastAt = h.length ? h[h.length-1].finishedAt || h[h.length-1].at || null : null;
    let totSeen=0, totCorrect=0;
    const arr = Object.keys(ts).map(t=>{
      const v=ts[t]; totSeen+=v.seen; totCorrect+=v.correct;
      return {topic:t, seen:v.seen, acc: v.seen? Math.round(100*v.correct/v.seen):0};
    });
    arr.sort((a,b)=>a.acc-b.acc);
    const weak = arr.filter(x=>x.acc<70).slice(0,5);
    const strong = arr.slice().sort((a,b)=>b.acc-a.acc).slice(0,3);
    const accuracy = totSeen? Math.round(100*totCorrect/totSeen):0;
    return {quizzes:h.length, avg, best, weak, strong, lastAt, accuracy};
  }
  function addFeedback(username, text){
    const d = loadAdminData(); d.feedback[username] = d.feedback[username]||[];
    d.feedback[username].unshift({ts:Date.now(), from: CLAPT_AUTH.currentUser(), text});
    saveAdminData(d);
  }
  function addMaterial(m){
    const d = loadAdminData();
    d.materials.unshift(Object.assign({id:'m_'+Date.now(), ts:Date.now(), from:CLAPT_AUTH.currentUser()}, m));
    saveAdminData(d);
  }
  function deleteMaterial(id){
    const d = loadAdminData(); d.materials = d.materials.filter(x=>x.id!==id); saveAdminData(d);
  }
  function assignTask(username, task){
    const d = loadAdminData(); d.tasks[username] = d.tasks[username]||[];
    d.tasks[username].unshift(Object.assign({id:'t_'+Date.now(), ts:Date.now(), from:CLAPT_AUTH.currentUser(), done:false}, task));
    saveAdminData(d);
  }
  function getForStudent(username){
    const d = loadAdminData();
    return {
      feedback: d.feedback[username]||[],
      tasks: d.tasks[username]||[],
      materials: d.materials||[]
    };
  }
  function downloadReport(username){
    const users = CLAPT_AUTH.loadUsers();
    const u = users[username]; if(!u) return;
    const s = getStudentState(username); const sm = summarize(s);
    const d = loadAdminData();
    const lines = [];
    lines.push('CLAPT Student Report');
    lines.push('====================');
    lines.push('Name: '+u.displayName+' (@'+username+')');
    lines.push('Generated: '+new Date().toLocaleString());
    lines.push('');
    lines.push('Summary');
    lines.push('  Quizzes Taken : '+sm.quizzes);
    lines.push('  Average Score : '+sm.avg+'%');
    lines.push('  Best Score    : '+sm.best+'%');
    lines.push('  Accuracy      : '+sm.accuracy+'%');
    lines.push('  Best Streak   : '+((s&&s.bestStreak)||0));
    lines.push('');
    lines.push('Strong Topics');
    sm.strong.forEach(t=>lines.push('  - '+t.topic+' ('+t.acc+'%)'));
    lines.push('');
    lines.push('Weak Areas');
    if(!sm.weak.length) lines.push('  - None below 70%');
    sm.weak.forEach(t=>lines.push('  - '+t.topic+' ('+t.acc+'%)'));
    lines.push('');
    lines.push('Recent Quiz History');
    ((s&&s.history)||[]).slice(-10).reverse().forEach(q=>{
      lines.push('  '+new Date(q.finishedAt||q.at||Date.now()).toLocaleString()+'  '+(q.topic||'Mixed')+'  '+(q.score||0)+'%');
    });
    lines.push('');
    lines.push('Teacher Feedback');
    (d.feedback[username]||[]).forEach(f=>lines.push('  ['+new Date(f.ts).toLocaleString()+'] '+f.text));
    lines.push('');
    lines.push('Assigned Tasks');
    (d.tasks[username]||[]).forEach(t=>lines.push('  - ['+(t.done?'x':' ')+'] '+t.title+(t.detail?(' — '+t.detail):'')));

    const blob = new Blob([lines.join('\n')], {type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='CLAPT_Report_'+username+'.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  return { listStudents, getStudentState, summarize, loadAdminData,
           addFeedback, addMaterial, deleteMaterial, assignTask,
           getForStudent, downloadReport };
})();
