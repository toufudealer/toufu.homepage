// DOM elementleri
const clockElement = document.getElementById('clock');
const searchContainer = document.getElementById('search-container');
const autocompleteSuggestions = document.getElementById('autocomplete-suggestions');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const weatherContainer = document.getElementById('weather-container');
const quickLinksContainer = document.getElementById('quick-links-container');
const modal = document.getElementById('add-link-modal');
const addLinkModalCloseBtn = document.querySelector('#add-link-modal .close-btn');
const addLinkForm = document.getElementById('add-link-form');
const linkNameInput = document.getElementById('link-name-input');
const linkUrlInput = document.getElementById('link-url-input');
const folderViewModal = document.getElementById('folder-view-modal');
const closeFolderViewBtn = document.getElementById('close-folder-view-btn');
const folderNameInput = document.getElementById('folder-name-input');
const folderLinksContainer = document.getElementById('folder-links-container');

const weatherModal = document.getElementById('weather-modal');
const weatherModalCity = document.getElementById('weather-modal-city');
const closeWeatherModalBtn = document.getElementById('close-weather-modal-btn');
const weatherForecastDetails = document.getElementById('weather-forecast-details');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const locationForm = document.getElementById('location-form');
const countrySelect = document.getElementById('country-select');
const locationInput = document.getElementById('location-input');
const greetingElement = document.getElementById('greeting');
const searchEngineSelect = document.getElementById('search-engine-select');
const userNameInput = document.getElementById('user-name-input');
const backgroundForm = document.getElementById('background-form');
const backgroundSourceSelect = document.getElementById('background-source-select');
const backgroundUrlGroup = document.getElementById('background-url-group');
const backgroundUrlInput = document.getElementById('background-url-input');
const backgroundCustomGroup = document.getElementById('background-custom-group');
const backgroundCustomInput = document.getElementById('background-custom-input');
const customImagesPreview = document.getElementById('custom-images-preview');
const clearCustomImagesBtn = document.getElementById('clear-custom-images-btn');
const resetAllSettingsBtn = document.getElementById('reset-all-settings-btn');

// Global değişkenler
let detailedWeatherData = null;
let activeSuggestionIndex = -1;
let suggestionItems = [];
let activeFolderSortable = null;
let currentOpenFolderId = null;

/**
 * localStorage'dan veriyi güvenli bir şekilde alır ve JSON olarak ayrıştırır.
 * @param {string} key - localStorage anahtarı.
 * @param {*} defaultValue - Veri bulunamazsa veya hata olursa dönecek varsayılan değer.
 * @returns {*} Ayrıştırılmış JSON nesnesi veya varsayılan değer.
 */
function getStoredJSON(key, defaultValue) {
  const storedValue = localStorage.getItem(key);
  if (!storedValue) { // null, undefined, "" durumlarını yakalar
    return defaultValue;
  }
  try {
    return JSON.parse(storedValue);
  } catch (e) {
    console.error(`localStorage'dan "${key}" anahtarı için JSON ayrıştırılırken hata oluştu:`, e);
    return defaultValue;
  }
}

// Benzersiz ID oluşturucu
function generateId(prefix = 'item') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Eski veri yapısını yenisine dönüştürür (ID ve tip ekler)
function migrateLinksData(items) {
    return items.map(item => {
        if (item.id && item.type) return item; // Zaten yeni formatta
        return {
            id: generateId('link'),
            type: 'link',
            name: item.name,
            url: item.url
        };
    });
}

// Hızlı bağlantılar
let links = migrateLinksData(getStoredJSON('quickLinks', [
    { name: 'YouTube', url: 'https://www.youtube.com' },
    { name: 'GitHub', url: 'https://www.github.com' }
]));


// Arama Motorları
const searchEngines = {
  google: { name: 'Google', url: 'https://www.google.com/search?q=', placeholder: "Google'da ara..." },
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', placeholder: "DuckDuckGo'da ara..." },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q=', placeholder: "Bing'de ara..." },
  yandex: { name: 'Yandex', url: 'https://yandex.com.tr/search/?text=', placeholder: "Yandex'te ara..." }
};

