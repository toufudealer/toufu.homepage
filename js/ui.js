import * as dom from './dom.js';
import * as storage from './storage.js';
import * as api from './api.js';
import * as config from './config.js';
import { generateId } from './utils.js';

// --- UI State ---
let links = [];
let detailedWeatherData = null;
let activeSuggestionIndex = -1;
let suggestionItems = [];

// --- Private Helper Functions ---

function findItemAndParent(id, currentItems = links, parent = null) {
    for (let i = 0; i < currentItems.length; i++) {
        const item = currentItems[i];
        if (item.id === id) {
            return { item, parent: parent || links, index: i };
        }
    }
    return null;
}

function saveLinks() {
    storage.setStoredJSON('quickLinks', links);
}

function getWeatherIcon(code) {
    if (code === 0) return '☀️'; // Clear sky
    if (code === 1) return '🌤️'; // Mainly clear
    if (code === 2) return '🌥️'; // Partly cloudy
    if (code === 3) return '☁️'; // Overcast
    if (code >= 45 && code <= 48) return '🌫️'; // Fog
    if (code >= 51 && code <= 57) return '💧'; // Drizzle
    if (code >= 61 && code <= 67) return '🌧️'; // Rain
    if (code >= 71 && code <= 77) return '❄️'; // Snow
    if (code >= 80 && code <= 82) return '🌦️'; // Rain showers
    if (code >= 85 && code <= 86) return '🌨️'; // Snow showers
    if (code >= 95 && code <= 99) return '⛈️'; // Thunderstorm
    return '🌡️';
}

function getDayName(dateString, index) {
    if (index === 0) return "Bugün";
    if (index === 1) return "Yarın";
    const date = new Date(dateString);
    const options = { weekday: 'long' };
    return new Intl.DateTimeFormat('tr-TR', options).format(date);
}

async function loadAndSetFavicon(imgElement, linkUrl) {
    // 1. Önbellekten almayı dene
    try {
        const cachedFavicon = await storage.getFavicon(linkUrl);
        if (cachedFavicon) {
            imgElement.src = cachedFavicon;
            return;
        }
    } catch (error) {
        console.error("Favicon önbellekten okunurken hata:", error);
    }

    // 2. Önbellekte yoksa, Google'ın API'sinden çek ve önbelleğe al
    // NOT: Bu işlemin çalışması için manifest.json dosyasında host izni gerekir.
    const faviconApiUrl = `https://www.google.com/s2/favicons?sz=32&domain_url=${linkUrl}`;

    // Hata durumunda ikonu gizlemek için onerror olayını ayarla
    imgElement.onerror = () => { imgElement.style.display = 'none'; };

    try {
        // fetch ve blob kullanarak favicon'u alıp önbelleğe kaydediyoruz.
        // Bu, manifest.json'daki host izni sayesinde CORS hatası vermeyecektir.
        const response = await fetch(faviconApiUrl);
        if (!response.ok) {
            imgElement.src = faviconApiUrl; // Başarısız olursa tarayıcının normal yüklemesine izin ver
            return;
        }

        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result;
            // Google'ın boş yanıtı (genellikle < 200 byte) gibi çok küçük resimleri kaydetme.
            if (base64data && typeof base64data === 'string' && base64data.length > 200) {
                imgElement.src = base64data; // Resmi ekranda göster.
                storage.setFavicon(linkUrl, base64data); // Gelecekte kullanmak için önbelleğe al.
            } else {
                imgElement.src = faviconApiUrl; // Geçerli ikon değilse normal yüklemeyi dene.
            }
        };
        reader.readAsDataURL(blob);
    } catch (error) {
        console.error(`Favicon alınırken ağ hatası oluştu (${linkUrl}):`, error);
        imgElement.src = faviconApiUrl; // Hata durumunda bile tarayıcının ikonu normal yolla yüklemesine izin ver.
    }
}

