/**
 * localStorage'dan veriyi güvenli bir şekilde alır ve JSON olarak ayrıştırır.
 * @param {string} key - localStorage anahtarı.
 * @param {*} defaultValue - Veri bulunamazsa veya hata olursa dönecek varsayılan değer.
 * @returns {*} Ayrıştırılmış JSON nesnesi veya varsayılan değer.
 */
export function getStoredJSON(key, defaultValue) {
  const storedValue = localStorage.getItem(key);
  if (!storedValue) {
    return defaultValue;
  }
  try {
    return JSON.parse(storedValue);
  } catch (e) {
    console.error(`localStorage'dan "${key}" anahtarı için JSON ayrıştırılırken hata oluştu:`, e);
    return defaultValue;
  }
}

/**
 * Veriyi JSON'a çevirip localStorage'a kaydeder.
 * @param {string} key - localStorage anahtarı.
 * @param {*} value - Kaydedilecek değer.
 */
export function setStoredJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function getRssFeeds() {
    // Varsayılan olarak boş bir dizi döndür
    return getStoredJSON('rssFeeds', []);
}

export function saveRssFeeds(feeds) {
    setStoredJSON('rssFeeds', feeds);
}

export function getCustomWidgets() {
    return getStoredJSON('customWidgets', []);
}

export function saveCustomWidgets(widgets) {
    setStoredJSON('customWidgets', widgets);
}

const SEARCH_HISTORY_KEY = 'searchHistory';
const MAX_HISTORY_SIZE = 20;

export function getSearchHistory() {
    return getStoredJSON(SEARCH_HISTORY_KEY, []);
}

export function addSearchToHistory(query) {
    if (!query) return;
    let history = getSearchHistory();
    // Remove existing entry to move it to the top
    const lowerCaseQuery = query.toLowerCase();
    history = history.filter(item => item.toLowerCase() !== lowerCaseQuery);
    // Add new query to the beginning
    history.unshift(query);
    // Limit history size
    if (history.length > MAX_HISTORY_SIZE) {
        history.pop();
    }
    setStoredJSON(SEARCH_HISTORY_KEY, history);
}

export function removeSearchFromHistory(query) {
    if (!query) return;
    let history = getSearchHistory();
    const lowerCaseQuery = query.toLowerCase();
    history = history.filter(item => item.toLowerCase() !== lowerCaseQuery);
    setStoredJSON(SEARCH_HISTORY_KEY, history);
}

// --- IndexedDB Helper for Storing Large Data (Custom Backgrounds) ---
const DB_NAME = 'NewTabDB';
const DB_VERSION = 4; // Özel temalar için yeni store eklendi.
const IMG_STORE_NAME = 'customImages';
const FAVICON_STORE_NAME = 'favicons';
const RSS_CACHE_STORE_NAME = 'rssCache';
const THEME_STORE_NAME = 'customThemes';
let db;

// IDBRequest'i Promise'e çeviren yardımcı fonksiyon.
// Bu, veritabanı işlemlerinin bitmesini beklememizi (await) sağlar.
function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function openDb() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const dbInstance = event.target.result;
        if (!dbInstance.objectStoreNames.contains(IMG_STORE_NAME)) {
          dbInstance.createObjectStore(IMG_STORE_NAME, { autoIncrement: true });
        }
        if (!dbInstance.objectStoreNames.contains(FAVICON_STORE_NAME)) {
          dbInstance.createObjectStore(FAVICON_STORE_NAME);
        }
        if (!dbInstance.objectStoreNames.contains(RSS_CACHE_STORE_NAME)) {
          dbInstance.createObjectStore(RSS_CACHE_STORE_NAME);
        }
        if (!dbInstance.objectStoreNames.contains(THEME_STORE_NAME)) {
          dbInstance.createObjectStore(THEME_STORE_NAME, { keyPath: 'name' });
        }
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        resolve(db);
      };

      request.onerror = (event) => reject('IndexedDB error: ' + event.target.errorCode);
    });
}