// Ülke listesi
const countries = {
  'Türkiye': 'TR', 'Almanya': 'DE', 'Amerika Birleşik Devletleri': 'US', 'Arjantin': 'AR', 'Avustralya': 'AU', 'Avusturya': 'AT', 'Azerbaycan': 'AZ', 'Belçika': 'BE', 'Brezilya': 'BR', 'Bulgaristan': 'BG', 'Çek Cumhuriyeti': 'CZ', 'Çin': 'CN', 'Danimarka': 'DK', 'Endonezya': 'ID', 'Estonya': 'EE', 'Fas': 'MA', 'Finlandiya': 'FI', 'Fransa': 'FR', 'Güney Kore': 'KR', 'Hırvatistan': 'HR', 'Hindistan': 'IN', 'Hollanda': 'NL', 'İngiltere': 'GB', 'İran': 'IR', 'İrlanda': 'IE', 'İspanya': 'ES', 'İsrail': 'IL', 'İsveç': 'SE', 'İsviçre': 'CH', 'İtalya': 'IT', 'İzlanda': 'IS', 'Japonya': 'JP', 'Kanada': 'CA', 'Katar': 'QA', 'Kazakistan': 'KZ', 'Kıbrıs': 'CY', 'Kolombiya': 'CO', 'Letonya': 'LV', 'Litvanya': 'LT', 'Lüksemburg': 'LU', 'Macaristan': 'HU', 'Malezya': 'MY', 'Meksika': 'MX', 'Mısır': 'EG', 'Norveç': 'NO', 'Pakistan': 'PK', 'Polonya': 'PL', 'Portekiz': 'PT', 'Romanya': 'RO', 'Rusya': 'RU', 'Singapur': 'SG', 'Slovakya': 'SK', 'Slovenya': 'SI', 'Suudi Arabistan': 'SA', 'Şili': 'CL', 'Tayland': 'TH', 'Ukrayna': 'UA', 'Yeni Zelanda': 'NZ', 'Yunanistan': 'GR'
};

// Ülke seçimi dropdown doldurma
function populateCountrySelect() {
  const sortedCountries = Object.keys(countries).sort((a, b) => a.localeCompare(b, 'tr'));
  sortedCountries.forEach(countryName => {
    const option = document.createElement('option');
    option.value = countries[countryName];
    option.textContent = countryName;
    countrySelect.appendChild(option);
  });
  countrySelect.value = 'TR';
}

// Saat güncelleme
function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  clockElement.textContent = `${hours}:${minutes}`;
}

// Selamlama mesajını güncelleme
function updateGreeting() {
  const hour = new Date().getHours();
  const name = (localStorage.getItem('userName') || '').trim();
  let greetingText;
  if (hour >= 5 && hour < 12) {
    greetingText = "Günaydın";
  } else if (hour >= 12 && hour < 18) {
    greetingText = "İyi günler";
  } else if (hour >= 18 && hour < 22) {
    greetingText = "İyi akşamlar";
  } else { // 22:00 - 05:00 arası
    greetingText = "İyi geceler";
  }
  greetingElement.textContent = name ? `${greetingText}, ${name}!` : `${greetingText}!`;
}

// Arama çubuğu placeholder'ını güncelleme
function updateSearchPlaceholder() {
  const selectedEngineKey = localStorage.getItem('searchEngine') || 'google';
  const placeholderText = searchEngines[selectedEngineKey].placeholder;
  searchInput.placeholder = placeholderText;
}

