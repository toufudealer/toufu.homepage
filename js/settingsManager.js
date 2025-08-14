import * as storage from './storage.js';

const SETTINGS_KEYS = [
    'pageTheme',
    'weatherLocation',
    'searchEngine',
    'userName',
    'rssFeeds',
    'backgroundSetting',
    'widgetVisibility',
    'customWidgets',
    'quickLinks',
    'activeCustomThemeName',
    'activeCustomThemeCss'
];

/**
 * Gathers all relevant settings from localStorage and IndexedDB.
 * @returns {Promise<object>} An object containing all user settings.
 */
async function getAllSettings() {
    const settings = {};
    // Get settings from localStorage
    SETTINGS_KEYS.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) {
            try {
                settings[key] = JSON.parse(value);
            } catch (e) {
                settings[key] = value;
            }
        }
    });

    // Get custom themes from IndexedDB
    settings.customThemes = await storage.getAllCustomThemes();

    return settings;
}

/**
 * Exports all settings to a JSON file and triggers a download.
 */
export async function exportSettings() {
    const settings = await getAllSettings();
    const jsonString = JSON.stringify(settings, null, 2); // Pretty print the JSON
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `toufu-homepage-settings-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Imports settings from a user-selected JSON file.
 * @param {File} file - The JSON file selected by the user.
 */
export function importSettings(file) {
    if (!file || !file.type.match('application/json')) {
        alert('Lütfen geçerli bir JSON dosyası seçin.');
        return;
    }

    const reader = new FileReader();

    reader.onload = async (event) => {
        try {
            const importedSettings = JSON.parse(event.target.result);
            let settingsApplied = 0;

            // Apply localStorage settings
            for (const key in importedSettings) {
                if (SETTINGS_KEYS.includes(key)) {
                    const valueToStore = typeof importedSettings[key] === 'object' ? JSON.stringify(importedSettings[key]) : importedSettings[key];
                    localStorage.setItem(key, valueToStore);
                    settingsApplied++;
                }
            }

            // Apply custom themes from IndexedDB
            if (Array.isArray(importedSettings.customThemes)) {
                for (const theme of importedSettings.customThemes) {
                    if (theme.name && theme.css) {
                        await storage.addCustomTheme(theme.name, theme.css);
                        settingsApplied++;
                    }
                }
            }

            if (settingsApplied > 0) {
                alert(`${settingsApplied} ayar ve tema başarıyla içe aktarıldı. Değişikliklerin tam olarak uygulanması için sayfa yeniden yüklenecek.`);
                location.reload();
            } else {
                alert('Dosya geçerli ayar içermiyor.');
            }
        } catch (error) {
            alert('Ayarlar dosyası okunurken bir hata oluştu. Lütfen dosyanın bozuk olmadığından emin olun.');
            console.error('Ayarları içe aktarma hatası:', error);
        }
    };

    reader.readAsText(file);
}