function renderItem(item, container) {
    const itemWrapper = document.createElement('div');
    itemWrapper.className = 'link-box-wrapper';
    itemWrapper.dataset.id = item.id;

    const link = item;
    const linkElement = document.createElement('a');
    linkElement.href = link.url;
    linkElement.className = 'link-box';
    linkElement.addEventListener('click', (e) => e.currentTarget.classList.add('link-loading'));

    const faviconImg = document.createElement('img');
    faviconImg.className = 'favicon-img';
    loadAndSetFavicon(faviconImg, link.url); // Önbellek destekli yükleyiciyi kullan

    const linkNameSpan = document.createElement('span');
    linkNameSpan.textContent = link.name;

    linkElement.appendChild(faviconImg);
    linkElement.appendChild(linkNameSpan);
    itemWrapper.appendChild(linkElement);

    // Her bağlantının silinebilmesi için silme butonu ekle
    if (item.type === 'link') {
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.className = 'delete-link-btn';
        deleteBtn.title = 'Bu öğeyi sil';
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`'${item.name}' öğesini silmek istediğinizden emin misiniz?`)) {
                const found = findItemAndParent(item.id);
                if (found) {
                    links.splice(found.index, 1);
                    // Bağlantı silindiğinde ilişkili favicon'u da veritabanından temizle
                    await storage.deleteFavicon(item.url);
                    saveLinks();
                    renderLinks();
                }
            }
        });
        itemWrapper.appendChild(deleteBtn);
    }

    container.appendChild(itemWrapper);
}

function populateCountrySelect() {
    const sortedCountries = Object.keys(config.countries).sort((a, b) => a.localeCompare(b, 'tr'));
    sortedCountries.forEach(countryName => {
        const option = document.createElement('option');
        option.value = config.countries[countryName];
        option.textContent = countryName;
        dom.countrySelect.appendChild(option);
    });
    dom.countrySelect.value = 'TR';
}

// --- Exported UI Functions ---

export function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    dom.clockElement.textContent = `${hours}:${minutes}`;
}

export function updateGreeting() {
    const hour = new Date().getHours();
    const name = (localStorage.getItem('userName') || '').trim();
    let greetingText;
    if (hour >= 5 && hour < 12) greetingText = "Günaydın";
    else if (hour >= 12 && hour < 18) greetingText = "İyi günler";
    else if (hour >= 18 && hour < 22) greetingText = "İyi akşamlar";
    else greetingText = "İyi geceler";
    dom.greetingElement.textContent = name ? `${greetingText}, ${name}!` : `${greetingText}!`;
}

export function updateSearchPlaceholder() {
    const selectedEngineKey = localStorage.getItem('searchEngine') || 'google';
    dom.searchInput.placeholder = config.searchEngines[selectedEngineKey].placeholder;
}

export async function applyBackground() {
    const setting = storage.getStoredJSON('backgroundSetting', { type: 'none' });
    let imageUrl = null;

    if (setting.type === 'url' && setting.value) {
        imageUrl = setting.value;
    } else if (setting.type === 'bing') {
        imageUrl = await api.fetchBingImage();
    } else if (setting.type === 'custom') {
        const customImages = await storage.getAllCustomImages();
        if (customImages.length > 0) {
            const randomIndex = Math.floor(Math.random() * customImages.length);
            imageUrl = customImages[randomIndex].value;
        }
    }

    document.body.style.backgroundImage = imageUrl ? `url('${imageUrl}')` : 'none';
}

export function toggleBackgroundInputs() {
    const source = dom.backgroundSourceSelect.value;
    dom.backgroundUrlGroup.classList.toggle('hidden', source !== 'url');
    dom.backgroundCustomGroup.classList.toggle('hidden', source !== 'custom');
}