// Arka planı uygulama
async function applyBackground() {
  const setting = getStoredJSON('backgroundSetting', { type: 'none' });

  if (setting.type === 'url' && setting.value) {
    document.body.style.backgroundImage = `url('${setting.value}')`;
  } else if (setting.type === 'bing') {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatında bugünün tarihi
    const bingData = getStoredJSON('bingImageData', null);

    if (bingData && bingData.date === today) {
      // Önbellekteki bugünün resmini kullan
      document.body.style.backgroundImage = `url('${bingData.url}')`;
    } else {
      // Bing'den yeni resim çek
      try {
        const response = await fetch(`https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=tr-TR`);
        const data = await response.json();
        const imageUrl = `https://www.bing.com${data.images[0].url}`;
        document.body.style.backgroundImage = `url('${imageUrl}')`;
        // Yeni resmi tarih bilgisiyle önbelleğe al
        localStorage.setItem('bingImageData', JSON.stringify({ url: imageUrl, date: today }));
      } catch (error) {
        console.error("Bing resmi alınamadı:", error);
        document.body.style.backgroundImage = 'none'; // Hata durumunda varsayılana dön
      }
    }
  } else if (setting.type === 'custom') {
    const customImages = getStoredJSON('customBackgroundImages', []);
    if (customImages.length > 0) {
      const randomIndex = Math.floor(Math.random() * customImages.length);
      document.body.style.backgroundImage = `url('${customImages[randomIndex]}')`;
    } else {
      document.body.style.backgroundImage = 'none';
    }
  } else {
    document.body.style.backgroundImage = 'none';
  }
}

// Ayarlar panelindeki arka plan giriş alanlarını yönet
function toggleBackgroundInputs() {
  const source = backgroundSourceSelect.value;
  backgroundUrlGroup.classList.toggle('hidden', source !== 'url');
  backgroundCustomGroup.classList.toggle('hidden', source !== 'custom');
}

// Özel resim önizlemelerini oluştur
function renderCustomImagePreview() {
  customImagesPreview.innerHTML = '';
  const customImages = getStoredJSON('customBackgroundImages', []);
  customImages.forEach((imgData, index) => {
    const thumbWrapper = document.createElement('div');
    thumbWrapper.className = 'preview-thumbnail';

    const img = document.createElement('img');
    img.src = imgData;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-img-btn';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Bu resmi sil';
    deleteBtn.addEventListener('click', () => {
      customImages.splice(index, 1);
      localStorage.setItem('customBackgroundImages', JSON.stringify(customImages));
      renderCustomImagePreview();
      applyBackground(); // Arka planı güncelle
    });

    thumbWrapper.appendChild(img);
    thumbWrapper.appendChild(deleteBtn);
    customImagesPreview.appendChild(thumbWrapper);
  });
}

// Tüm özel resimleri temizle
function clearCustomImages() {
  if (confirm('Tüm yüklenmiş resimleri silmek istediğinizden emin misiniz?')) {
    localStorage.removeItem('customBackgroundImages');
    renderCustomImagePreview();
    applyBackground();
  }
}

// Özel resim yükleme işlemini yönet
function handleCustomImageUpload(event) {
  const files = event.target.files;
  if (!files.length) return;

  const existingImages = getStoredJSON('customBackgroundImages', []);
  const fileReadPromises = [];

  for (const file of files) {
    if (file.type.startsWith('image/')) {
      const promise = new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      fileReadPromises.push(promise);
    }
  }

  Promise.all(fileReadPromises).then(newImages => {
    const allImages = [...existingImages, ...newImages];
    localStorage.setItem('customBackgroundImages', JSON.stringify(allImages));
    renderCustomImagePreview();
    applyBackground();
  }).catch(error => console.error("Resim okunurken hata oluştu:", error));
}

// Arama işlemini gerçekleştiren merkezi fonksiyon
function performSearch(query) {
  if (!query) return;
  const selectedEngineKey = localStorage.getItem('searchEngine') || 'google';
  const searchURLTemplate = searchEngines[selectedEngineKey].url;
  window.location.href = `${searchURLTemplate}${encodeURIComponent(query)}`;
}

// Arama formu submit
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  performSearch(searchInput.value.trim());
});

// --- Otomatik Tamamlama Fonksiyonları ---

