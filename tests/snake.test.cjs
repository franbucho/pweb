'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const SnakeEngine = require('../snake-engine.js');

function engineTests() {
  let game = new SnakeEngine(4, () => 0);
  assert(!game.snake.some(p => p.x === game.food.x && p.y === game.food.y));
  assert.equal(game.turn(-1, 0), false, 'reverse blocked');
  assert.equal(game.turn(0, -1), true);
  assert.equal(game.turn(-1, 0), false, 'only one turn per tick');
  game.step(); assert.deepEqual(game.snake[0], {x:2, y:1});
  game = new SnakeEngine(4, () => 0);
  game.food = {x:3, y:2}; game.step();
  assert.equal(game.score, 10); assert.equal(game.snake.length, 2);
  game.step(); assert.equal(game.over, true, 'wall collision');
  game = new SnakeEngine(4, () => 0);
  game.snake = [{x:1,y:1},{x:1,y:2},{x:0,y:2},{x:0,y:1}];
  game.direction = {x:-1,y:0}; game.food = {x:3,y:3}; game.step();
  assert.equal(game.over, false, 'vacating tail is legal');
  game = new SnakeEngine(2, () => 0);
  game.snake = [{x:0,y:0},{x:0,y:1},{x:1,y:1}];
  game.direction = {x:1,y:0}; game.food = {x:1,y:0}; game.step();
  assert.equal(game.over, true); assert.equal(game.food, null, 'full board terminates');
  console.log('PASS engine: food, movement, reversals, collision, tail, full board');
}

