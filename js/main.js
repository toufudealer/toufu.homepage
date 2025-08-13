import * as dom from './dom.js';
import * as ui from './ui.js';
import * as storage from './storage.js';
import * as api from './api.js';
import * as config from './config.js';
import { debounce } from './utils.js';

// --- Core Logic / "Controller" Functions ---

function performSearch(query) {
    if (!query) return;
    const selectedEngineKey = localStorage.getItem('searchEngine') || 'google';
    const searchURLTemplate = config.searchEngines[selectedEngineKey].url;
    window.location.href = `${searchURLTemplate}${encodeURIComponent(query)}`;
}

async function loadWeather() {
    dom.weatherContainer.textContent = 'Yükleniyor...';
    const data = await api.fetchWeather();
    if (data.error) {
        dom.weatherContainer.textContent = data.error;
        ui.setDetailedWeatherData(null);
    } else {
        ui.displayWeather(data);
        ui.setDetailedWeatherData({ ...data.daily, locationName: data.locationNameForTitle });
    }
}

async function handleAutocomplete(query) {
    const suggestions = await api.fetchAutocompleteSuggestions(query);
    ui.renderSuggestions(suggestions, performSearch);
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

    // Close modals/panels when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            ui.closeModal(event.target);
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

    dom.resetAllSettingsBtn.addEventListener('click', async () => {
        const isConfirmed = confirm('Tüm ayarları sıfırlamak ve sayfayı yeniden başlatmak istediğinizden emin misiniz? Bu işlem geri alınamaz.');

        if (isConfirmed) {
            try {
                await storage.clearAllStorage();
                alert('Tüm ayarlar başarıyla sıfırlandı. Sayfa şimdi yeniden yüklenecek.');
                location.reload();
            } catch (error) {
                alert('Ayarlar sıfırlanırken bir hata oluştu. Lütfen konsolu kontrol edin.');
                console.error('Sıfırlama hatası:', error);
            }
        }
    });

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
}

// --- App Initialization ---

function initializeApp() {
    ui.updateClock();
    setInterval(ui.updateClock, 1000);

    ui.updateGreeting();
    ui.applyBackground();

    ui.loadAndRenderLinks();
    ui.initializeDragAndDrop();

    loadWeather();

    ui.initializeSettingsUI();
    ui.updateSearchPlaceholder();

    addEventListeners();
}

initializeApp();
