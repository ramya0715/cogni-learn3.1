// Simple client-side auth (localStorage). Per-user data namespacing.
window.CLAPT_AUTH = (function(){
  const USERS_KEY = 'clapt.users.v1';
  const SESSION_KEY = 'clapt.session.v1';
  const LAST_USER_KEY = 'clapt.lastUser.v1';
  const REMEMBER_KEY = 'clapt.remember.v1';

  async function sha256(str){
    try{
      const buf = new TextEncoder().encode(str);
      const h = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }catch(e){
      let h=0; for(let i=0;i<str.length;i++){ h=((h<<5)-h)+str.charCodeAt(i); h|=0; }
      return 'fb_'+h;
    }
  }
  function normalizeUsername(username){ return (username||'').trim().toLowerCase(); }
  function loadUsers(){
    try{
      const users = JSON.parse(localStorage.getItem(USERS_KEY)||'{}') || {};
      for(const legacyKey of ['claptUsers','CLAPT_USERS','users']){
        try{
          const legacy = JSON.parse(localStorage.getItem(legacyKey)||'{}') || {};
          Object.keys(legacy).forEach(k=>{ if(!users[normalizeUsername(k)]) users[normalizeUsername(k)] = legacy[k]; });
        }catch(e){}
      }
      return users;
    }catch(e){ return {}; }
  }
  function saveUsers(u){ localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
  function currentUser(){ return localStorage.getItem(SESSION_KEY) || null; }
  function userKey(){ const u=currentUser(); return u? u : '__guest__'; }
  function remembered(){
    try{ return JSON.parse(localStorage.getItem(REMEMBER_KEY)||'null'); }catch(e){ return null; }
  }
  function remember(username, password, displayName, enabled){
    username = normalizeUsername(username);
    if(!username) return;
    localStorage.setItem(LAST_USER_KEY, username);
    if(enabled !== false){
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username, password: password || '', displayName: displayName || username, savedAt: Date.now() }));
    }
  }
  async function restoreRememberedUser(username, password){
    const r = remembered();
    if(!r) return null;
    const wanted = normalizeUsername(username || r.username);
    if(wanted !== normalizeUsername(r.username)) return null;
    if(password && r.password && password !== r.password) return null;
    const users = loadUsers();
    if(users[wanted]) return users[wanted];
    if(!r.password) return null;
    users[wanted] = { hash: await sha256(r.password+'::'+wanted), displayName: r.displayName || wanted, createdAt: Date.now(), restoredAt: Date.now() };
    saveUsers(users);
    return users[wanted];
  }

  async function register(username, password, displayName, rememberAccount){
    username=normalizeUsername(username);
    if(!username || username.length<3) throw new Error('Username must be at least 3 characters.');
    if(!/^[a-z0-9_.-]+$/.test(username)) throw new Error('Username can only contain letters, numbers, . _ -');
    if(!password || password.length<6) throw new Error('Password must be at least 6 characters.');
    const users = loadUsers();
    if(users[username]) throw new Error('Username already exists. Please use Log in.');
    users[username] = {
      hash: await sha256(password+'::'+username),
      displayName: (displayName||username).trim(),
      createdAt: Date.now()
    };
    saveUsers(users);
    remember(username, password, users[username].displayName, rememberAccount !== false);
    localStorage.setItem(SESSION_KEY, username);
    return users[username];
  }
  async function login(username, password, rememberAccount){
    username=normalizeUsername(username);
    let users = loadUsers();
    let u = users[username];
    if(!u) u = await restoreRememberedUser(username, password);
    if(!u) throw new Error('No account found for that username on this device. Check the saved username below or create the account once.');
    const h = await sha256(password+'::'+username);
    if(h !== u.hash) throw new Error('Incorrect password.');
    localStorage.setItem(SESSION_KEY, username);
    remember(username, password, u.displayName, rememberAccount !== false);
    return u;
  }
  function logout(redirect){
    localStorage.removeItem(SESSION_KEY);
    if(redirect!==false) location.href = redirect || resolve('pages/login.html');
  }
  function profile(){
    const u = currentUser(); if(!u) return null;
    const users = loadUsers(); return users[u] ? Object.assign({username:u}, users[u]) : null;
  }

  function resolve(rel){
    const inPages = /\/pages\//.test(location.pathname);
    return (inPages? '../':'') + rel;
  }

  function requireLogin(){
    if(!currentUser()){
      location.replace(resolve('pages/login.html'));
      return false;
    }
    return true;
  }

  function injectNavUser(){
    const links = document.querySelector('.nav-links');
    if(!links) return;
    if(document.getElementById('navUserBox')) return;
    const box = document.createElement('span');
    box.id='navUserBox';
    box.style.cssText='display:inline-flex;align-items:center;gap:10px;margin-left:6px;flex-wrap:wrap';
    const p = profile();
    if(p){
      box.innerHTML = `<span class="nav-user" title="Signed in as @${p.username}" style="font-weight:600">👤 ${escapeHtml(p.displayName)}</span>
        <button id="navLogoutBtn" class="ghost-btn" title="Log out">⎋ Logout</button>`;
    } else {
      box.innerHTML = `<a href="${resolve('pages/login.html')}" class="ghost-btn" style="text-decoration:none">Login</a>
        <a href="${resolve('pages/signup.html')}" class="btn primary" style="padding:6px 12px;text-decoration:none">Sign up</a>`;
    }
    links.appendChild(box);
    const lo = document.getElementById('navLogoutBtn');
    if(lo) lo.addEventListener('click', ()=>logout());
  }
  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]); }

  document.addEventListener('DOMContentLoaded', injectNavUser);

  return { register, login, logout, currentUser, profile, requireLogin, userKey, resolve, remembered, loadUsers, lastUser:()=>localStorage.getItem(LAST_USER_KEY)||'' };
})();