export async function renderCustomImagePreview() {
    dom.customImagesPreview.innerHTML = '';
    const customImages = await storage.getAllCustomImages();
    customImages.forEach(imgObject => {
        const thumbWrapper = document.createElement('div');
        thumbWrapper.className = 'preview-thumbnail';

        const img = document.createElement('img');
        img.src = imgObject.value;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-img-btn';
        deleteBtn.textContent = '×';
        deleteBtn.type = 'button'; // Butonun formu göndermesini engellemek için bu satır eklendi.
        deleteBtn.title = 'Bu resmi sil';
        deleteBtn.addEventListener('click', async () => {
            await storage.deleteCustomImage(imgObject.key);
            thumbWrapper.remove(); // Tüm listeyi yeniden çizmek yerine sadece silinen öğeyi DOM'dan kaldır.
            applyBackground();
        });

        thumbWrapper.appendChild(img);
        thumbWrapper.appendChild(deleteBtn);
        dom.customImagesPreview.appendChild(thumbWrapper);
    });
}

export async function clearCustomImages() {
    if (confirm('Tüm yüklenmiş resimleri silmek istediğinizden emin misiniz?')) {
        await storage.clearCustomImagesDB();
        renderCustomImagePreview();
        applyBackground();
    }
}

export async function handleCustomImageUpload(event) {
    const files = event.target.files;
    if (!files.length) return;

    const fileReadPromises = Array.from(files)
        .filter(file => file.type.startsWith('image/'))
        .map(file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        }));

    try {
        const newImages = await Promise.all(fileReadPromises);
        for (const imageData of newImages) {
            await storage.addCustomImage(imageData);
        }
        renderCustomImagePreview();
        applyBackground();
    } catch (error) {
        console.error("Resim okunurken veya kaydedilirken hata oluştu:", error);
    }
}

export function renderSuggestions(suggestions, performSearch) {
    dom.autocompleteSuggestions.innerHTML = '';
    activeSuggestionIndex = -1;
    suggestionItems = [];

    suggestions.forEach(text => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = text;
        item.addEventListener('click', () => {
            dom.searchInput.value = text;
            clearSuggestions();
            performSearch(text);
        });
        dom.autocompleteSuggestions.appendChild(item);
        suggestionItems.push(item);
    });

    dom.autocompleteSuggestions.style.display = suggestionItems.length > 0 ? 'block' : 'none';
}

export function clearSuggestions() {
    dom.autocompleteSuggestions.style.display = 'none';
}

export function handleKeyboardNavigation(e, performSearch) {
    if (dom.autocompleteSuggestions.style.display === 'none' || suggestionItems.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestionItems.length;
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeSuggestionIndex = (activeSuggestionIndex - 1 + suggestionItems.length) % suggestionItems.length;
    } else if (e.key === 'Enter' && activeSuggestionIndex > -1) {
        e.preventDefault();
        suggestionItems[activeSuggestionIndex].click();
    } else if (e.key === 'Escape') {
        clearSuggestions();
    }

    suggestionItems.forEach((item, index) => {
        item.classList.toggle('active', index === activeSuggestionIndex);
    });
}

export function displayWeather(data) {
    const temp = Math.round(data.current.temperature);
    const icon = getWeatherIcon(data.current.weathercode);
    dom.weatherContainer.innerHTML = `${icon} ${temp}°C <span class="weather-city">${data.locationName}</span>`;
}

export function renderWeatherModal() {
    if (!detailedWeatherData) return;

    dom.weatherModalCity.textContent = `${detailedWeatherData.locationName} Tahmini`;
    dom.weatherForecastDetails.innerHTML = '';

    detailedWeatherData.time.forEach((date, index) => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'forecast-day';
        dayDiv.innerHTML = `
            <span class="day-name">${getDayName(date, index)}</span>
            <span class="icon">${getWeatherIcon(detailedWeatherData.weathercode[index])}</span>
            <span class="temps">
                <span class="high">${Math.round(detailedWeatherData.temperature_2m_max[index])}°</span>
                <span class="low">${Math.round(detailedWeatherData.temperature_2m_min[index])}°</span>
            </span>`;
        dom.weatherForecastDetails.appendChild(dayDiv);
    });

    openModal(dom.weatherModal);
}

export function setDetailedWeatherData(data) {
    detailedWeatherData = data;
}

export function getDetailedWeatherData() {
    return detailedWeatherData;
}

