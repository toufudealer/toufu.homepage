import * as dom from './dom.js';
import * as ui from './ui.js';
import * as storage from './storage.js';
import * as api from './api.js';
import * as config from './config.js';
import * as rss from './rss.js';
import * as widgets from './widgets.js';
import * as theme from './theme.js';
import * as settingsManager from './settingsManager.js';
import * as weatherEffects from './weatherEffects.js';
import { debounce, generateId } from './utils.js';
import { translate, initialize, setLanguage } from './i18n.js';

// --- Core Logic / "Controller" Functions ---

async function performSearch(query) {
    if (!query) return;
    await storage.addSearchHistory(query);
    const selectedEngineKey = localStorage.getItem('searchEngine') || 'google';
    const searchURLTemplate = config.searchEngines[selectedEngineKey].url;
    window.location.href = `${searchURLTemplate}${encodeURIComponent(query)}`;
}

async function loadWeather() {
    dom.weatherContainer.textContent = translate('loading');
    const data = await api.fetchWeather();
    if (data.error) {
        dom.weatherContainer.textContent = data.error;
        ui.setDetailedWeatherData(null);
        weatherEffects.stopAllEffects(); // Hata durumunda efektleri durdur
    } else {
        ui.displayWeather(data);
        ui.setDetailedWeatherData({ ...data.daily, locationName: data.locationNameForTitle });
        weatherEffects.startEffectByWeatherCode(data.current.weathercode); // Hava koduna göre efekti başlat
    }
}

async function handleAutocomplete(query) {
    if (!query) {
        ui.clearSuggestions();
        return;
    }

    // Fetch API suggestions in parallel
    const apiSuggestionsPromise = api.fetchAutocompleteSuggestions(query);

    // Get local history suggestions
    const searchHistory = await storage.getSearchHistory();
    const historySuggestions = searchHistory.filter(item =>
        item.toLowerCase().includes(query.toLowerCase()) && item.toLowerCase() !== query.toLowerCase()
    );

    const apiSuggestions = await apiSuggestionsPromise;

    // Combine and remove duplicates, giving priority to history
    const combined = [
        ...historySuggestions.map(s => ({ text: s, type: 'history' })),
        ...apiSuggestions.map(s => ({ text: s, type: 'api' }))
    ];

    const uniqueSuggestions = combined.filter((suggestion, index, self) =>
        index === self.findIndex((s) => s.text.toLowerCase() === suggestion.text.toLowerCase())
    );

    ui.renderSuggestions(uniqueSuggestions.slice(0, 10), performSearch); // Limit to 10 total suggestions
}

// --- Event Listeners Setup ---