// API çağrılarını sınırlamak için debounce fonksiyonu
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Önerileri API'den çeker
async function fetchAutocompleteSuggestions(query) {
  if (!query) {
    autocompleteSuggestions.style.display = 'none';
    return;
  }
  try {
    const response = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=json`);
    const suggestions = await response.json();
    if (suggestions.length > 1) { // DDG her zaman sorguyu ilk eleman olarak döner
      renderSuggestions(suggestions.slice(1).map(s => s.phrase));
    } else {
      autocompleteSuggestions.style.display = 'none';
    }
  } catch (error) {
    console.error("Otomatik tamamlama hatası:", error);
    autocompleteSuggestions.style.display = 'none';
  }
}

// Önerileri ekrana çizer
function renderSuggestions(suggestions) {
  autocompleteSuggestions.innerHTML = '';
  activeSuggestionIndex = -1;
  suggestionItems = [];

  suggestions.forEach(text => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.textContent = text;
    item.addEventListener('click', () => {
      searchInput.value = text;
      autocompleteSuggestions.style.display = 'none';
      performSearch(text);
    });
    autocompleteSuggestions.appendChild(item);
    suggestionItems.push(item);
  });

  autocompleteSuggestions.style.display = suggestionItems.length > 0 ? 'block' : 'none';
}

// Klavye ile öneriler arasında gezinme
function handleKeyboardNavigation(e) {
  if (autocompleteSuggestions.style.display === 'none' || suggestionItems.length === 0) return;

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
    autocompleteSuggestions.style.display = 'none';
  }

  suggestionItems.forEach((item, index) => {
    item.classList.toggle('active', index === activeSuggestionIndex);
  });
}

// Hava durumu ikonları
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

// Tarih dizesinden gün adını al (Bugün, Yarın, vb.)
function getDayName(dateString, index) {
    if (index === 0) return "Bugün";
    if (index === 1) return "Yarın";
    const date = new Date(dateString);
    const options = { weekday: 'long' };
    return new Intl.DateTimeFormat('tr-TR', options).format(date);
}

// Hava durumu modalını doldur ve göster
function renderWeatherModal() {
    if (!detailedWeatherData) return;

    weatherModalCity.textContent = `${detailedWeatherData.locationName} Tahmini`;
    weatherForecastDetails.innerHTML = ''; // Önceki içeriği temizle

    detailedWeatherData.time.forEach((date, index) => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'forecast-day';

        const dayName = getDayName(date, index);
        const icon = getWeatherIcon(detailedWeatherData.weathercode[index]);
        const tempMax = Math.round(detailedWeatherData.temperature_2m_max[index]);
        const tempMin = Math.round(detailedWeatherData.temperature_2m_min[index]);

        dayDiv.innerHTML = `
            <span class="day-name">${dayName}</span>
            <span class="icon">${icon}</span>
            <span class="temps"><span class="high">${tempMax}°</span><span class="low">${tempMin}°</span></span>`;
        weatherForecastDetails.appendChild(dayDiv);
    });

    weatherModal.classList.add('is-open');
}

// Hava durumu çekme fonksiyonu
async function getWeather() {
  const savedLocation = getStoredJSON('weatherLocation', null);

  if (!savedLocation) {
    weatherContainer.innerHTML = `Ayarlardan konum belirleyin.`;
    return; // Kayıtlı konum yoksa fonksiyonu durdur.
  }

  try {
    if (!savedLocation.city) { // Sadece şehir kontrolü yeterli
      throw new Error("Kayıtlı konum verisi eksik.");
    }

    // Sadece şehir adıyla arama yap
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(savedLocation.city)}&count=10&language=tr&format=json`;
    const geoResponse = await fetch(geocodeUrl);
    const geoData = await geoResponse.json();

    if (!geoData.results?.length) throw new Error(`'${savedLocation.city}' bulunamadı.`);

    // Sonuçları seçilen ülkeye göre filtrele, eşleşme yoksa ilk sonucu al
    const result = geoData.results.find(r => r.country_code === savedLocation.country) || geoData.results[0];

    const latitude = result.latitude;
    const longitude = result.longitude;
    const locationNameForDisplay = (result.name !== result.admin1 && result.admin1)
      ? `${result.name}, ${result.admin1}`
      : `${result.name}`;
    const locationNameForTitle = result.name;

    // Hava durumu API'si
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`;
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) throw new Error('Hava durumu verisi alınamadı.');

    const weatherData = await weatherResponse.json();

    // Detaylı veriyi global değişkene kaydet
    detailedWeatherData = {
        ...weatherData.daily,
        locationName: locationNameForTitle
    };

    const weather = weatherData.current_weather;
    const temp = Math.round(weather.temperature);
    const icon = getWeatherIcon(weather.weathercode);

    weatherContainer.innerHTML = `${icon} ${temp}°C <span class="weather-city">${locationNameForDisplay}</span>`;
  } catch (error) {
    console.error('Hava durumu hatası:', error);
    weatherContainer.textContent = error.message || 'Hava durumu yüklenemedi.';
    detailedWeatherData = null; // Hata durumunda veriyi temizle
  }
}

// Bağlantıları localStorage'a kaydet
function saveLinks() {
  localStorage.setItem('quickLinks', JSON.stringify(links));
}

// Veri yapısı içinde ID'ye göre bir öğeyi ve ebeveynini bulur
function findItemAndParent(id, currentItems = links, parent = null) {
  for (let i = 0; i < currentItems.length; i++) {
    const item = currentItems[i];
    if (item.id === id) {
      return { item, parent: parent || links, index: i };
    }
    if (item.type === 'folder') {
      const found = findItemAndParent(id, item.items, item);
      if (found) return found;
    }
  }
  return null;
}

// Klasör görünümü modalını açar
function openFolderView(folderId) {
  currentOpenFolderId = folderId;
  const { item: folder } = findItemAndParent(folderId);
  if (!folder || folder.type !== 'folder') return;

  folderNameInput.value = folder.name;
  renderLinksInFolder(folder);
  folderViewModal.classList.add('is-open');

  if (activeFolderSortable) activeFolderSortable.destroy();
  activeFolderSortable = new Sortable(folderLinksContainer, {
    animation: 150,
    onEnd: (evt) => {
      const [movedItem] = folder.items.splice(evt.oldIndex, 1);
      folder.items.splice(evt.newIndex, 0, movedItem);
      saveLinks();
    }
  });
}

// Klasör modalındaki bağlantıları çizer
function renderLinksInFolder(folder) {
  folderLinksContainer.innerHTML = '';
  if (!folder || !folder.items) return;
  folder.items.forEach(link => {
    const linkWrapper = document.createElement('div');
    linkWrapper.className = 'link-box-wrapper';
    linkWrapper.dataset.id = link.id;

    // renderLinks fonksiyonundan kopyalanan link oluşturma mantığı
    const linkElement = document.createElement('a');
    linkElement.href = link.url;
    linkElement.className = 'link-box';
    linkElement.addEventListener('click', (e) => {
        // Yükleniyor animasyonu için tıklanan öğeye bir sınıf ekle
        e.currentTarget.classList.add('link-loading');
    });

    const faviconImg = document.createElement('img');
    faviconImg.className = 'favicon-img';
    faviconImg.src = `https://www.google.com/s2/favicons?sz=32&domain_url=${link.url}`;
    faviconImg.onerror = () => { faviconImg.style.display = 'none'; };

    const linkNameSpan = document.createElement('span');
    linkNameSpan.textContent = link.name;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.className = 'delete-link-btn';
    deleteBtn.title = 'Bu bağlantıyı sil';
    deleteBtn.addEventListener('click', () => {
      folder.items = folder.items.filter(i => i.id !== link.id);
      saveLinks();
      renderLinksInFolder(folder);
      renderLinks();
    });

    linkElement.appendChild(faviconImg);
    linkElement.appendChild(linkNameSpan);
    linkWrapper.appendChild(linkElement);
    linkWrapper.appendChild(deleteBtn);
    folderLinksContainer.appendChild(linkWrapper);
  });
}