export function renderLinks() {
    dom.quickLinksContainer.innerHTML = '';
    links.forEach(item => renderItem(item, dom.quickLinksContainer));

    const addLinkWrapper = document.createElement('div');
    addLinkWrapper.className = 'link-box-wrapper add-link-wrapper';
    addLinkWrapper.innerHTML = `<a href="#" class="link-box add-link-box" title="Yeni bağlantı ekle">+</a>`;
    addLinkWrapper.querySelector('.add-link-box').addEventListener('click', (e) => {
        e.preventDefault();
        openModal(dom.modal);
        dom.linkNameInput.focus();
    });
    dom.quickLinksContainer.appendChild(addLinkWrapper);
}

export function loadAndRenderLinks() {
    const savedLinks = storage.getStoredJSON('quickLinks', [
        { name: 'YouTube', url: 'https://www.youtube.com' },
        { name: 'GitHub', url: 'https://www.github.com' }
    ]);

    // Veri yapısını düzleştir: Klasörlerin içindeki linkleri ana listeye taşı.
    const flattenedLinks = [];
    savedLinks.forEach(item => {
        if (item.type === 'folder' && Array.isArray(item.items)) {
            flattenedLinks.push(...item.items);
        } else if (!item.type || item.type === 'link') {
            flattenedLinks.push(item);
        }
    });

    // Tüm öğelerin geçerli bir 'link' formatında olduğundan emin ol.
    links = flattenedLinks.map(item => (item.id && item.type) ? item : { id: generateId('link'), type: 'link', name: item.name, url: item.url });

    renderLinks();
}

export function initializeDragAndDrop() {
    if (dom.quickLinksContainer) {
        new Sortable(dom.quickLinksContainer, {
            animation: 150,
            filter: '.add-link-wrapper',
            onMove: (evt) => !evt.related.classList.contains('add-link-wrapper'),
            onEnd: (evt) => {
                 // Sadece yeniden sıralama işlemi yapılır.
                 if (evt.oldIndex !== evt.newIndex) {
                     const [movedItem] = links.splice(evt.oldIndex, 1);
                     links.splice(evt.newIndex, 0, movedItem);
                     saveLinks(); // Sadece veri dizisini güncelle, DOM zaten güncellendi.
                 }
            }
        });
    }
}

export function openModal(modalElement) {
    modalElement.classList.add('is-open');
}

export function closeModal(modalElement) {
    modalElement.classList.remove('is-open');
}

export function closeAllModals() {
    document.querySelectorAll('.modal.is-open').forEach(m => closeModal(m));
}

export function addNewLink(name, url) {
    links.push({
        id: generateId('link'),
        type: 'link',
        name,
        url
    });
    saveLinks();
    renderLinks();
}

export function toggleSettingsPanel() {
    dom.settingsPanel.classList.toggle('open');
}

export function initializeSettingsUI() {
    populateCountrySelect();

    // Arama motoru ayarlarını yükle
    const savedEngine = localStorage.getItem('searchEngine') || 'google';
    Object.keys(config.searchEngines).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = config.searchEngines[key].name;
        dom.searchEngineSelect.appendChild(option);
    });
    dom.searchEngineSelect.value = savedEngine;

    // İsim ayarını yükle
    dom.userNameInput.value = localStorage.getItem('userName') || '';

    // Arka plan ayarlarını yükle
    const bgSetting = storage.getStoredJSON('backgroundSetting', { type: 'none', value: '' });
    dom.backgroundSourceSelect.value = bgSetting.type;
    if (bgSetting.type === 'url') {
        dom.backgroundUrlInput.value = bgSetting.value;
    }
    toggleBackgroundInputs();
    renderCustomImagePreview();

    // Konum ayarlarını yükle
    const savedLocation = storage.getStoredJSON('weatherLocation', null);
    if (savedLocation) {
        dom.locationInput.value = savedLocation.city || '';
        dom.countrySelect.value = savedLocation.country || 'TR';
    }
}
