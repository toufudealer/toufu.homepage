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

// --- IndexedDB Helper for Storing Large Data (Custom Backgrounds) ---
const DB_NAME = 'NewTabDB';
const DB_VERSION = 5; // Arama geçmişi için yeni store eklendi.
const IMG_STORE_NAME = 'customImages';
const FAVICON_STORE_NAME = 'favicons';
const RSS_CACHE_STORE_NAME = 'rssCache';
const THEME_STORE_NAME = 'customThemes';
const SEARCH_HISTORY_STORE_NAME = 'searchHistory';
const MAX_HISTORY_SIZE = 20;
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
        if (!dbInstance.objectStoreNames.contains(SEARCH_HISTORY_STORE_NAME)) {
          // Sorgunun küçük harfli halini anahtar olarak kullanacağız.
          const historyStore = dbInstance.createObjectStore(SEARCH_HISTORY_STORE_NAME, { keyPath: 'lowerCaseQuery' });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        resolve(db);
      };

      request.onerror = (event) => reject('IndexedDB error: ' + event.target.errorCode);
    });
}

/**
 * Uygulama ilk açıldığında eski verileri yeni sisteme taşır.
 */
export async function migrateIfNeeded() {
    await migrateSearchHistory();
}

/**
 * Arama geçmişini localStorage'dan IndexedDB'ye taşır.
 * Bu fonksiyon sadece bir kez çalışır.
 */
async function migrateSearchHistory() {
    const MIGRATION_FLAG = 'search_history_migrated_to_idb';
    const OLD_KEY = 'searchHistory';

    if (localStorage.getItem(MIGRATION_FLAG)) {
        return; // Taşıma zaten yapılmış.
    }

    const oldHistory = getStoredJSON(OLD_KEY, []);
    if (oldHistory.length === 0) {
        localStorage.setItem(MIGRATION_FLAG, 'true'); // Eski veri yok, yine de işaretle.
        return;
    }

    try {
        console.log('Arama geçmişi IndexedDB\'ye taşınıyor...');
        const dbInstance = await openDb();
        const transaction = dbInstance.transaction(SEARCH_HISTORY_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SEARCH_HISTORY_STORE_NAME);

        // Eski verileri yeni formata uygun şekilde ekle
        // En yeni arama en yüksek timestamp'e sahip olmalı
        const now = Date.now();
        for (let i = 0; i < oldHistory.length; i++) {
            const query = oldHistory[i];
            const entry = {
                lowerCaseQuery: query.toLowerCase(),
                query: query,
                timestamp: now - i // Sıralamayı korumak için farklı timestamp'ler
            };
            await promisifyRequest(store.put(entry));
        }

        // Taşıma tamamlandı, eski veriyi temizle ve bayrağı ayarla
        localStorage.removeItem(OLD_KEY);
        localStorage.setItem(MIGRATION_FLAG, 'true');
        console.log('Arama geçmişi başarıyla taşındı.');
    } catch (error) {
        console.error('Arama geçmişi taşınırken hata oluştu:', error);
    }
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

export async function addSearchHistory(query) {
    const lowerCaseQuery = query.toLowerCase();
    const timestamp = Date.now();
    
    const dbInstance = await openDb();
    const transaction = dbInstance.transaction(SEARCH_HISTORY_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SEARCH_HISTORY_STORE_NAME);
    
    // Önce aynı sorgu varsa güncelle, yoksa ekle
    const entry = {
        lowerCaseQuery,
        query,
        timestamp
    };
    
    await promisifyRequest(store.put(entry));
    
    // Geçmiş boyutunu sınırla
    const index = store.index('timestamp');
    const allEntries = await promisifyRequest(index.getAll());
    
    if (allEntries.length > MAX_HISTORY_SIZE) {
        // En eski entry'leri sil
        const entriesToDelete = allEntries
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(0, allEntries.length - MAX_HISTORY_SIZE);
            
        for (const entry of entriesToDelete) {
            await promisifyRequest(store.delete(entry.lowerCaseQuery));
        }
    }
}

export async function getSearchHistory(limit = MAX_HISTORY_SIZE) {
    const dbInstance = await openDb();
    const transaction = dbInstance.transaction(SEARCH_HISTORY_STORE_NAME, 'readonly');
    const store = transaction.objectStore(SEARCH_HISTORY_STORE_NAME);
    const index = store.index('timestamp');
    
    // En yeni aramaları al
    const history = await promisifyRequest(index.getAll());
    return history
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit)
        .map(entry => entry.query);
}

export async function removeSearchFromHistory(query) {
    if (!query) return;
    const dbInstance = await openDb();
    const transaction = dbInstance.transaction(SEARCH_HISTORY_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SEARCH_HISTORY_STORE_NAME);
    return promisifyRequest(store.delete(query.toLowerCase()));
}

export async function clearSearchHistory() {
    const dbInstance = await openDb();
    const transaction = dbInstance.transaction(SEARCH_HISTORY_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SEARCH_HISTORY_STORE_NAME);
    return promisifyRequest(store.clear());
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