// Klasör adını günceller
folderNameInput.addEventListener('input', () => {
  if (!currentOpenFolderId) return;
  const { item: folder } = findItemAndParent(currentOpenFolderId);
  if (folder) {
    folder.name = folderNameInput.value.trim();
    saveLinks();
    renderLinks();
  }
});

function closeFolderView() {
  folderViewModal.classList.remove('is-open');
  currentOpenFolderId = null;
  if (activeFolderSortable) {
    activeFolderSortable.destroy();
    activeFolderSortable = null;
  }
}

// Bağlantıları ekrana çiz
function renderLinks() {
  quickLinksContainer.innerHTML = '';
  links.forEach(item => renderItem(item, quickLinksContainer));

  const addLinkWrapper = document.createElement('div');
  addLinkWrapper.className = 'link-box-wrapper add-link-wrapper';

  const addBox = document.createElement('a');
  addBox.href = '#';
  addBox.className = 'link-box add-link-box';
  addBox.textContent = '+';
  addBox.title = 'Yeni bağlantı ekle';
  addBox.addEventListener('click', (e) => {
    e.preventDefault();
    modal.classList.add('is-open');
    linkNameInput.focus();
  });

  addLinkWrapper.appendChild(addBox);
  quickLinksContainer.appendChild(addLinkWrapper);
}

