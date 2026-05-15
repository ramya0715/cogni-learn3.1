// Admin dashboard page logic
(function(){
  if(!window.CLAPT_AUTH || !CLAPT_AUTH.requireAdmin()) return;
  const esc = s => String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
  let selectedUser = null;

  function renderStudentList(){
    const list = document.getElementById('studentList');
    const students = CLAPT_ADMIN.listStudents();
    document.getElementById('kpiStudents').textContent = students.length;
    let totalQuizzes=0, totalAvg=0, withData=0;
    const rows = students.map(s => {
      const st = CLAPT_ADMIN.getStudentState(s.username);
      const sm = CLAPT_ADMIN.summarize(st);
      totalQuizzes += sm.quizzes;
      if(sm.quizzes){ totalAvg += sm.avg; withData++; }
      return {s, sm};
    });
    document.getElementById('kpiQuizzes').textContent = totalQuizzes;
    document.getElementById('kpiAvg').textContent = (withData? Math.round(totalAvg/withData):0)+'%';

    if(!rows.length){
      list.innerHTML = '<div class="muted" style="padding:14px">No students have signed up yet.</div>';
      return;
    }
    list.innerHTML = rows.map(({s,sm})=>`
      <div class="student-row${selectedUser===s.username?' active':''}" data-u="${esc(s.username)}">
        <div class="sr-main">
          <div class="sr-name">${esc(s.displayName)} <span class="muted">@${esc(s.username)}</span></div>
          <div class="sr-meta">
            <span>Quizzes: <b>${sm.quizzes}</b></span>
            <span>Avg: <b>${sm.avg}%</b></span>
            <span>Best: <b>${sm.best}%</b></span>
            <span>Accuracy: <b>${sm.accuracy}%</b></span>
          </div>
        </div>
        <div class="sr-actions">
          <button class="ghost-btn view-btn">View</button>
          <button class="ghost-btn dl-btn">⤓ Report</button>
        </div>
      </div>
    `).join('');
    list.querySelectorAll('.student-row').forEach(row=>{
      const u = row.getAttribute('data-u');
      row.querySelector('.view-btn').addEventListener('click', ()=>{ selectedUser=u; renderStudentList(); renderDetail(); });
      row.querySelector('.dl-btn').addEventListener('click', ()=>CLAPT_ADMIN.downloadReport(u));
    });
  }

  function renderDetail(){
    const detail = document.getElementById('studentDetail');
    if(!selectedUser){
      detail.innerHTML = '<div class="muted" style="padding:14px">Select a student to view their progress, send feedback, or assign tasks.</div>';
      return;
    }
    const users = CLAPT_AUTH.loadUsers();
    const u = users[selectedUser];
    const st = CLAPT_ADMIN.getStudentState(selectedUser);
    const sm = CLAPT_ADMIN.summarize(st);
    const ext = CLAPT_ADMIN.getForStudent(selectedUser);
    detail.innerHTML = `
      <div class="flex-between" style="align-items:flex-start;flex-wrap:wrap;gap:10px">
        <div>
          <h3 style="margin:0">${esc(u.displayName)} <span class="muted" style="font-weight:400">@${esc(selectedUser)}</span></h3>
          <div class="muted" style="font-size:13px">Joined ${new Date(u.createdAt||Date.now()).toLocaleDateString()}</div>
        </div>
        <button class="btn primary" id="dlReport">⤓ Download Report</button>
      </div>

      <div class="kpi-grid" style="margin-top:14px">
        <div class="kpi"><div class="lbl">Quizzes</div><div class="val">${sm.quizzes}</div></div>
        <div class="kpi"><div class="lbl">Average</div><div class="val">${sm.avg}%</div></div>
        <div class="kpi"><div class="lbl">Best</div><div class="val">${sm.best}%</div></div>
        <div class="kpi"><div class="lbl">Accuracy</div><div class="val">${sm.accuracy}%</div></div>
      </div>

      <div class="panels" style="margin-top:14px">
        <div class="panel">
          <h3>Weak Areas</h3>
          ${sm.weak.length? sm.weak.map(t=>`<div class="list-row"><span>${esc(t.topic)}</span><b>${t.acc}%</b></div>`).join('') : '<div class="muted">No weak topics — solid performance.</div>'}
          <h3 style="margin-top:14px">Strong Topics</h3>
          ${sm.strong.length? sm.strong.map(t=>`<div class="list-row"><span>${esc(t.topic)}</span><b>${t.acc}%</b></div>`).join('') : '<div class="muted">No data yet.</div>'}
        </div>
        <div class="panel">
          <h3>Recent Quizzes</h3>
          ${((st&&st.history)||[]).slice(-8).reverse().map(q=>`
            <div class="list-row"><span>${esc(q.topic||'Mixed')} · ${new Date(q.finishedAt||q.at||Date.now()).toLocaleDateString()}</span><b>${q.score||0}%</b></div>
          `).join('') || '<div class="muted">No quizzes taken yet.</div>'}
        </div>
      </div>

      <div class="panels" style="margin-top:14px">
        <div class="panel">
          <h3>Send Feedback / Suggestion</h3>
          <textarea id="fbText" rows="3" placeholder="Write a suggestion for this student..." style="width:100%"></textarea>
          <button class="btn primary" id="fbSend" style="margin-top:8px">Send</button>
          <h3 style="margin-top:14px">Past Feedback</h3>
          <div class="list">
            ${ext.feedback.length? ext.feedback.map(f=>`<div class="list-row"><span>${esc(f.text)}</span><span class="muted" style="font-size:12px">${new Date(f.ts).toLocaleDateString()}</span></div>`).join('') : '<div class="muted">No feedback yet.</div>'}
          </div>
        </div>
        <div class="panel">
          <h3>Assign Practice Task</h3>
          <input id="taskTitle" placeholder="Task title (e.g. Practice 20 DBMS questions)" style="width:100%;margin-bottom:6px"/>
          <input id="taskDetail" placeholder="Optional detail / link" style="width:100%"/>
          <button class="btn primary" id="taskAdd" style="margin-top:8px">Assign</button>
          <h3 style="margin-top:14px">Current Tasks</h3>
          <div class="list">
            ${ext.tasks.length? ext.tasks.map(t=>`<div class="list-row"><span>${esc(t.title)}${t.detail?` <span class="muted">— ${esc(t.detail)}</span>`:''}</span><span class="muted" style="font-size:12px">${t.done?'✓ done':'pending'}</span></div>`).join('') : '<div class="muted">No tasks assigned.</div>'}
          </div>
        </div>
      </div>
    `;
    document.getElementById('dlReport').addEventListener('click', ()=>CLAPT_ADMIN.downloadReport(selectedUser));
    document.getElementById('fbSend').addEventListener('click', ()=>{
      const v = document.getElementById('fbText').value.trim(); if(!v) return;
      CLAPT_ADMIN.addFeedback(selectedUser, v); renderDetail();
    });
    document.getElementById('taskAdd').addEventListener('click', ()=>{
      const title=document.getElementById('taskTitle').value.trim();
      const detail=document.getElementById('taskDetail').value.trim();
      if(!title) return;
      CLAPT_ADMIN.assignTask(selectedUser, {title, detail});
      renderDetail();
    });
  }

  function renderMaterials(){
    const list = document.getElementById('materialsList');
    const d = CLAPT_ADMIN.loadAdminData();
    if(!d.materials.length){ list.innerHTML='<div class="muted">No materials shared yet.</div>'; return; }
    list.innerHTML = d.materials.map(m=>`
      <div class="list-row">
        <div>
          <div><b>${esc(m.title)}</b> <span class="muted" style="font-size:12px">· ${m.type||'note'}</span></div>
          ${m.url? `<a href="${esc(m.url)}" target="_blank" rel="noopener" style="font-size:13px">${esc(m.url)}</a>` : ''}
          ${m.body? `<div class="muted" style="font-size:13px;white-space:pre-wrap">${esc(m.body)}</div>` : ''}
        </div>
        <button class="ghost-btn" data-id="${m.id}">Delete</button>
      </div>
    `).join('');
    list.querySelectorAll('button[data-id]').forEach(b=>{
      b.addEventListener('click', ()=>{ CLAPT_ADMIN.deleteMaterial(b.dataset.id); renderMaterials(); });
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    renderStudentList(); renderDetail(); renderMaterials();
    document.getElementById('matAdd').addEventListener('click', ()=>{
      const title=document.getElementById('matTitle').value.trim();
      const type=document.getElementById('matType').value;
      const url=document.getElementById('matUrl').value.trim();
      const body=document.getElementById('matBody').value.trim();
      if(!title) return alert('Title required');
      CLAPT_ADMIN.addMaterial({title, type, url, body});
      document.getElementById('matTitle').value='';
      document.getElementById('matUrl').value='';
      document.getElementById('matBody').value='';
      renderMaterials();
    });
  });
})();
