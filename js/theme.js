import * as dom from './dom.js';
import * as storage from './storage.js';

const THEME_KEY = 'pageTheme'; // 'light' or 'dark'
const CUSTOM_STYLE_ELEMENT_ID = 'custom-theme-style';
const ACTIVE_CUSTOM_THEME_KEY = 'activeCustomThemeName'; // Stores the name of the active custom theme
let matrixModule = null; // Dinamik olarak yüklenecek Matrix efekti modülü

/**
 * Matrix efektini dinamik olarak yükler ve başlatır.
 */
async function startMatrixEffect() {
    if (!matrixModule) {
        try {
            // Path must be relative to the extension's root
            matrixModule = await import('/skins/js/matrix.js');
        } catch (e) {
            console.error("Matrix effect module could not be loaded.", e);
            return;
        }
    }
    matrixModule.startMatrixRain();
}

/**
 * Yüklü ise Matrix efektini durdurur.
 */
function stopMatrixEffect() {
    if (matrixModule) {
        matrixModule.stopMatrixRain();
    }
}

/**
 * Applies the given theme to the document and updates the toggle switch.
 * @param {string} theme - The theme to apply ('light' or 'dark').
 */
function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    if (dom.themeToggle) {
        dom.themeToggle.checked = theme === 'light';
    }
}

/**
 * Saves the selected theme to localStorage.
 * @param {string} theme - The theme to save.
 */
function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

/**
 * Injects or updates the custom CSS on the page.
 * @param {string} cssString - The custom CSS to apply.
 */
function applyCustomCss(cssString) {
    let styleElement = document.getElementById(CUSTOM_STYLE_ELEMENT_ID);
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = CUSTOM_STYLE_ELEMENT_ID;
        document.head.appendChild(styleElement);
    }
    styleElement.textContent = cssString;
}

/**
 * Populates the theme dropdown in settings with saved themes.
 */
export async function populateThemeDropdown() {
    const themes = await storage.getAllCustomThemes();
    dom.themeSelect.innerHTML = '<option value="">Varsayılan Tema</option>'; // Reset
    themes.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme.name;
        option.textContent = theme.name;
        dom.themeSelect.appendChild(option);
    });

    // Set the dropdown to the currently active theme
    const activeThemeName = localStorage.getItem(ACTIVE_CUSTOM_THEME_KEY) || '';
    dom.themeSelect.value = activeThemeName;

    // Also update the textarea with the selected theme's content
    updateThemePreview();
}

/**
 * Updates the readonly textarea with the content of the selected theme.
 */
export async function updateThemePreview() {
    const selectedThemeName = dom.themeSelect.value;
    if (selectedThemeName) {
        const theme = await storage.getCustomTheme(selectedThemeName);
        dom.customCssInput.value = theme ? theme.css : 'Tema bulunamadı.';
    } else {
        dom.customCssInput.value = 'Varsayılan tema seçili. Önizleme yok.';
    }
}

/**
 * Sets the selected theme from the dropdown as the active one.
 */
export async function setActiveTheme() {
    const themeName = dom.themeSelect.value;
    if (themeName) {
        const theme = await storage.getCustomTheme(themeName);
        if (theme) {
            applyCustomCss(theme.css);
            localStorage.setItem(ACTIVE_CUSTOM_THEME_KEY, themeName);

            // Efekti tema ismine göre başlat/durdur
            if (themeName.toLowerCase() === 'matrix') {
                await startMatrixEffect();
            } else {
                stopMatrixEffect();
            }

            alert(`'${themeName}' teması aktif edildi.`);
        }
    } else {
        // "Varsayılan Tema" is selected
        applyCustomCss('');
        localStorage.removeItem(ACTIVE_CUSTOM_THEME_KEY);
        stopMatrixEffect(); // Varsayılan temaya dönüldüğünde efekti durdur
        alert('Varsayılan tema aktif edildi.');
    }
}

/**
 * Deletes the currently selected theme from the dropdown.
 */
export async function deleteSelectedTheme() {
    const themeName = dom.themeSelect.value;
    if (!themeName) {
        alert('Lütfen silmek için bir tema seçin.');
        return;
    }

    if (confirm(`'${themeName}' adlı temayı kalıcı olarak silmek istediğinizden emin misiniz?`)) {
        await storage.deleteCustomTheme(themeName);

        // If the deleted theme was the active one, revert to default
        if (localStorage.getItem(ACTIVE_CUSTOM_THEME_KEY) === themeName) {
            applyCustomCss('');
            localStorage.removeItem(ACTIVE_CUSTOM_THEME_KEY);
        }

        await populateThemeDropdown(); // Refresh the dropdown
        alert(`'${themeName}' teması silindi.`);
    }
}

/**
 * Imports a .css file, saves it to IndexedDB, and refreshes the dropdown.
 * @param {FileList} files The .css files to import.
 */
export function importAndSaveThemes(files) {
    if (!files || files.length === 0) {
        alert('Lütfen içe aktarılacak dosyaları seçin.');
        return;
    }

    const importPromises = Array.from(files).map(file => {
        return new Promise((resolve, reject) => {
            if (!file.name.endsWith('.css')) {
                // CSS olmayan dosyaları sessizce atla
                return resolve({ status: 'skipped', name: file.name });
            }

            const reader = new FileReader();
            reader.onload = async (event) => {
                const cssContent = event.target.result;
                const themeName = file.name.replace(/\.css$/, '');
                try {
                    await storage.addCustomTheme(themeName, cssContent);
                    resolve({ status: 'imported', name: themeName });
                } catch (error) {
                    console.error(`'${themeName}' teması kaydedilirken hata:`, error);
                    reject({ status: 'error', name: themeName });
                }
            };
            reader.onerror = (error) => {
                console.error(`'${file.name}' dosyası okunurken hata:`, error);
                reject({ status: 'error', name: file.name });
            };
            reader.readAsText(file);
        });
    });

    Promise.all(importPromises)
        .then(async (results) => {
            const importedCount = results.filter(r => r.status === 'imported').length;
            if (importedCount > 0) {
                await populateThemeDropdown(); // Dropdown'ı yenile
                alert(`${importedCount} tema başarıyla içe aktarıldı.`);
            } else {
                alert('Seçilen dosyalar arasında geçerli bir .css dosyası bulunamadı.');
            }
        })
        .catch(error => {
            console.error('Toplu tema aktarımı sırasında hata:', error);
            alert('Temalar içe aktarılırken bir hata oluştu. Lütfen konsolu kontrol edin.');
        });
}

/**
 * Initializes the theme functionality.
 * Reads the saved theme, applies it, and sets up the event listener.
 */
export async function initializeTheme() {
    // Apply light/dark mode
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    applyTheme(savedTheme);

    dom.themeToggle.addEventListener('change', () => {
        const newTheme = dom.themeToggle.checked ? 'light' : 'dark';
        applyTheme(newTheme);
        saveTheme(newTheme);
    });

    // Load and apply active custom theme on startup
    const activeThemeName = localStorage.getItem(ACTIVE_CUSTOM_THEME_KEY);
    if (activeThemeName) {
        const theme = await storage.getCustomTheme(activeThemeName);
        if (theme) {
            applyCustomCss(theme.css);
            // Sayfa açılışında da efekti başlat
            if (activeThemeName.toLowerCase() === 'matrix') {
                await startMatrixEffect();
            }
        } else {
            // Active theme was not found in DB, maybe deleted. Revert to default.
            localStorage.removeItem(ACTIVE_CUSTOM_THEME_KEY);
        }
    }

    // Populate the theme dropdown in settings
    await populateThemeDropdown();
}