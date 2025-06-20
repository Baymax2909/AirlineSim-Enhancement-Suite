# IndexedDB Console Operations

---

### Load All Objects from an Object Store

This snippet fetches all objects stored in a specific IndexedDB database and object store.

Replace `yourDatabaseName` and `yourObjectStoreName` with the actual names.

```js
new Promise((resolve, reject) => {
    const req = indexedDB.open('yourDatabaseName');
    req.onerror = e => reject(e.target.error);
    req.onsuccess = e => {
        const db = e.target.result;
        const tx = db.transaction('yourObjectStoreName', 'readonly');
        const store = tx.objectStore('yourObjectStoreName');
        const allObjects = [];
        store.openCursor().onsuccess = event => {
            const cursor = event.target.result;
            if (cursor) {
                allObjects.push(cursor.value);
                cursor.continue();
            } else {
                resolve(allObjects);
                db.close();
            }
        };
        store.openCursor().onerror = e => reject(e.target.error);
    };
}).then(data => console.log(data)).catch(err => console.error(err));
```

### Get All ObjectStores from all IndexedDB

This snippet fetches **all object stores** from all IndexedDB database.

```js
indexedDB.databases().then(dbs => {
    dbs.forEach(async dbInfo => {
        const dbName = dbInfo.name;
        if (!dbName) return; // skip if name is null or undefined
        let req = indexedDB.open(dbName);
        req.onsuccess = event => {
            const db = event.target.result;
            const objectStores = [...db.objectStoreNames];
            console.log(`DB: ${dbName}, Object Stores:`, objectStores);
            db.close();
        };
        req.onerror = () => {
            console.error(`Failed to open DB: ${dbName}`);
        };
    });
});

```
### Delete All IndexedDB Databases

This snippet deletes **all IndexedDB databases** available in the current origin.

```js
indexedDB.databases().then(dbs => {
    dbs.forEach(dbInfo => {
        console.log(`Deleting DB: ${dbInfo.name}`);
        indexedDB.deleteDatabase(dbInfo.name);
    });
});
```