// Tek bir öğeyi (link veya klasör) çizen yardımcı fonksiyon
function renderItem(item, container) {
  const itemWrapper = document.createElement('div');
  itemWrapper.className = 'link-box-wrapper';
  itemWrapper.dataset.id = item.id;

  if (item.type === 'link') {
    const link = item;
    const linkElement = document.createElement('a');
    linkElement.href = link.url;
    linkElement.className = 'link-box';
    linkElement.addEventListener('click', (e) => {
        // Yükleniyor animasyonu için tıklanan öğeye bir sınıf ekle
        e.currentTarget.classList.add('link-loading');
    });

    const faviconImg = document.createElement('img');
    faviconImg.className = 'favicon-img';
    faviconImg.src = `https://www.google.com/s2/favicons?sz=32&domain_url=${link.url}`;
    faviconImg.onerror = () => { faviconImg.style.display = 'none'; };

    const linkNameSpan = document.createElement('span');
    linkNameSpan.textContent = link.name;

    linkElement.appendChild(faviconImg);
    linkElement.appendChild(linkNameSpan);
    itemWrapper.appendChild(linkElement);
  } else if (item.type === 'folder') {
    const folder = item;
    const folderElement = document.createElement('div');
    folderElement.className = 'link-box folder-box';

    const itemsToShow = folder.items.slice(0, 4);
    const itemCount = itemsToShow.length;
    folderElement.dataset.itemCount = itemCount; // Dinamik düzen için öğe sayısını ekle

    itemsToShow.forEach(linkInFolder => {
      const previewIcon = document.createElement('img');
      previewIcon.className = 'folder-preview-icon';
      // Daha kaliteli ikonlar için boyutu 32px olarak istiyoruz
      previewIcon.src = `https://www.google.com/s2/favicons?sz=32&domain_url=${linkInFolder.url}`;
      previewIcon.onerror = () => { previewIcon.style.visibility = 'hidden'; };
      folderElement.appendChild(previewIcon);
    });

    itemWrapper.appendChild(folderElement);

    itemWrapper.addEventListener('click', () => openFolderView(folder.id));
  }

  // Sadece linkler veya boş klasörler silinebilir.
  const isDeletable = item.type === 'link' || (item.type === 'folder' && item.items.length === 0);

  if (isDeletable) {
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.className = 'delete-link-btn';
    deleteBtn.title = 'Bu öğeyi sil';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`'${item.name}' öğesini silmek istediğinizden emin misiniz?`)) {
        const found = findItemAndParent(item.id);
        if (found) {
          const parentArray = Array.isArray(found.parent) ? found.parent : found.parent.items;
          parentArray.splice(found.index, 1);
          saveLinks();
          renderLinks();
        }
      }
    });
    itemWrapper.appendChild(deleteBtn);
  }

  container.appendChild(itemWrapper);
}

