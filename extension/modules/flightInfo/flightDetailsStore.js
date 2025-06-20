import { GameWorldDB } from "../utils/db.js";

let STORE_NAME = "flightDetails";

export const FlightDetailsStore = {

    async save(serverName, flightId, flightData) {
        const db = await GameWorldDB.openDb(serverName, STORE_NAME);
        const store = GameWorldDB.getObjectStore(STORE_NAME, "readwrite");
        return new Promise((resolve, reject) => {
            const req = store.put({ id: flightId, data: flightData, savedAt: new Date().toISOString() });
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    },

    async load(serverName, flightId) {
        const db = await GameWorldDB.openDb(serverName, STORE_NAME);
        const store = GameWorldDB.getObjectStore(STORE_NAME, "readonly");
        return new Promise((resolve, reject) => {
            const req = store.get(flightId);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async delete(serverName, flightId) {
        const db = await GameWorldDB.openDb(serverName, STORE_NAME);
        const store = GameWorldDB.getObjectStore(STORE_NAME, "readwrite");
        return new Promise((resolve, reject) => {
            const req = store.delete(flightId);
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    },

    async clear(serverName) {
        const db = await GameWorldDB.openDb(serverName, STORE_NAME);
        const store = GameWorldDB.getObjectStore(STORE_NAME, "readwrite");
        return new Promise((resolve, reject) => {
            const req = store.clear();
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    },

    async listAll(serverName) {
        const db = await GameWorldDB.openDb(serverName, STORE_NAME);
        const store = GameWorldDB.getObjectStore(STORE_NAME, "readonly");
        return new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
};