function harness({stored = null, storageError = false, signedIn = false, denyCamera = false, firebase = false} = {}) {
  const elements = new Map(), intervals = new Map(), timeouts = new Map(), listeners = new Map();
  const memory = new Map(stored ? [['fv.snake.history.v1', stored]] : []);
  const engines = [], transactions = [];
  let faceCallback = null, stoppedTracks = 0, closedTrackers = 0;
  let now = Date.parse('2026-10-12T12:00:00Z'), id = 0, cameraRequests = 0;
  class Element {
    constructor() { this.events = {}; this.children = []; this.textContent = ''; this.hidden = false; this.disabled = false; this.value = ''; this.tagName = 'BUTTON'; }
    addEventListener(type, fn) { this.events[type] = fn; }
    append(...items) { this.children.push(...items); }
    appendChild(item) { this.children.push(item); if (item.src) queueMicrotask(() => item.src.includes('firebase') ? item.onerror() : item.onload()); return item; }
    replaceChildren(...items) { this.children = items; }
    remove() {}
    setPointerCapture() {}
    getContext() { return new Proxy({}, {get: () => () => {}, set: () => true}); }
    play() { return Promise.resolve(); }
    fire(type, event = {}) { return this.events[type]?.(event); }
  }
  const $ = name => { if (!elements.has(name)) elements.set(name, new Element()); return elements.get(name); };
  $('control-mode').value = 'manual'; $('control-mode').tagName = 'SELECT';
  $('snake-board').width = $('snake-board').height = 600;
  $('camera-preview').readyState = 2;
  const document = {
    hidden: false, head: new Element(), getElementById: $, createElement: () => new Element(),
    querySelectorAll: () => [], addEventListener: (name, fn) => listeners.set(name, fn)
  };
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  class TestEngine extends SnakeEngine { constructor() { super(); engines.push(this); } }
  const sandbox = {
    document, SnakeEngine: TestEngine, Date: Clock, Map, Promise, console, FIREBASE_CONFIG: {},
    localStorage: {getItem: key => { if (storageError) throw Error('disabled'); return memory.get(key) || null; }, setItem: (key,value) => { if (storageError) throw Error('disabled'); memory.set(key,value); }},
    setInterval: fn => { intervals.set(++id,fn); return id; }, clearInterval: id => intervals.delete(id),
    setTimeout: (fn,delay) => { timeouts.set(++id,{fn,delay}); return id; }, clearTimeout: id => timeouts.delete(id),
    requestAnimationFrame: () => ++id, cancelAnimationFrame: () => {},
    navigator: {mediaDevices: {getUserMedia: () => { cameraRequests++; return denyCamera ? Promise.reject({name:'NotAllowedError'}) : Promise.resolve({getTracks: () => [{stop() {stoppedTracks++;}}]}); }}},
    addEventListener: (name,fn) => listeners.set(name,fn)
  };
  sandbox.FaceMesh = class {
    setOptions() {}
    onResults(callback) { faceCallback = callback; }
    send() { return Promise.resolve(); }
    close() { closedTrackers++; return Promise.resolve(); }
  };
  sandbox.window = sandbox;
  const imports = [];
  const script = new vm.Script(fs.readFileSync(require.resolve('../snake.js'),'utf8'), {
    filename: 'snake.js',
    importModuleDynamically: specifier => {
      imports.push(specifier);
      if (!firebase) throw new Error('offline');
      if (firebase === 'hang') return new Promise(() => {});
      return import(require('node:url').pathToFileURL(require.resolve('./fake-firebase.mjs')).href);
    }
  });
  script.runInContext(vm.createContext(sandbox));
  return {$, imports, document, listeners, engines, memory, intervals, timeouts, cameraRequests: () => cameraRequests, stoppedTracks: () => stoppedTracks, closedTrackers: () => closedTrackers, face: nose => faceCallback({multiFaceLandmarks:[[null,null,null,null,nose]]}), advance: n => {now += n;}, tick: () => [...intervals.values()].forEach(fn => fn())};
}
const flush = async () => { for (let i=0;i<8;i++) await Promise.resolve(); };
async function interfaceTests() {
  const h = harness(); await flush();
  assert.equal(h.cameraRequests(),0, 'camera not activated on load');
  h.$('game-start').fire('click'); assert.equal(h.$('game-start').disabled,true);
  h.engines.at(-1).score = 20; h.advance(3000); h.$('game-stop').fire('click');
  let saved = JSON.parse(h.memory.get('fv.snake.history.v1'));
  assert.equal(saved.length,1); assert.equal(saved[0].score,20); assert.equal(saved[0].seconds,3); assert.equal(saved[0].mode,'manual');
  h.$('game-stop').fire('click'); assert.equal(JSON.parse(h.memory.get('fv.snake.history.v1')).length,1,'no duplicate records');
  assert.equal(h.intervals.size,0); assert.equal(h.$('control-mode').disabled,false);
  const reload = harness({stored: JSON.stringify(saved)}); assert.equal(reload.$('game-best').textContent,20);
  const broken = harness({stored:'invalid'}); assert.equal(broken.$('game-best').textContent,0);
  const privateMode = harness({storageError:true}); privateMode.$('game-start').fire('click'); privateMode.$('game-stop').fire('click'); assert.match(privateMode.$('game-status').textContent,/visit only/);
  h.$('game-start').fire('click'); h.document.hidden = true; h.listeners.get('visibilitychange')(); assert.equal(h.intervals.size,0,'hidden page stops');
  const denied = harness({denyCamera:true}); await flush(); denied.$('control-mode').value='face';
  const pending = denied.$('game-start').fire('click'); await pending; await flush();
  assert.equal(denied.cameraRequests(),1); assert.match(denied.$('game-status').textContent,/permission was denied/);
  assert.equal(denied.$('game-start').disabled,false); assert.equal(denied.memory.size,0,'failed camera is not a scored game');
  const cancel = harness(); await flush(); cancel.$('control-mode').value='face';
  const loading = cancel.$('game-start').fire('click'); cancel.$('game-stop').fire('click'); await loading;
  assert.equal(cancel.cameraRequests(),0,'cancel before camera request');
  const face = harness(); await flush(); face.$('control-mode').value='face';
  await face.$('game-start').fire('click');
  for(let i=0;i<10;i++){face.advance(100);face.face({x:.5,y:.5});}
  const delay = [...face.timeouts.values()].find(t => t.delay === 2000); assert(delay,'calibration completes'); delay.fn();
  face.face({x:.6,y:.5}); assert.equal(face.engines.at(-1).pending,null,'reverse direction is blocked');
  face.face({x:.5,y:.4}); assert.deepEqual(face.engines.at(-1).pending,{x:0,y:-1});
  face.$('game-stop').fire('click');
  assert.equal(face.stoppedTracks(),1); assert.equal(face.closedTrackers(),1); assert.equal(face.$('camera-preview').hidden,true);
  assert.equal(JSON.parse(face.memory.get('fv.snake.history.v1'))[0].mode,'face');
  console.log('PASS face calibration, directional input, record mode, camera/tracker cleanup');
  console.log('PASS interface: guest play, history persistence, duplicates, unavailable storage, hidden page, camera denial/cancellation, CDN failure fallback');
}
async function firebaseTests() {
  const fake = await import(require('node:url').pathToFileURL(require.resolve('./fake-firebase.mjs')).href);
  const offline = harness(); await flush();
  assert.match(offline.$('ranking-status').textContent,/unavailable/,'CDN failure falls back');
  const h = harness({firebase: true}); await flush(); await flush();
  assert.equal(h.imports.length,3);
  for (const name of ['app','auth','firestore']) assert(h.imports.includes(`./vendor/firebase/13.4.0/firebase-${name}.js`),`loads vendored ${name} module`);
  assert(!h.imports.some(url => url.includes('8.10.0')),'old SDK is gone');
  assert(!h.imports.some(url => /^https?:/.test(url)),'no SDK module is loaded from a CDN');
  assert.equal(h.$('google-login').disabled,false,'sign-in enabled once Firebase loads');
  assert(fake.log.some(([name,path]) => name === 'getDocs' && path === 'leaderboards/global/scores'),'leaderboard query');
  await h.$('google-login').fire('click');
  assert(fake.log.some(([name,kind,provider]) => name === 'signInWithPopup' && kind === 'auth' && provider),'Google popup sign-in');
  fake.signIn({uid:'u1',displayName:'Ana',photoURL:''});
  assert.equal(h.$('google-logout').hidden,false);
  h.$('game-start').fire('click'); h.engines.at(-1).score = 30; h.advance(5000); h.$('game-stop').fire('click');
  await flush(); await flush();
  assert.deepEqual(fake.store.get('leaderboards/global/scores/u1'),{name:'Ana',photoURL:'',score:30,time:5,country:'N/A',countryCode:'N/A'});
  h.$('game-start').fire('click'); h.engines.at(-1).score = 10; h.$('game-stop').fire('click'); await flush(); await flush();
  assert.equal(fake.store.get('leaderboards/global/scores/u1').score,30,'lower score does not overwrite record');
  assert.equal(h.$('global-scores').children.length,1,'ranking re-rendered');
  h.$('google-logout').fire('click'); await flush();
  assert(fake.log.some(([name]) => name === 'signOut'),'sign-out');
  console.log('PASS firebase 13.4.0 modular: vendored module paths, leaderboard query, sign-in/out, transactional best-score save, load failure fallback');
}
async function firebaseFailureTests() {
  const fake = await import(require('node:url').pathToFileURL(require.resolve('./fake-firebase.mjs')).href);
  // (a) The SDK never finishes loading: after 20 s the page falls back to guest mode.
  const slow = harness({firebase: 'hang'}); await flush();
  assert.equal(slow.$('ranking-status').textContent,'','ranking still waiting while the SDK loads');
  const timer = [...slow.timeouts.values()].find(t => t.delay === 20000);
  assert(timer,'20 s load timeout is armed');
  timer.fn(); await flush(); await flush();
  assert.match(slow.$('ranking-status').textContent,/unavailable/,'ranking falls back after timeout');
  assert.match(slow.$('account-status').textContent,/unavailable/,'sign-in falls back after timeout');
  slow.$('game-start').fire('click'); slow.engines.at(-1).score = 10; slow.$('game-stop').fire('click');
  assert.equal(JSON.parse(slow.memory.get('fv.snake.history.v1')).length,1,'guest play still works after timeout');
  // (b) Saving the record fails (e.g. Firestore rules reject the write).
  const h = harness({firebase: true}); await flush(); await flush();
  fake.signIn({uid:'u2',displayName:'Bea',photoURL:''});
  fake.failures.transaction = true;
  try {
    h.$('game-start').fire('click'); h.engines.at(-1).score = 50; h.advance(4000); h.$('game-stop').fire('click');
    await flush(); await flush();
  } finally { fake.failures.transaction = false; }
  assert.match(h.$('account-status').textContent,/could not be saved; try again later/,'friendly error when the save fails');
  assert(!fake.store.has('leaderboards/global/scores/u2'),'nothing written on failure');
  assert.equal(JSON.parse(h.memory.get('fv.snake.history.v1'))[0].score,50,'game kept in device history');
  console.log('PASS firebase failures: 20 s load timeout falls back to guest mode, failed record save shows a friendly error');
}
function vendorTests() {
  const crypto = require('node:crypto'), path = require('node:path');
  const dir = path.join(__dirname,'..','vendor','firebase','13.4.0');
  const readme = fs.readFileSync(path.join(__dirname,'..','vendor','firebase','README.md'),'utf8');
  for (const name of ['app','auth','firestore']) {
    const file = `firebase-${name}.js`, code = fs.readFileSync(path.join(dir,file));
    const text = code.toString('utf8');
    assert(!/(from|import)\s*\(?\s*["']https?:/.test(text),`${file} has no remote imports`);
    if (name !== 'app') assert(text.includes('from"./firebase-app.js"'),`${file} imports app relatively`);
    const sha = crypto.createHash('sha256').update(code).digest('hex');
    assert(new RegExp(`${file}\\s*\\|[^\\n]*${sha}`).test(readme),`${file} sha256 matches vendor/firebase/README.md`);
  }
  for (const page of ['Challenge.html','snake.js']) assert(!fs.readFileSync(path.join(__dirname,'..',page),'utf8').includes('gstatic.com/firebasejs'),`${page} does not reference the Firebase CDN`);
  console.log('PASS vendor: Firebase 13.4.0 modules self-hosted, relative imports, sha256 documented');
}
async function vendorModuleTests() {
  // Load the real vendored SDK (the import graph must resolve locally) and check what snake.js uses.
  const {pathToFileURL} = require('node:url'), path = require('node:path');
  const load = name => import(pathToFileURL(path.join(__dirname,'..','vendor','firebase','13.4.0',`firebase-${name}.js`)).href);
  const [app,auth,firestore] = await Promise.all(['app','auth','firestore'].map(load));
  assert.equal(app.SDK_VERSION,'13.4.0');
  for (const name of ['initializeApp']) assert.equal(typeof app[name],'function',name);
  for (const name of ['getAuth','onAuthStateChanged','GoogleAuthProvider','signInWithPopup','signOut']) assert.equal(typeof auth[name],'function',name);
  for (const name of ['getFirestore','collection','doc','query','orderBy','limit','getDocs','runTransaction']) assert.equal(typeof firestore[name],'function',name);
  const db = firestore.getFirestore(app.initializeApp({apiKey:'test',projectId:'demo-test',appId:'1:1:web:1'},'vendor-test'));
  assert.equal(firestore.doc(db,'leaderboards','global','scores','u1').path,'leaderboards/global/scores/u1');
  console.log('PASS vendor modules: real SDK 13.4.0 loads offline and exports every function snake.js uses');
}
engineTests(); vendorTests();
vendorModuleTests().then(interfaceTests).then(firebaseTests).then(firebaseFailureTests).catch(error => {console.error(error);process.exitCode=1;});