function addEventListeners() {
    // Search
    dom.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        performSearch(dom.searchInput.value.trim());
    });

    // Autocomplete
    const debouncedAutocomplete = debounce(handleAutocomplete, 200);
    dom.searchInput.addEventListener('input', () => debouncedAutocomplete(dom.searchInput.value.trim()));
    dom.searchInput.addEventListener('keydown', (e) => ui.handleKeyboardNavigation(e, performSearch));
    dom.searchInput.addEventListener('focus', () => debouncedAutocomplete(dom.searchInput.value.trim()));
    document.addEventListener('click', (e) => {
        if (!dom.searchContainer.contains(e.target)) {
            ui.clearSuggestions();
        }
    });

    // Modals & Panels
    dom.settingsBtn.addEventListener('click', ui.toggleSettingsPanel);
    dom.closeSettingsBtn.addEventListener('click', ui.toggleSettingsPanel);
    dom.weatherContainer.addEventListener('click', () => {
        if (ui.getDetailedWeatherData()) {
            ui.renderWeatherModal();
        }
    });
    if (dom.rssExpandBtn) {
        dom.rssExpandBtn.addEventListener('click', ui.toggleRssWidgetExpansion);
    }

    // Close modals/panels when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            ui.closeModal(event.target);
        }
        // Context menü dışına tıklanınca kapat
        if (!event.target.closest('#context-menu')) {
            ui.hideContextMenu();
        }

        if (dom.settingsPanel.classList.contains('open') &&
            !dom.settingsPanel.contains(event.target) &&
            !event.target.closest('#settings-btn')) {
            ui.toggleSettingsPanel();
        }
    });

    // Close modals with their specific buttons
    dom.addLinkModalCloseBtn.addEventListener('click', () => ui.closeModal(dom.modal));
    dom.closeWeatherModalBtn.addEventListener('click', () => ui.closeModal(dom.weatherModal));
    dom.editLinkModalCloseBtn.addEventListener('click', () => ui.closeModal(dom.editLinkModal));

    // Context Menu Actions
    dom.contextMenuEdit.addEventListener('click', () => {
        const linkId = dom.contextMenu.dataset.linkId;
        if (linkId) {
            ui.openEditModalForLink(linkId);
            ui.hideContextMenu();
        }
    });

    dom.contextMenuDelete.addEventListener('click', () => {
        const linkId = dom.contextMenu.dataset.linkId;
        if (linkId) {
            if (confirm(translate('delete_link_confirmation'))) {
                ui.deleteLink(linkId);
            }
            ui.hideContextMenu();
        }
    });

    // Edit Link Form
    dom.editLinkForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = dom.editLinkIdInput.value;
        const name = dom.editLinkNameInput.value.trim();
        const url = dom.editLinkUrlInput.value.trim();

        if (id && name && url) {
            ui.editLink(id, name, url);
            ui.closeModal(dom.editLinkModal);
        }
    });

    // RSS Akışı Ekleme Formu
    dom.addRssFeedForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = dom.rssNameInput.value.trim();
        const url = dom.rssUrlInput.value.trim();

        if (url) {
            const feeds = storage.getRssFeeds();
            feeds.push({
                id: generateId('rss'),
                name: name || url,
                url: url
            });
            storage.saveRssFeeds(feeds);
            
            ui.renderRssFeedsList();
            rss.initializeRss();
            dom.addRssFeedForm.reset();
        }
    });

    // Toplu RSS Ekleme
    dom.bulkAddRssBtn.addEventListener('click', () => {
        const urlsText = dom.bulkRssInput.value.trim();
        if (urlsText) {
            ui.addBulkRssFeeds(urlsText);
            dom.bulkRssInput.value = ''; // İşlem sonrası metin alanını temizle
        }
    });

    // Tüm RSS akışlarını temizleme
    dom.clearRssFeedsBtn.addEventListener('click', () => {
        if (confirm(translate('clear_all_rss_confirmation'))) {
            storage.saveRssFeeds([]); // Depolamadan temizle
            ui.renderRssFeedsList(); // Ayarlar panelindeki listeyi güncelle
            rss.initializeRss(); // Ana RSS widget'ını gizle/güncelle
        }
    });

    // Özel Widget Ekleme Formu
    dom.addCustomWidgetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = dom.customWidgetNameInput.value.trim();
        const url = dom.customWidgetUrlInput.value.trim();

        if (name && url) {
            ui.addCustomWidget(name, url);
            dom.addCustomWidgetForm.reset();
        }
    });

    // Settings Panel Forms
    dom.locationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const city = dom.locationInput.value.trim();
        const countryCode = dom.countrySelect.value;
        if (city && countryCode) {
            storage.setStoredJSON('weatherLocation', { city, country: countryCode });
        } else {
            localStorage.removeItem('weatherLocation');
        }
        loadWeather();
        ui.toggleSettingsPanel();
    });

    dom.searchEngineSelect.addEventListener('change', () => {
        localStorage.setItem('searchEngine', dom.searchEngineSelect.value);
        ui.updateSearchPlaceholder();
    });

    dom.languageSelect.addEventListener('change', (e) => {
        setLanguage(e.target.value);
    });

    dom.userNameInput.addEventListener('input', () => {
        const name = dom.userNameInput.value.trim();
        if (name) localStorage.setItem('userName', name);
        else localStorage.removeItem('userName');
        ui.updateGreeting();
    });

    dom.backgroundForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const source = dom.backgroundSourceSelect.value;
        let setting = { type: 'none', value: '' };

        if (source === 'url') {
            setting = { type: 'url', value: dom.backgroundUrlInput.value.trim() };
        } else if (source === 'bing' || source === 'custom') {
            setting = { type: source, value: '' };
        }

        storage.setStoredJSON('backgroundSetting', setting);
        ui.applyBackground();
        ui.toggleSettingsPanel();
    });

    dom.backgroundSourceSelect.addEventListener('change', ui.toggleBackgroundInputs);
    dom.backgroundCustomInput.addEventListener('change', ui.handleCustomImageUpload);
    dom.clearCustomImagesBtn.addEventListener('click', ui.clearCustomImages);

    // Hava durumu efektleri ayarı
    dom.weatherEffectsToggle.addEventListener('change', () => {
        storage.setStoredJSON('weatherEffectsEnabled', dom.weatherEffectsToggle.checked);
        if (!dom.weatherEffectsToggle.checked) {
            weatherEffects.stopAllEffects();
        }
        loadWeather(); // Ayar değiştiğinde efekti yeniden değerlendir
    });

    // Hava durumu debug ayarı
    dom.debugWeatherEffectSelect.addEventListener('change', () => {
        storage.setStoredJSON('debugWeatherEffect', dom.debugWeatherEffectSelect.value);
        loadWeather(); // Efekti hemen test etmek için hava durumunu yeniden yükle
    });

    dom.resetAllSettingsBtn.addEventListener('click', async () => {
        const isConfirmed = confirm(translate('reset_all_settings_confirmation'));

        if (isConfirmed) {
            try {
                await storage.clearAllStorage();
                alert(translate('reset_all_settings_success'));
                location.reload();
            } catch (error) {
                alert(translate('reset_all_settings_error'));
                console.error('Sıfırlama hatası:', error);
            }
        }
    });

    // Settings Import/Export
    dom.exportSettingsBtn.addEventListener('click', settingsManager.exportSettings);

    dom.importSettingsBtn.addEventListener('click', () => {
        dom.importSettingsInput.click(); // Trigger the hidden file input
    });

    dom.importSettingsInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            settingsManager.importSettings(file);
        }
        // Reset the input so the 'change' event fires even if the same file is selected again
        event.target.value = null;
    });

    // Custom Theme (CSS)
    dom.importThemeBtn.addEventListener('click', () => {
        dom.importThemeInput.click();
    });

    dom.importThemeInput.addEventListener('change', (event) => {
        const files = event.target.files;
        if (files.length > 0) {
            theme.importAndSaveThemes(files);
        }
        event.target.value = null; // Reset for re-selection
    });

    dom.themeSelect.addEventListener('change', () => {
        theme.updateThemePreview();
    });

    dom.setActiveThemeBtn.addEventListener('click', theme.setActiveTheme);

    dom.deleteThemeBtn.addEventListener('click', theme.deleteSelectedTheme);

    // Link & Folder Modals
    dom.addLinkForm.addEventListener('submit', (event) => {
        event.preventDefault();
        let name = dom.linkNameInput.value.trim();
        let url = dom.linkUrlInput.value.trim();

        if (url) {
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            if (!name) {
                try {
                    const hostname = new URL(url).hostname.replace(/^www\./, '');
                    name = hostname.split('.')[0];
                    name = name.charAt(0).toUpperCase() + name.slice(1);
                } catch (e) { name = url; }
            }
            ui.addNewLink(name, url);
            dom.addLinkForm.reset();
            ui.closeModal(dom.modal);
        }
    });

    // Tema değiştiğinde hava durumu efekt renklerini güncellemek için
    document.addEventListener('themeChanged', () => {
        loadWeather();
    });

    document.addEventListener('languageChanged', () => {
        ui.updateGreeting();
        ui.updateSearchPlaceholder();
        ui.renderLinks();
        ui.renderRssFeedsList();
        ui.renderCustomWidgetsListInSettings();
        ui.renderCustomWidgetsOnPage();
        loadWeather();
        ui.initializeSettingsUI();
    });
}

// --- App Initialization ---

async function initializeApp() {
    await initialize(); // Initialize translations first

    ui.updateClock();
    setInterval(ui.updateClock, 1000);

    ui.updateGreeting();
    ui.applyBackground();

    ui.loadAndRenderLinks();
    ui.initializeDragAndDrop();
    ui.initializeCustomWidgetDragAndDrop();

    rss.initializeRss();

    ui.renderCustomWidgetsOnPage();

    loadWeather();

    ui.initializeSettingsUI();
    ui.updateSearchPlaceholder();

    widgets.initializeWidgets();

    theme.initializeTheme();

    addEventListeners();
}

initializeApp();
