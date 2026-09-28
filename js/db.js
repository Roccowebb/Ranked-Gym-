// Storage: IndexedDB key-value store, with a localStorage fallback.

const DB_NAME = 'ranked-gym';
const STORE = 'kv';
const LS_PREFIX = 'rg:';

let idb = null;
export let usingFallback = false;

function openIdb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in self)) return reject(new Error('No IndexedDB'));
    const timer = setTimeout(() => reject(new Error('IndexedDB timed out')), 3000);
    let req;
    try { req = indexedDB.open(DB_NAME, 1); } catch (e) { clearTimeout(timer); return reject(e); }
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => { clearTimeout(timer); resolve(req.result); };
    req.onerror = () => { clearTimeout(timer); reject(req.error); };
  });
}

export async function init() {
  try {
    idb = await openIdb();
  } catch {
    idb = null;
    usingFallback = true;
  }
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
}

function tx(mode, fn) {
  return new Promise((resolve, reject) => {
    const t = idb.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const req = fn(store);
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function get(key) {
  if (idb) return tx('readonly', s => s.get(key));
  const raw = localStorage.getItem(LS_PREFIX + key);
  return raw == null ? undefined : JSON.parse(raw);
}

export async function set(key, value) {
  if (idb) return tx('readwrite', s => s.put(value, key));
  if (value === undefined) localStorage.removeItem(LS_PREFIX + key);
  else localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
}

export async function del(key) {
  if (idb) return tx('readwrite', s => s.delete(key));
  localStorage.removeItem(LS_PREFIX + key);
}

export async function clearAll() {
  if (idb) return tx('readwrite', s => s.clear());
  for (const k of Object.keys(localStorage)) if (k.startsWith(LS_PREFIX)) localStorage.removeItem(k);
}