// Sürükle-bırak işlevini başlat
function initializeDragAndDrop() {
  if (quickLinksContainer) {
    new Sortable(quickLinksContainer, {
      animation: 150,
      filter: '.add-link-wrapper',
      onMove: (evt) => {
        return !evt.related.classList.contains('add-link-wrapper');
      },
      onEnd: function (evt) { // `this` kullanabilmek için arrow function yerine normal function
        this.option('animation', 150); // Sürükleme bittiğinde animasyonu her zaman varsayılana döndür.
        document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
        const draggedId = evt.item.dataset.id;
        const dropTarget = document.elementFromPoint(evt.originalEvent.clientX, evt.originalEvent.clientY);
        const targetEl = dropTarget ? dropTarget.closest('.link-box-wrapper:not(.sortable-ghost)') : null;
        const targetId = (targetEl && targetEl !== evt.item) ? targetEl.dataset.id : null;

        // Case 1: Öğe, başka bir öğenin üzerine bırakıldı (gruplama/klasörleme için)
        if (targetId && draggedId !== targetId) {
            const { item: draggedItem, parent: draggedParent, index: draggedIndex } = findItemAndParent(draggedId);
            const { item: targetItem, parent: targetParent } = findItemAndParent(targetId);

            // Sadece aynı klasör içinde veya ana dizinde birleştirmeye izin ver
            if (!draggedItem || !targetItem || draggedParent !== targetParent) {
                renderLinks(); // Geçersiz taşıma, pozisyonu sıfırlamak için yeniden çiz
                return;
            }

            // Sürüklenen öğeyi orijinal konumundan kaldır
            const parentArray = Array.isArray(draggedParent) ? draggedParent : draggedParent.items;
            parentArray.splice(draggedIndex, 1);

            // Öğeleri birleştirme mantığı
            if (targetItem.type === 'link' && draggedItem.type === 'link') {
                const newFolder = { id: generateId('folder'), type: 'folder', name: 'Yeni Klasör', items: [targetItem, draggedItem] };
                const newTargetIndex = parentArray.indexOf(targetItem); // Hedefin yeni index'ini bul
                if (newTargetIndex > -1) {
                    parentArray.splice(newTargetIndex, 1, newFolder); // Hedefi yeni klasörle değiştir
                }
            } else if (targetItem.type === 'folder' && draggedItem.type === 'link') {
                targetItem.items.push(draggedItem); // Bağlantıyı klasöre ekle
            }
            
            saveLinks();
            renderLinks();
        } 
        // Case 2: Öğe sadece listede yeniden sıralandı
        else if (evt.oldIndex !== evt.newIndex) {
            const [movedItem] = links.splice(evt.oldIndex, 1);
            links.splice(evt.newIndex, 0, movedItem);
            saveLinks(); // Sadece veri dizisini güncelle, DOM zaten güncellendi.
        }
      }
    });
  }
}


// Ayarlar paneli aç/kapa
settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('open');
});
closeSettingsBtn.addEventListener('click', () => {
  settingsPanel.classList.remove('open');
});

// Modal ve Panel Kapatma İşlemleri
addLinkModalCloseBtn.addEventListener('click', () => modal.classList.remove('is-open'));
closeWeatherModalBtn.addEventListener('click', () => weatherModal.classList.remove('is-open'));
closeFolderViewBtn.addEventListener('click', () => closeFolderView());

weatherContainer.addEventListener('click', () => {
    if (detailedWeatherData) {
        renderWeatherModal();
    }
});

window.addEventListener('click', (event) => {
  // Bağlantı ekleme modalı dışına tıklayınca kapat
  if (event.target === modal) {
    modal.classList.remove('is-open');
  }
  // Hava durumu modalı dışına tıklayınca kapat
  if (event.target === weatherModal) {
    weatherModal.classList.remove('is-open');
  }
  // Klasör modalı dışına tıklayınca kapat
  if (event.target === folderViewModal) {
    closeFolderView();
  }
  // Ayarlar paneli dışına tıklayınca kapat
  if (
    settingsPanel.classList.contains('open') &&
    !settingsPanel.contains(event.target) &&
    !event.target.closest('#settings-btn')
  ) {
    settingsPanel.classList.remove('open');
  }
});

// Otomatik tamamlama olay dinleyicileri
const debouncedFetch = debounce(fetchAutocompleteSuggestions, 200);
searchInput.addEventListener('input', () => debouncedFetch(searchInput.value.trim()));
searchInput.addEventListener('keydown', handleKeyboardNavigation);
searchInput.addEventListener('focus', () => debouncedFetch(searchInput.value.trim()));


// Arama motoru seçimi
searchEngineSelect.addEventListener('change', () => {
  localStorage.setItem('searchEngine', searchEngineSelect.value);
  updateSearchPlaceholder();
});

