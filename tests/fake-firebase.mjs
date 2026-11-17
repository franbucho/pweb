// Minimal stand-in for the Firebase modular SDK used by tests/snake.test.cjs.
export const log = [];
export const store = new Map();
let authCallback = null;

export function initializeApp(config) { log.push(['initializeApp', config]); return {name: 'app'}; }
export function getAuth(app) { log.push(['getAuth', app.name]); return {kind: 'auth'}; }
export function getFirestore(app) { log.push(['getFirestore', app.name]); return {kind: 'db'}; }
export function onAuthStateChanged(auth, callback) { log.push(['onAuthStateChanged', auth.kind]); authCallback = callback; }
export function signIn(user) { authCallback(user); }
export class GoogleAuthProvider {}
export async function signInWithPopup(auth, provider) { log.push(['signInWithPopup', auth.kind, provider instanceof GoogleAuthProvider]); }
export async function signOut(auth) { log.push(['signOut', auth.kind]); }
export function collection(db, ...path) { return {db, path: path.join('/')}; }
export function doc(db, ...path) { return {db, path: path.join('/')}; }
export function orderBy(field, dir) { return {orderBy: [field, dir]}; }
export function limit(n) { return {limit: n}; }
export function query(ref, ...constraints) { return {ref, constraints}; }
export async function getDocs(q) {
  log.push(['getDocs', q.ref.path, q.constraints]);
  return {docs: [...store.values()].map(data => ({data: () => data}))};
}
export async function runTransaction(db, fn) {
  log.push(['runTransaction', db.kind]);
  return fn({
    get: async ref => ({exists: () => store.has(ref.path), data: () => store.get(ref.path)}),
    set: (ref, data, options) => { log.push(['set', ref.path, options]); store.set(ref.path, {...store.get(ref.path), ...data}); }
  });
}
