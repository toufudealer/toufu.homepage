let translations = {};
let currentLanguage = 'tr'; // Default language

/**
 * Gets the preferred language from localStorage or browser settings.
 * @returns {string} The language code (e.g., 'en', 'tr').
 */
export function getLanguage() {
    const savedLang = localStorage.getItem('language');
    if (savedLang) {
        return savedLang;
    }
    // Return 'tr' if browser language is Turkish, otherwise 'en'
    return navigator.language.startsWith('tr') ? 'tr' : 'en';
}

/**
 * Fetches and loads the translation file for the current language.
 */
async function loadTranslations() {
    currentLanguage = getLanguage();
    try {
        const response = await fetch(`js/locales/${currentLanguage}.json`);
        if (!response.ok) {
            throw new Error(`Could not load ${currentLanguage}.json`);
        }
        translations = await response.json();
    } catch (error) {
        console.error("Translation file loading failed:", error);
        // Fallback to Turkish if the selected language file fails
        if (currentLanguage !== 'tr') {
            currentLanguage = 'tr';
            await loadTranslations();
        }
    }
}

/**
 * Translates a key into the currently loaded language.
 * @param {string} key The key to translate.
 * @returns {string} The translated string or the key itself if not found.
 */
export function translate(key) {
    return translations[key] || key;
}

/**
 * Applies translations to all DOM elements with a data-i18n-key attribute.
 */
export function applyTranslationsToPage() {
    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.getAttribute('data-i18n-key');
        const translation = translate(key);

        // Also update placeholder if it exists
        if (element.hasAttribute('placeholder')) {
            element.setAttribute('placeholder', translation);
        } else {
            element.textContent = translation;
        }
    });

    // Apply translations to title attributes
    document.querySelectorAll('[data-i18n-title-key]').forEach(element => {
        const key = element.getAttribute('data-i18n-title-key');
        element.setAttribute('title', translate(key));
    });

    // Special case for the main page title
    document.title = translate('title');
}


/**
 * Sets the application language, saves it, and reloads the page.
 * @param {string} lang The language code to set (e.g., 'en', 'tr').
 */
export async function setLanguage(lang) {
    localStorage.setItem('language', lang);
    await loadTranslations();
    applyTranslationsToPage();
    // Dispatch a custom event to notify other modules of the language change
    document.dispatchEvent(new CustomEvent('languageChanged'));
}

/**
 * Initializes the internationalization module.
 */
export async function initialize() {
    await loadTranslations();
    applyTranslationsToPage();
}
