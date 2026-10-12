'use strict';
// Adapted from franbucho/ProfileMiniGame. Camera frames are processed on-device.
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('snake-board'), ctx = canvas.getContext('2d');
  const video = $('camera-preview'), start = $('game-start'), stop = $('game-stop');
  const mode = $('control-mode'), status = $('game-status');
  const HISTORY_KEY = 'fv.snake.history.v1';
  const FACE_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/';
  const scripts = new Map();
  let engine = new SnakeEngine(), state = 'idle', token = 0;
  let timer = null, frame = null, tracker = null, stream = null;
  let seconds = 0, startedAt = 0, calibratedAt = 0, lastFace = 0;
  let center = null, samples = [], history = [], storageAvailable = true;
  let db = null, auth = null, currentUser = null;
  const directions = { up: [0,-1], down: [0,1], left: [-1,0], right: [1,0] };

  function loadScript(url) {
    if (scripts.has(url)) return scripts.get(url);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timeout = setTimeout(() => { script.remove(); reject(new Error('Loading timed out')); }, 20000);
      script.src = url; script.crossOrigin = 'anonymous';
      script.onload = () => { clearTimeout(timeout); resolve(); };
      script.onerror = () => { clearTimeout(timeout); reject(new Error('Service unavailable')); };
      document.head.appendChild(script);
    }).catch(error => { scripts.delete(url); throw error; });
    scripts.set(url, promise);
    return promise;
  }
  function formatTime(time) { return `${Math.floor(time / 60)}:${String(time % 60).padStart(2,'0')}`; }
  function draw() {
    const size = canvas.width / engine.size;
    ctx.fillStyle = '#101010'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle = '#202020'; ctx.lineWidth = 1;
    for (let i = 1; i < engine.size; i++) {
      ctx.beginPath(); ctx.moveTo(i*size,0); ctx.lineTo(i*size,canvas.height);
      ctx.moveTo(0,i*size); ctx.lineTo(canvas.width,i*size); ctx.stroke();
    }
    if (engine.food) {
      ctx.fillStyle = '#eeeeee'; ctx.beginPath();
      ctx.arc((engine.food.x+.5)*size,(engine.food.y+.5)*size,size*.34,0,Math.PI*2); ctx.fill();
    }
    engine.snake.forEach((part,i) => {
      ctx.fillStyle = i === 0 ? '#eeeeee' : '#888888';
      ctx.fillRect(part.x*size+1,part.y*size+1,size-2,size-2);
    });
    $('game-score').textContent = engine.score;
    $('game-time').textContent = formatTime(seconds);
  }
  function makeEntry(name, detail, points) {
    const item = document.createElement('li'), label = document.createElement('span');
    label.textContent = name;
    const subtitle = document.createElement('small'); subtitle.textContent = detail;
    label.appendChild(subtitle);
    const score = document.createElement('strong'); score.textContent = `${points} pts`;
    item.append(label,score); return item;
  }
  function renderHistory() {
    const list = $('game-history'); list.replaceChildren();
    history.slice(0,10).forEach(item => {
      const date = new Date(item.date).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
      list.appendChild(makeEntry(date,`${item.mode === 'face' ? 'Face control' : 'Keyboard / touch'} · ${formatTime(item.seconds)}`,item.score));
    });
    if (!history.length) { const item = document.createElement('li'); item.textContent = 'Your completed games will appear here.'; list.appendChild(item); }
    $('game-best').textContent = history.reduce((best,item) => Math.max(best,item.score),0);
    $('history-note').textContent = storageAvailable ? 'Your last 50 games are saved in this browser. Showing the 10 most recent.' : 'Storage is unavailable. History lasts only for this visit.';
  }
  function readHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      history = Array.isArray(saved) ? saved.filter(item => Number.isInteger(item.score) && item.score >= 0 && Number.isInteger(item.seconds) && item.seconds >= 0 && ['face','manual'].includes(item.mode) && Number.isFinite(Date.parse(item.date))).slice(0,50) : [];
    } catch { storageAvailable = false; }
    renderHistory();
  }
  function cleanupCamera() {
    if (frame !== null) cancelAnimationFrame(frame); frame = null;
    if (stream) stream.getTracks().forEach(track => track.stop()); stream = null;
    video.srcObject = null; video.hidden = true;
    const old = tracker; tracker = null;
    if (old) Promise.resolve(old.close()).catch(() => {});
  }
  function finish(save = true, message = 'Game over.') {
    const wasPlaying = state === 'playing'; state = 'idle'; token++;
    clearInterval(timer); timer = null; cleanupCamera();
    start.disabled = false; start.textContent = 'Play again'; stop.disabled = true; mode.disabled = false;
    if (!wasPlaying || !save) { status.textContent = message; return; }
    seconds = Math.floor((Date.now()-startedAt)/1000);
    const result = {score:engine.score,seconds,mode:mode.value,date:new Date().toISOString()};
    history.unshift(result); history = history.slice(0,50);
    try { localStorage.setItem(HISTORY_KEY,JSON.stringify(history)); } catch { storageAvailable = false; }
    renderHistory(); draw();
    status.textContent = `${message} ${result.score} points. ${storageAvailable ? 'Saved to device history.' : 'Saved for this visit only.'}`;
    if (currentUser && db) saveGlobalScore(currentUser,result);
  }
  function tick() {
    if (state !== 'playing') return;
    seconds = Math.floor((Date.now()-startedAt)/1000);
    if (mode.value === 'face' && Date.now()-lastFace > 1500) {
      status.textContent = 'Face not detected. The snake is waiting — look at the camera to continue.'; draw(); return;
    }
    engine.step(); draw();
    if (engine.over) finish(true,engine.food ? 'Game over.' : 'Board cleared!');
  }
  function run() {
    state = 'playing'; startedAt = Date.now();
    status.textContent = mode.value === 'face' ? 'Move your head left, right, up, or down. Stay in the camera frame.' : 'Use arrow keys, swipe the board, or use the direction buttons.';
    timer = setInterval(tick,120);
  }
  function faceResults(results,session) {
    if (session !== token) return;
    const nose = results.multiFaceLandmarks?.[0]?.[4]; if (!nose) return;
    lastFace = Date.now();
    if (state === 'calibrating') {
      samples.push({x:nose.x,y:nose.y}); if (!calibratedAt) calibratedAt = Date.now();
      if (samples.length >= 10 && Date.now()-calibratedAt >= 800) {
        center = samples.reduce((sum,p) => ({x:sum.x+p.x/samples.length,y:sum.y+p.y/samples.length}),{x:0,y:0});
        state = 'ready'; status.textContent = 'Calibrated. Starting in 2 seconds…';
        setTimeout(() => { if (session === token && state === 'ready') run(); },2000);
      }
    } else if (state === 'playing') {
      if (status.textContent.startsWith('Face not detected')) status.textContent = 'Face detected. Keep moving your head to steer.';
      const x = nose.x-center.x, y = nose.y-center.y;
      if (Math.max(Math.abs(x),Math.abs(y)) < .035) return;
      if (Math.abs(x) > Math.abs(y)+.01) engine.turn(x > 0 ? -1 : 1,0);
      else if (Math.abs(y) > Math.abs(x)+.01) engine.turn(0,y > 0 ? 1 : -1);
    }
  }
  async function processFrame(session) {
    if (session !== token || !tracker) return;
    try { if (video.readyState >= 2) await tracker.send({image:video}); }
    catch { if (session === token) finish(false,'Face tracking could not start. Try again or select keyboard / touch.'); return; }
    if (session === token) frame = requestAnimationFrame(() => processFrame(session));
  }
  async function startGame() {
    if (state !== 'idle') return;
    const session = ++token; engine = new SnakeEngine(); seconds = 0;
    start.disabled = true; stop.disabled = false; mode.disabled = true; draw();
    if (mode.value === 'manual') { run(); return; }
    state = 'starting'; status.textContent = 'Loading face control. Allow the front camera when prompted.';
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera unavailable');
      await loadScript(FACE_BASE+'face_mesh.js'); if (session !== token) return;
      const obtained = await navigator.mediaDevices.getUserMedia({audio:false,video:{width:{ideal:320},height:{ideal:240},facingMode:'user'}});
      if (session !== token) { obtained.getTracks().forEach(track => track.stop()); return; }
      stream = obtained; video.srcObject = stream; video.hidden = false; await video.play();
      if (session !== token) return;
      tracker = new FaceMesh({locateFile:file => FACE_BASE+file});
      tracker.setOptions({maxNumFaces:1,refineLandmarks:true,minDetectionConfidence:.5,minTrackingConfidence:.5});
      tracker.onResults(results => faceResults(results,session));
      samples = []; calibratedAt = 0; center = null; state = 'calibrating';
      status.textContent = 'Look straight at the camera and keep your head still to calibrate.';
      processFrame(session);
      setTimeout(() => { if (session === token && state === 'calibrating') finish(false,'No face detected. Check your lighting and try again, or select keyboard / touch.'); },20000);
    } catch (error) {
      if (session === token) finish(false,error.name === 'NotAllowedError' ? 'Camera permission was denied. Allow it in your browser or select keyboard / touch.' : 'Camera or face control unavailable. Try again or select keyboard / touch.');
    }
  }
  function steer(direction) { if (state === 'playing' && mode.value === 'manual') engine.turn(...directions[direction]); }
  document.addEventListener('keydown',event => {
    if (['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName)) return;
    const direction = {ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[event.key];
    if (direction && state === 'playing' && mode.value === 'manual') { event.preventDefault(); steer(direction); }
    if (event.key === 'Escape' && state !== 'idle') finish(true,'Game ended.');
  });
  document.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click',() => steer(button.dataset.direction)));
  let touch = null;
  canvas.addEventListener('pointerdown',event => { touch = {x:event.clientX,y:event.clientY}; canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointerup',event => {
    if (!touch) return;
    const x = event.clientX-touch.x, y = event.clientY-touch.y; touch = null;
    if (Math.max(Math.abs(x),Math.abs(y)) < 15) return;
    steer(Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up'));
  });
  canvas.addEventListener('pointercancel',() => { touch = null; });
  start.addEventListener('click',startGame); stop.addEventListener('click',() => finish(true,'Game ended.'));
  document.addEventListener('visibilitychange',() => { if (document.hidden && state !== 'idle') finish(true,'Game ended when the page was hidden.'); });
  window.addEventListener('pagehide',() => finish(false,'Game stopped.'));

  async function loadLeaderboard() {
    if (!db) return;
    $('ranking-status').textContent = 'Loading the SnakeRetro leaderboard…';
    try {
      const snapshot = await db.collection('leaderboards').doc('global').collection('scores').orderBy('score','desc').limit(100).get();
      const entries = snapshot.docs.map(doc => doc.data()).filter(item => Number.isFinite(item.score)).sort((a,b) => b.score-a.score || (a.time||0)-(b.time||0));
      $('global-scores').replaceChildren();
      entries.slice(0,10).forEach((entry,i) => $('global-scores').appendChild(makeEntry(`${i+1}. ${entry.name||'Player'}`,`${formatTime(Math.max(0,Math.floor(entry.time||0)))} · Best score`,entry.score)));
      $('ranking-status').textContent = entries.length ? 'Top 10 from the existing shared SnakeRetro leaderboard.' : 'No shared scores yet. Sign in and complete a game to set a record.';
    } catch { $('ranking-status').textContent = 'The shared ranking is temporarily unavailable. Guest play and device history still work.'; }
  }
  async function saveGlobalScore(user,result) {
    const ref = db.collection('leaderboards').doc('global').collection('scores').doc(user.uid);
    $('account-status').textContent = 'Saving your record…';
    try {
      await db.runTransaction(async transaction => {
        const previous = await transaction.get(ref), old = previous.exists ? previous.data() : null;
        if (!old || result.score > old.score || (result.score === old.score && result.seconds < old.time)) {
          transaction.set(ref,{name:user.displayName||'Player',photoURL:user.photoURL||'',score:result.score,time:result.seconds,country:old?.country||'N/A',countryCode:old?.countryCode||'N/A'},{merge:true});
        }
      });
      $('account-status').textContent = 'Your best record is saved to the shared leaderboard.'; await loadLeaderboard();
    } catch { $('account-status').textContent = 'Your game is in device history. The shared record could not be saved; try again later.'; }
  }
  async function setupRanking() {
    try {
      await loadScript('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
      await Promise.all(['auth','firestore'].map(service => loadScript(`https://www.gstatic.com/firebasejs/8.10.0/firebase-${service}.js`)));
      firebase.initializeApp(FIREBASE_CONFIG); db = firebase.firestore(); auth = firebase.auth();
      $('google-login').disabled = false;
      auth.onAuthStateChanged(user => {
        currentUser = user; $('google-login').hidden = !!user; $('google-logout').hidden = !user;
        $('account-status').textContent = user ? `Signed in as ${user.displayName||'Player'}. Completed games update your best shared score.` : 'Play as a guest, or sign in with Google to save your best score to the shared ranking.';
      });
      await loadLeaderboard();
    } catch { $('account-status').textContent = 'Google sign-in is unavailable. Guest play and device history still work.'; $('ranking-status').textContent = 'The shared ranking is unavailable right now.'; }
  }
  $('google-login').addEventListener('click',async () => {
    if (!auth) return;
    try { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
    catch (error) { $('account-status').textContent = error.code === 'auth/unauthorized-domain' ? 'Google sign-in is not enabled for this website yet. You can still play as a guest.' : 'Sign-in did not complete. Allow popups and try again, or continue as a guest.'; }
  });
  $('google-logout').addEventListener('click',() => auth?.signOut().catch(() => { $('account-status').textContent = 'Sign-out did not complete. Please try again.'; }));
  $('ranking-refresh').addEventListener('click',loadLeaderboard);
  readHistory(); draw(); setupRanking();
})();
