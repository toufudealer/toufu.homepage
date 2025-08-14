import * as dom from './dom.js';
import * as storage from './storage.js';

const THEME_KEY = 'pageTheme'; // 'light' or 'dark'
const CUSTOM_STYLE_ELEMENT_ID = 'custom-theme-style';
const ACTIVE_CUSTOM_THEME_KEY = 'activeCustomThemeName'; // Stores the name of the active custom theme

// --- State ---
let matrixModule = null; // This will hold the dynamically imported module

// --- Private Core Functions ---

/**
 * Dynamically loads and starts the Matrix effect.
 * This is a private helper function.
 */
async function _startMatrixEffect() {
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
 * Stops the Matrix effect if it's running.
 * This is a private helper function.
 */
function _stopMatrixEffect() {
    if (matrixModule) {
        matrixModule.stopMatrixRain();
    }
}

/**
 * The single source of truth for applying all theme-related settings.
 * It reads the current state from localStorage and updates the entire page theme.
 * This function should be called whenever a theme setting changes.
 */
async function _updateFullTheme() {
    // 1. Apply base theme (light/dark)
    const baseTheme = localStorage.getItem(THEME_KEY) || 'dark';
    document.documentElement.dataset.theme = baseTheme;
    if (dom.themeToggle) {
        dom.themeToggle.checked = baseTheme === 'light';
    }

    // 2. Apply custom theme (CSS injection)
    const activeThemeName = localStorage.getItem(ACTIVE_CUSTOM_THEME_KEY);
    let styleElement = document.getElementById(CUSTOM_STYLE_ELEMENT_ID);

    // Always stop effects before applying a new theme
    _stopMatrixEffect();

    if (activeThemeName) {
        const theme = await storage.getCustomTheme(activeThemeName);
        if (theme) {
            // Ensure the style element for custom CSS exists
            if (!styleElement) {
                styleElement = document.createElement('style');
                styleElement.id = CUSTOM_STYLE_ELEMENT_ID;
                document.head.appendChild(styleElement);
            }
            styleElement.textContent = theme.css;

            // Handle special JS effects for specific themes
            if (theme.name.toLowerCase().includes('matrix')) {
                await _startMatrixEffect();
            }
        } else {
            // The active theme was in localStorage but not found in the database.
            // This can happen if it was deleted. Let's clean up.
            console.warn(`Aktif tema "${activeThemeName}" veritabanında bulunamadı. Varsayılana dönülüyor.`);
            localStorage.removeItem(ACTIVE_CUSTOM_THEME_KEY);
            if (styleElement) styleElement.textContent = '';
        }
    } else {
        // No custom theme is active, ensure the style element is empty.
        if (styleElement) {
            styleElement.textContent = '';
        }
    }
}

// --- Public Functions for Settings Panel ---

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
 * This function now only updates the state in localStorage and calls the main update function.
 */
export async function setActiveTheme() {
    const themeName = dom.themeSelect.value;

    if (themeName) {
        localStorage.setItem(ACTIVE_CUSTOM_THEME_KEY, themeName);
    } else {
        // "Varsayılan Tema" is selected
        localStorage.removeItem(ACTIVE_CUSTOM_THEME_KEY);
    }

    // Apply the changes by calling the master update function
    await _updateFullTheme();

    // Efekt renklerinin güncellenmesi için bir olay tetikle
    document.dispatchEvent(new CustomEvent('themeChanged'));

    alert(`'${themeName || 'Varsayılan'}' tema aktif edildi.`);
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
        // If the deleted theme was the active one, remove it from localStorage
        if (localStorage.getItem(ACTIVE_CUSTOM_THEME_KEY) === themeName) {
            localStorage.removeItem(ACTIVE_CUSTOM_THEME_KEY);
        }

        await storage.deleteCustomTheme(themeName);
        await populateThemeDropdown(); // Refresh the dropdown
        await _updateFullTheme(); // Re-apply the theme (will revert to default if active was deleted)

        alert(`'${themeName}' teması silindi.`);
    }
}

// --- Initialization ---

/**
 * Initializes the theme functionality.
 * Reads the saved theme, applies it, and sets up the event listener.
 */
export async function initializeTheme() {
    // Set up the light/dark toggle listener
    dom.themeToggle.addEventListener('change', async () => {
        const newTheme = dom.themeToggle.checked ? 'light' : 'dark';
        // Save the new base theme setting
        localStorage.setItem(THEME_KEY, newTheme);
        // Re-apply the full theme to ensure consistency
        await _updateFullTheme();
        // Efekt renklerinin güncellenmesi için bir olay tetikle
        document.dispatchEvent(new CustomEvent('themeChanged'));
    });

    // Apply the full theme on startup, which handles both base and custom themes.
    await _updateFullTheme();

    // Populate the theme dropdown in settings
    await populateThemeDropdown();
}