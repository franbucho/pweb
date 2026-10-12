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

function harness({stored = null, storageError = false, signedIn = false, denyCamera = false} = {}) {
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
  vm.runInNewContext(fs.readFileSync(require.resolve('../snake.js'),'utf8'),sandbox);
  return {$, document, listeners, engines, memory, intervals, timeouts, cameraRequests: () => cameraRequests, stoppedTracks: () => stoppedTracks, closedTrackers: () => closedTrackers, face: nose => faceCallback({multiFaceLandmarks:[[null,null,null,null,nose]]}), advance: n => {now += n;}, tick: () => [...intervals.values()].forEach(fn => fn())};
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
engineTests(); interfaceTests().catch(error => {console.error(error);process.exitCode=1;});
