export const GameWorldDB = (() => {
    let db = null;

    async function openDb(serverName, airlineId, storeName, version = 1) {
        if (db) return db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(`${serverName}` + `_airlineId_` + `${airlineId}`, version);
            request.onupgradeneeded = (evt) => {
                db = evt.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    const store = db.createObjectStore(storeName, { keyPath: 'flightId' });

                    switch (storeName) {
                        case 'flightDetails':
                            store.createIndex('departureTime', 'departureTime', { unique: false });
                            store.createIndex('arrivalTime', 'arrivalTime', { unique: false });
                            store.createIndex('origin', 'origin', { unique: false });
                            store.createIndex('destination', 'destination', { unique: false });
                            store.createIndex('origin_destination', ['origin', 'destination'], { unique: false });
                            break;
                    }
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
