// DASHBOARD
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    if(window.CLAPT_AUTH && CLAPT_AUTH.isAdmin()){ location.replace('admin.html'); return; }
    renderTeacherBox();
    const state = CLAPT_STORE.load();
    const reco  = CLAPT_RECO.generate(state);
    const load  = CLAPT_ADAPT.computeLoadFromAnswers(state.answers);

    document.getElementById('kpiReadiness').textContent = reco.readiness+'%';
    document.getElementById('kpiQuizzes').textContent = state.history.length;
    document.getElementById('kpiStreak').textContent = state.streak+' / best '+state.bestStreak;
    document.getElementById('kpiCog').textContent = load.level.toUpperCase();
    document.getElementById('kpiCog').className = 'val ' + (load.level==='low'?'cog-low':load.level==='medium'?'cog-med':'cog-high');

    // Topic progress
    const topicsBox = document.getElementById('topicsList');
    const stats = state.topicStats;
    const tList = Object.keys(stats);
    if(!tList.length){
      topicsBox.innerHTML = '<div class="empty">No data yet. Take a quiz to populate your dashboard.</div>';
    } else {
      topicsBox.innerHTML = tList.map(t=>{
        const acc = Math.round((stats[t].correct/stats[t].seen)*100);
        return `<div class="meter">
          <div class="lbl">${t}</div>
          <div class="bar" style="flex:1"><span style="width:${acc}%"></span></div>
          <div style="min-width:50px;text-align:right;font-weight:600">${acc}%</div>
        </div>`;
      }).join('');
    }

    // Recent history
    const histBox = document.getElementById('historyList');
    const recent = state.history.slice(-5).reverse();
    if(!recent.length){
      histBox.innerHTML = '<div class="empty">No quiz history yet.</div>';
    } else {
      histBox.innerHTML = recent.map(h=>`
        <div class="row">
          <div><b>${h.correct}/${h.total}</b> · <span class="muted">${new Date(h.ts).toLocaleString()}</span></div>
          <div><span class="tag">${h.score}%</span></div>
        </div>`).join('');
    }

    // Achievements
    const ach = state.achievements||[];
    document.getElementById('badgeList').innerHTML =
      (ach.length? ach.map(a=>`<div class="achv"><span class="em">${a.split(' ')[0]}</span>${a.replace(/^\S+\s/,'')}</div>`).join('')
      : '<div class="empty">Earn badges by completing quizzes.</div>');

    document.getElementById('resetBtn').addEventListener('click',()=>{
      if(confirm('Reset all your CLAPT data?')){ CLAPT_STORE.reset(); location.reload(); }
    });
  });

  function esc(s){ return String(s||'').replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }
  function renderTeacherBox(){
    if(!window.CLAPT_ADMIN || !window.CLAPT_AUTH) return;
    const me = CLAPT_AUTH.currentUser(); if(!me) return;
    const ext = CLAPT_ADMIN.getForStudent(me);
    if(!ext.feedback.length && !ext.tasks.length && !ext.materials.length) return;
    const main = document.querySelector('main.page');
    const wrap = document.createElement('div');
    wrap.className='panels';
    wrap.style.marginTop='18px';
    wrap.innerHTML = `
      <div class="panel">
        <h3>Teacher Feedback</h3>
        ${ext.feedback.length? ext.feedback.slice(0,5).map(f=>`<div class="row"><div>${esc(f.text)}</div><span class="muted" style="font-size:12px">${new Date(f.ts).toLocaleDateString()}</span></div>`).join('') : '<div class="empty">No feedback yet.</div>'}
        <h3 style="margin-top:14px">Assigned Tasks</h3>
        ${ext.tasks.length? ext.tasks.map(t=>`<div class="row"><div><b>${esc(t.title)}</b>${t.detail?` <span class="muted">— ${esc(t.detail)}</span>`:''}</div></div>`).join('') : '<div class="empty">No tasks assigned.</div>'}
      </div>
      <div class="panel">
        <h3>Shared Materials</h3>
        ${ext.materials.length? ext.materials.slice(0,8).map(m=>`<div class="row"><div><b>${esc(m.title)}</b> <span class="muted" style="font-size:12px">· ${esc(m.type||'note')}</span>${m.url?`<br/><a href="${esc(m.url)}" target="_blank" rel="noopener" style="font-size:13px">${esc(m.url)}</a>`:''}${m.body?`<div class="muted" style="font-size:13px;white-space:pre-wrap">${esc(m.body)}</div>`:''}</div></div>`).join('') : '<div class="empty">No materials yet.</div>'}
      </div>`;
    main.appendChild(wrap);
  }
})();
