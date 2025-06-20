export const GameWorldDB = (() => {
    let db = null;

    async function openDb(serverName, storeName, version = 1) {
        if (db) return db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(`${serverName}`, version);
            request.onupgradeneeded = (evt) => {
                db = evt.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: 'id' });
                }
            };
            request.onsuccess = (evt) => {
                db = evt.target.result;
                console.log(`Database opened: ${db.name}`);
                resolve(db);
            };
            request.onerror = (evt) => {
                console.error("IndexedDB open failed", evt.target.error);
                reject(evt.target.error);
            };
        });
    }

    function getObjectStore(storeName, mode = "readonly") {
        return db.transaction(storeName, mode).objectStore(storeName);
    }

    return { openDb, getObjectStore };
})();
