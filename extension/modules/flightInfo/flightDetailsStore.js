import { GameWorldDB } from "../utils/db.js";

let STORE_NAME = "flightDetails";

export const FlightDetailsStore = {

    async save(serverName, airlineId, flightId, flightData) {
        const db = await GameWorldDB.openDb(serverName, airlineId, STORE_NAME);
        const store = GameWorldDB.getObjectStore(STORE_NAME, "readwrite");

        return new Promise((resolve, reject) => {

            const getReq = store.get(flightId);
            getReq.onsuccess = () => {
                const existing = getReq.result || { flightId }; // Ensure the key exists
                const merged = { ...existing, ...flightData };

                const putReq = store.put(merged);
                putReq.onsuccess = () => resolve(merged);
                putReq.onerror = () => reject(putReq.error);
            };
            getReq.onerror = () => reject(getReq.error);
        });
    },

    async load(serverName, airlineId, flightId) {
        const db = await GameWorldDB.openDb(serverName, airlineId, STORE_NAME);
        const store = GameWorldDB.getObjectStore(STORE_NAME, "readonly");
        return new Promise((resolve, reject) => {
            const req = store.get(flightId);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    /**
     * Takes time boundaries to grab multiple flights from the database
     * @param serverName
     * @param airlineId
     * @param lowerBoundary {number} 202506221329 - 2025-06-22  13:29
     * @param upperBoundary {number} 202506241329 - 2025-06-24  13:29
     * @returns {Promise<unknown>}
     */
    async loadMultipleByTimeBoundaries(serverName, airlineId, lowerBoundary, upperBoundary) {
        const db = await GameWorldDB.openDb(serverName, airlineId, STORE_NAME);
        const store = GameWorldDB.getObjectStore(STORE_NAME, "readonly");
        return new Promise((resolve, reject) => {
            const range = IDBKeyRange.bound(lowerBoundary, upperBoundary)
            const index = store.index('departureTime');

            const req = index.getAll(range)
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async delete(serverName, airlineId, flightId) {
        const db = await GameWorldDB.openDb(serverName, airlineId, STORE_NAME);
        const store = GameWorldDB.getObjectStore(STORE_NAME, "readwrite");
        return new Promise((resolve, reject) => {
            const req = store.delete(flightId);
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    },

    async clear(serverName, airlineId) {
        const db = await GameWorldDB.openDb(serverName, airlineId, STORE_NAME);
        const store = GameWorldDB.getObjectStore(STORE_NAME, "readwrite");
        return new Promise((resolve, reject) => {
            const req = store.clear();
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    },

    async listAll(serverName, airlineId) {
        const db = await GameWorldDB.openDb(serverName, airlineId, STORE_NAME);
        const store = GameWorldDB.getObjectStore(STORE_NAME, "readonly");
        return new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
};
