/**
 * toufu.homepage - Tema Yönetim Modülü
 * Bu modül, chrome.scripting API'sini kullanarak temaları yönetir.
 */

// Depolama alanında kullanılacak anahtarlar
const THEME_STORAGE_KEY = 'toufu_themes'; // Tüm temaların CSS içeriğini saklar
const ACTIVE_THEME_STORAGE_KEY = 'toufu_active_theme'; // Aktif temanın adını saklar

// Sayfaya enjekte edilen stil etiketine verilecek benzersiz ID'nin ön eki
const INJECTED_STYLE_ID_PREFIX = 'toufu-theme-';

/**
 * Mevcut aktif sekmenin ID'sini asenkron olarak alır.
 * @returns {Promise<number|null>} Aktif sekmenin ID'si veya bulunamazsa null.
 */
async function getCurrentTabId() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab?.id || null;
    } catch (error) {
        console.error("Hata: Aktif sekme sorgulanamadı.", error);
        return null;
    }
}

/**
 * Sayfaya daha önce enjekte edilmiş özel bir temayı kaldırır.
 * @param {number} tabId - CSS'in kaldırılacağı sekmenin ID'si.
 */
async function clearExistingTheme(tabId) {
    try {
        // Hangi temayı kaldıracağımızı bilmek için depolama alanından aktif temanın adını okuruz.
        const data = await chrome.storage.local.get(ACTIVE_THEME_STORAGE_KEY);
        const activeThemeName = data[ACTIVE_THEME_STORAGE_KEY];

        if (activeThemeName) {
            const styleId = INJECTED_STYLE_ID_PREFIX + activeThemeName;
            await chrome.scripting.removeCSS({
                target: { tabId },
                id: styleId,
            });
            console.log(`Eski tema ('${activeThemeName}') kaldırıldı.`);
        }
    } catch (e) {
        // Sayfa yenilendiğinde veya stil zaten yoksa hata alabiliriz. Bu normal bir durumdur.
        // Bu hatayı konsolda göstermeye gerek yok.
    }
}

/**
 * Belirtilen temayı ismine göre bulur ve CSS'ini sayfaya enjekte eder.
 * @param {string | null} themeName - Uygulanacak temanın adı. Varsayılana dönmek için null.
 */
export async function applyTheme(themeName) {
    const tabId = await getCurrentTabId();
    if (!tabId) {
        console.error("Tema uygulanamadı: Aktif sekme bulunamadı.");
        return;
    }

    // Her zaman önce mevcut temayı temizle.
    await clearExistingTheme(tabId);

    // Eğer `themeName` boş ise, varsayılan temaya dönülüyor demektir.
    if (!themeName) {
        await chrome.storage.local.remove(ACTIVE_THEME_STORAGE_KEY);
        console.log("Varsayılan temaya dönüldü.");
        return;
    }

    // Yeni temanın CSS içeriğini depolama alanından al.
    const data = await chrome.storage.local.get(THEME_STORAGE_KEY);
    const allThemes = data[THEME_STORAGE_KEY] || {};
    const cssContent = allThemes[themeName];

    if (!cssContent) {
        console.error(`Tema bulunamadı: '${themeName}'`);
        return;
    }

    // Yeni temanın CSS'ini sayfaya enjekte et.
    try {
        const styleId = INJECTED_STYLE_ID_PREFIX + themeName;
        await chrome.scripting.insertCSS({
            target: { tabId },
            css: cssContent,
            id: styleId, // Daha sonra kaldırabilmek için benzersiz bir ID veriyoruz.
        });

        // Yeni aktif temanın adını kaydet.
        await chrome.storage.local.set({ [ACTIVE_THEME_STORAGE_KEY]: themeName });
        console.log(`Tema başarıyla uygulandı: '${themeName}'`);
    } catch (error) {
        console.error(`'${themeName}' temasının CSS'i enjekte edilirken hata oluştu:`, error);
        alert(`'${themeName}' teması uygulanırken bir hata oluştu. Lütfen konsolu kontrol edin.`);
    }
}

/**
 * Sayfa ilk yüklendiğinde, kayıtlı olan aktif temayı bulup uygular.
 */
export async function loadAndApplyInitialTheme() {
    try {
        const data = await chrome.storage.local.get(ACTIVE_THEME_STORAGE_KEY);
        const activeThemeName = data[ACTIVE_THEME_STORAGE_KEY];
        if (activeThemeName) {
            // `applyTheme` fonksiyonu hem CSS'i enjekte eder hem de durumu yönetir.
            await applyTheme(activeThemeName);
        }
    } catch (error) {
        console.error("Başlangıç teması yüklenirken hata oluştu:", error);
    }
}