// İsim girişi
userNameInput.addEventListener('input', () => {
  const name = userNameInput.value.trim();
  if (name) {
    localStorage.setItem('userName', name);
  } else {
    localStorage.removeItem('userName');
  }
  updateGreeting(); // Anında güncelle
});

// Arka plan kaynak seçimi değiştiğinde
backgroundSourceSelect.addEventListener('change', toggleBackgroundInputs);

// Özel resim yükleme ve silme olayları
backgroundCustomInput.addEventListener('change', handleCustomImageUpload);
clearCustomImagesBtn.addEventListener('click', clearCustomImages);

// Tüm ayarları sıfırlama
resetAllSettingsBtn.addEventListener('click', () => {
  if (confirm('Tüm ayarları sıfırlamak ve sayfayı yeniden başlatmak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
    localStorage.clear();
    location.reload();
  }
});

// Arka plan formu submit
backgroundForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const source = backgroundSourceSelect.value;
  let setting = { type: 'none', value: '' };

  if (source === 'url') {
    const urlValue = backgroundUrlInput.value.trim();
    if (urlValue) {
      setting = { type: 'url', value: urlValue };
    }
  } else if (source === 'bing') {
    setting = { type: 'bing', value: '' }; // Bing için ek değere gerek yok
  } else if (source === 'custom') {
    setting = { type: 'custom', value: '' };
  }

  if (setting.type === 'none') {
    localStorage.removeItem('backgroundSetting');
  } else {
    localStorage.setItem('backgroundSetting', JSON.stringify(setting));
  }
  applyBackground();
  settingsPanel.classList.remove('open');
});

// Konum form submit
locationForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const city = locationInput.value.trim();
  const countryCode = countrySelect.value;

  if (city && countryCode) {
    localStorage.setItem('weatherLocation', JSON.stringify({ city, country: countryCode }));
  } else {
    localStorage.removeItem('weatherLocation');
  }

  weatherContainer.textContent = 'Yükleniyor...';
  getWeather();
  settingsPanel.classList.remove('open');
});

// Ayarları başlat
function initializeSettings() {
  populateCountrySelect();

  // Arama motoru ayarlarını yükle
  const savedEngine = localStorage.getItem('searchEngine') || 'google';
  Object.keys(searchEngines).forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = searchEngines[key].name;
    searchEngineSelect.appendChild(option);
  });
  searchEngineSelect.value = savedEngine;
  updateSearchPlaceholder();

  // İsim ayarını yükle
  userNameInput.value = localStorage.getItem('userName') || '';

  // Arka plan ayarlarını yükle
  const bgSetting = getStoredJSON('backgroundSetting', { type: 'none', value: '' });
  backgroundSourceSelect.value = bgSetting.type;
  if (bgSetting.type === 'url') {
    backgroundUrlInput.value = bgSetting.value;
  }
  toggleBackgroundInputs();
  renderCustomImagePreview();

  // Konum ayarlarını yükle
  const savedLocation = getStoredJSON('weatherLocation', null);
  if (savedLocation) {
    locationInput.value = savedLocation.city || '';
    countrySelect.value = savedLocation.country || 'TR';
  }
}

// Yeni bağlantı ekleme formu submit
addLinkForm.addEventListener('submit', (event) => {
  event.preventDefault();
  let name = linkNameInput.value.trim();
  let url = linkUrlInput.value.trim();

  if (url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    if (!name) {
      try {
        const hostname = new URL(url).hostname;
        const domain = hostname.replace(/^www\./, '');
        name = domain.split('.')[0];
        name = name.charAt(0).toUpperCase() + name.slice(1);
      } catch (e) {
        console.error("URL'den isim alınamadı:", e);
        name = url; // Hata durumunda URL'i isim olarak kullan
      }
    }
    links.push({
      id: generateId('link'),
      type: 'link',
      name,
      url
    });
    saveLinks();
    renderLinks();
    addLinkForm.reset();
    modal.classList.remove('is-open');
  }
});

// Sayfa yüklenince
updateClock();
setInterval(updateClock, 1000);
renderLinks();
getWeather();
initializeSettings();
updateGreeting();
applyBackground();

// Sayfa yüklendikten sonra sürükle-bırak özelliğini etkinleştir
initializeDragAndDrop();