export async function addCustomImage(value) {
    const dbInstance = await openDb();
    const transaction = dbInstance.transaction(IMG_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(IMG_STORE_NAME);
    return promisifyRequest(store.add(value));
}

export async function getAllCustomImages() {
    const dbInstance = await openDb();
    const transaction = dbInstance.transaction(IMG_STORE_NAME, 'readonly');
    const store = transaction.objectStore(IMG_STORE_NAME);
    const values = await promisifyRequest(store.getAll());
    const keys = await promisifyRequest(store.getAllKeys());
    return values.map((v, i) => ({ key: keys[i], value: v }));
}

export async function deleteCustomImage(key) {
    const dbInstance = await openDb();
    const transaction = dbInstance.transaction(IMG_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(IMG_STORE_NAME);
    return promisifyRequest(store.delete(key));
}

export async function clearCustomImagesDB() {
    const dbInstance = await openDb();
    const transaction = dbInstance.transaction(IMG_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(IMG_STORE_NAME);
    return promisifyRequest(store.clear());
}

export async function getFavicon(url) {
    const dbInstance = await openDb();
    const transaction = dbInstance.transaction(FAVICON_STORE_NAME, 'readonly');
    const store = transaction.objectStore(FAVICON_STORE_NAME);
    return promisifyRequest(store.get(url));
}

export async function setFavicon(url, base64data) {
    const dbInstance = await openDb();
    const transaction = dbInstance.transaction(FAVICON_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(FAVICON_STORE_NAME);
    return promisifyRequest(store.put(base64data, url));
}

export async function deleteFavicon(url) {
    const dbInstance = await openDb();
    const transaction = dbInstance.transaction(FAVICON_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(FAVICON_STORE_NAME);
    return promisifyRequest(store.delete(url));
}

export async function getRssCache(url) {
    const dbInstance = await openDb();
    const transaction = dbInstance.transaction(RSS_CACHE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(RSS_CACHE_STORE_NAME);
    return promisifyRequest(store.get(url));
}

export async function setRssCache(url, data) {
    const dbInstance = await openDb();
    const transaction = dbInstance.transaction(RSS_CACHE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(RSS_CACHE_STORE_NAME);
    return promisifyRequest(store.put(data, url));
}

export async function addCustomTheme(name, css) {
    const dbInstance = await openDb();
    const transaction = dbInstance.transaction(THEME_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(THEME_STORE_NAME);
    return promisifyRequest(store.put({ name, css }));
}

export async function getCustomTheme(name) {
    const dbInstance = await openDb();
    const transaction = dbInstance.transaction(THEME_STORE_NAME, 'readonly');
    const store = transaction.objectStore(THEME_STORE_NAME);
    return promisifyRequest(store.get(name));
}

export async function getAllCustomThemes() {
    const dbInstance = await openDb();
    const transaction = dbInstance.transaction(THEME_STORE_NAME, 'readonly');
    const store = transaction.objectStore(THEME_STORE_NAME);
    return promisifyRequest(store.getAll());
}

export async function deleteCustomTheme(name) {
    const dbInstance = await openDb();
    const transaction = dbInstance.transaction(THEME_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(THEME_STORE_NAME);
    return promisifyRequest(store.delete(name));
}

export function clearAllStorage() {
    localStorage.clear();

    // Veritabanı bağlantısını kapatarak silme işleminin engellenmesini önle
    if (db) {
        db.close();
        db = null; // Bağlantıyı sıfırla ki bir sonraki işlemde yeniden açılsın
    }

    // Tüm IndexedDB veritabanını sil. Bu, en temiz sıfırlama yöntemidir.
    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);

    return new Promise((resolve, reject) => {
        deleteRequest.onsuccess = () => {
            resolve();
        };
        deleteRequest.onerror = (event) => {
            console.error("Veritabanı silinirken hata oluştu:", event.target.error);
            reject(event.target.error);
        };
        deleteRequest.onblocked = () => {
            console.warn("Veritabanı silme işlemi engellendi. Lütfen bu sayfanın açık olduğu diğer sekmeleri kapatın.");
            resolve(); // Engellense bile devam et, sayfa yenilenince bağlantı kapanır.
        };
    });
}
