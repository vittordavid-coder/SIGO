// Database helper for offline storage (IndexedDB)
// Ensures offline photos and records are stored reliably without quota limits

const DB_NAME = 'SyneraMobileDB';
const DB_VERSION = 1;
const STORE_FIELD_REPORTS = 'field_reports';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not available'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_FIELD_REPORTS)) {
        db.createObjectStore(STORE_FIELD_REPORTS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveFieldReportToIDB(report: any): Promise<void> {
  if (!report || !report.id) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_FIELD_REPORTS, 'readwrite');
    tx.objectStore(STORE_FIELD_REPORTS).put(report);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {
    console.warn('[IDB] Error saving report:', e);
  }
}

export async function saveMultipleFieldReportsToIDB(reports: any[]): Promise<void> {
  if (!Array.isArray(reports) || reports.length === 0) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_FIELD_REPORTS, 'readwrite');
    const store = tx.objectStore(STORE_FIELD_REPORTS);
    reports.forEach(r => {
      if (r && r.id) store.put(r);
    });
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {
    console.warn('[IDB] Error saving multiple reports:', e);
  }
}

export async function getAllFieldReportsFromIDB(): Promise<any[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_FIELD_REPORTS, 'readonly');
    const store = tx.objectStore(STORE_FIELD_REPORTS);
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch (e) {
    console.warn('[IDB] Error reading reports:', e);
    return [];
  }
}

export async function deleteFieldReportFromIDB(id: string): Promise<void> {
  if (!id) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_FIELD_REPORTS, 'readwrite');
    tx.objectStore(STORE_FIELD_REPORTS).delete(id);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {
    console.warn('[IDB] Error deleting report:', e);
  }
}
