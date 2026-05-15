// Local storage abstraction (per-user namespaced when CLAPT_AUTH present)
window.CLAPT_STORE = (function(){
  const BASE = 'clapt.state.v1';
  function key(){
    try{
      if(window.CLAPT_AUTH && CLAPT_AUTH.currentUser()){
        return BASE + '::' + CLAPT_AUTH.currentUser();
      }
    }catch(e){}
    return BASE; // guest fallback
  }
  function defaults(){
    return {
      history: [],
      answers: [],
      topicStats: {},
      difficultyProgress: { easy:0, medium:0, hard:0 },
      streak: 0,
      bestStreak: 0,
      achievements: [],
      preferences: { sound:false }
    };
  }
  function load(){
    try{ const r=localStorage.getItem(key()); if(!r) return defaults();
      const obj=JSON.parse(r); return Object.assign(defaults(),obj);
    }catch(e){ return defaults(); }
  }
  function save(s){
    try{ localStorage.setItem(key(), JSON.stringify(s)); }catch(e){}
  }
  function reset(){ localStorage.removeItem(key()); }
  function recordAnswer(a){
    const s = load();
    s.answers.push(a);
    if(s.answers.length>500) s.answers = s.answers.slice(-500);
    const t = s.topicStats[a.topic] || {seen:0,correct:0,timeMs:0};
    t.seen++; if(a.correct) t.correct++; t.timeMs += a.timeMs;
    s.topicStats[a.topic]=t;
    if(a.correct){ s.streak++; if(s.streak>s.bestStreak) s.bestStreak=s.streak; }
    else { s.streak=0; }
    if(a.correct) s.difficultyProgress[a.difficulty] = (s.difficultyProgress[a.difficulty]||0)+1;
    save(s);
    return s;
  }
  function recordQuiz(q){
    const s = load();
    s.history.push(q);
    const ach = new Set(s.achievements);
    if(s.history.length===1) ach.add('🎯 First Quiz');
    if(q.score>=80) ach.add('⭐ High Scorer');
    if(s.bestStreak>=10) ach.add('🔥 10-Streak');
    if(s.history.length>=5) ach.add('📚 5 Quizzes');
    if((s.difficultyProgress.hard||0)>=10) ach.add('💎 Hard Mode Pro');
    s.achievements = [...ach];
    save(s);
    return s;
  }
  return { load, save, reset, recordAnswer, recordQuiz };
})();
