// Large guide media outgrows localStorage. Keep legacy localStorage when it fits,
// and use IndexedDB only as a quota fallback. The marker avoids stale fallback restores.
const marker = "binksy-projects-indexeddb";
async function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("binksy-project-media", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("snapshots");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readProjects() {
  const local = JSON.parse(localStorage.getItem("binksy-logo-system") || "[]");
  if (
    localStorage.getItem(marker) !== "active" &&
    local?.storage !== "indexeddb"
  )
    return local;
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const r = db
        .transaction("snapshots")
        .objectStore("snapshots")
        .get("projects");
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
async function writeProjects(projects) {
  try {
    localStorage.setItem("binksy-logo-system", JSON.stringify(projects));
    localStorage.removeItem(marker);
    return;
  } catch (error) {
    if (error.name !== "QuotaExceededError") throw error;
  }
  const db = await database();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction("snapshots", "readwrite");
      tx.objectStore("snapshots").put(projects, "projects");
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    // Replace the old large snapshot atomically; a separate marker could exceed the quota.
    localStorage.setItem(
      "binksy-logo-system",
      JSON.stringify({ storage: "indexeddb" }),
    );
    localStorage.removeItem(marker);
  } finally {
    db.close();
  }
}

let pending = Promise.resolve();
export function storeProjects(projects) {
  const snapshot = structuredClone(projects);
  const job = pending.catch(() => {}).then(() => writeProjects(snapshot));
  pending = job;
  return job;
}
