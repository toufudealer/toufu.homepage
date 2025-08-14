import { getStoredJSON, setStoredJSON } from './storage.js';

// DuckDuckGo Autocomplete
export async function fetchAutocompleteSuggestions(query) {
  if (!query) return [];
  try {
    const response = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=json`);
    const suggestions = await response.json();
    // DDG her zaman sorguyu ilk eleman olarak döner, onu atlıyoruz.
    return suggestions.length > 1 ? suggestions.slice(1).map(s => s.phrase) : [];
  } catch (error) {
    console.error("Otomatik tamamlama hatası:", error);
    return [];
  }
}

// Bing Günün Resmi
export async function fetchBingImage() {
    const today = new Date().toISOString().split('T')[0];
    const bingData = getStoredJSON('bingImageData', null);

    if (bingData && bingData.date === today) {
      return bingData.url; // Önbellekten dön
    }

    try {
        const response = await fetch(`https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=tr-TR`);
        const data = await response.json();
        const imageUrl = `https://www.bing.com${data.images[0].url}`;
        setStoredJSON('bingImageData', { url: imageUrl, date: today });
        return imageUrl;
    } catch (error) {
        console.error("Bing resmi alınamadı:", error);
        return null; // Hata durumunda null dön
    }
}

// Hava Durumu
export async function fetchWeather() {
  const savedLocation = getStoredJSON('weatherLocation', null);
  if (!savedLocation || !savedLocation.city) {
    return { error: "Ayarlardan konum belirleyin." };
  }

  // --- Önbellek (Cache) Kontrolü ---
  const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 dakika
  const cachedWeather = getStoredJSON('weatherCache', null);

  if (cachedWeather &&
      cachedWeather.location.city === savedLocation.city &&
      cachedWeather.location.country === savedLocation.country &&
      (Date.now() - cachedWeather.timestamp < CACHE_DURATION_MS)) {
    // console.log("Hava durumu önbellekten yüklendi.");
    return cachedWeather.data;
  }
  // --- Önbellek Kontrolü Bitiş ---

  try {
    // 1. Geocoding: Şehir adını enlem/boylama çevir
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(savedLocation.city)}&count=10&language=tr&format=json`;
    const geoResponse = await fetch(geocodeUrl);
    const geoData = await geoResponse.json();

    if (!geoData.results?.length) throw new Error(`'${savedLocation.city}' bulunamadı.`);

    const result = geoData.results.find(r => r.country_code === savedLocation.country) || geoData.results[0];
    const { latitude, longitude, name, admin1 } = result;
    const locationNameForDisplay = (name !== admin1 && admin1) ? `${name}, ${admin1}` : `${name}`;

    // 2. Hava durumu verisini çek
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`;
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) throw new Error('Hava durumu verisi alınamadı.');
    const weatherData = await weatherResponse.json();

    const dataToReturn = { current: weatherData.current_weather, daily: weatherData.daily, locationName: locationNameForDisplay, locationNameForTitle: name };

    // --- Yeni Veriyi Önbelleğe Al ---
    const dataToCache = {
        timestamp: Date.now(),
        location: savedLocation,
        data: dataToReturn
    };
    setStoredJSON('weatherCache', dataToCache);
    // --- Önbelleğe Alma Bitiş ---

    return dataToReturn;
  } catch (error) {
    return { error: error.message || 'Hava durumu yüklenemedi.' };
  }
}
