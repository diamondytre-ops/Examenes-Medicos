// db.js - Gestión de IndexedDB para MediSys
const DB_NAME = 'MediSysDB';
const DB_VERSION = 1;
let dbInstance = null;

const initDB = () => {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Error al abrir IndexedDB:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // 1. pacientes
            if (!db.objectStoreNames.contains('pacientes')) {
                db.createObjectStore('pacientes', { keyPath: 'id', autoIncrement: true });
            }
            // 2. historiales
            if (!db.objectStoreNames.contains('historiales')) {
                const historialesStore = db.createObjectStore('historiales', { keyPath: 'id' });
                historialesStore.createIndex('fecha', 'fecha', { unique: false });
                historialesStore.createIndex('tipoFormulario', 'tipoFormulario', { unique: false });
                historialesStore.createIndex('nombre', 'nombre', { unique: false });
            }
            // 3. pdfs (para guardar los base64 grandes separadamente si es necesario, o integrados en historiales)
            // Se guardarán integrados en historiales por facilidad (pdfBase64), pero creamos el store por si acaso.
            if (!db.objectStoreNames.contains('pdfs')) {
                db.createObjectStore('pdfs', { keyPath: 'id' });
            }
            // 4. citas
            if (!db.objectStoreNames.contains('citas')) {
                db.createObjectStore('citas', { keyPath: 'id' });
            }
            // 5. audiometrias
            if (!db.objectStoreNames.contains('audiometrias')) {
                db.createObjectStore('audiometrias', { keyPath: 'id' });
            }
        };
    });
};

const saveRecord = async (storeName, data) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const getAllRecords = async (storeName) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const getRecordById = async (storeName, id) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const deleteRecord = async (storeName, id) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const clearStore = async (storeName) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Auto-inicializar DB al cargar el script
initDB().then(() => console.log('IndexedDB iniciada correctamente')).catch(console.error);
