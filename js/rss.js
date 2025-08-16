import * as dom from './dom.js';
import * as storage from './storage.js';
import * as i18n from './i18n.js';

const API_URL = 'https://api.rss2json.com/v1/api.json?rss_url=';
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 dakika

let feeds = [];
let activeFeed = null;

/**
 * Verilen RSS URL'sinden verileri çeker ve ayrıştırır.
 * @param {string} feedUrl - Kullanıcının girdiği RSS akış URL'si.
 * @param {boolean} [forceRefresh=false] - Önbelleği atlayıp atlamayacağı.
 * @returns {Promise<object|null>} - Ayrıştırılmış RSS verisi veya hata durumunda null.
 */
async function fetchAndParseRss(feedUrl, forceRefresh = false) {
    if (!forceRefresh) {
        const cachedData = await storage.getRssCache(feedUrl);
        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION_MS)) {
            // console.log(`RSS önbellekten yüklendi: ${feedUrl}`);
            return cachedData.data;
        }
    }

    // Önbellekte yoksa veya süresi dolmuşsa, rss2json API'si üzerinden çek
    try {
        const response = await fetch(`${API_URL}${encodeURIComponent(feedUrl)}`);
        if (!response.ok) throw new Error(i18n.translate('network_error', { status: response.status }));

        const data = await response.json();
        if (data.status !== 'ok') {
            throw new Error(data.message || i18n.translate('invalid_api_response'));
        }

        const title = data.feed.title || i18n.translate('rss_feed_default_title');
        const items = data.items.map(item => ({
            title: item.title || '',
            link: item.link || '',
            thumbnail: item.thumbnail || '',
            pubDate: item.pubDate || null,
        })).slice(0, 20);

        const feedData = { title, items };

        // Yeni veriyi önbelleğe al
        await storage.setRssCache(feedUrl, {
            timestamp: Date.now(),
            data: feedData
        });

        return feedData;
    } catch (error) {
        // Hata durumunda promise'i reject ederek çağıran fonksiyona bildir.
        // Bu, daha iyi hata yönetimi sağlar.
        console.error(i18n.translate('rss_parse_error', { feedUrl: feedUrl }), error);
        throw error;
    }
}

/**
 * Gelen veriyi widget içeriğine render eder.
 * @param {object} feedData - Ayrıştırılmış RSS verisi.
 * @param {string} [errorMessage] - Hata durumunda gösterilecek mesaj.
 */
function renderContent(feedData, errorMessage = i18n.translate('rss_load_error_empty')) {
    if (!feedData || !feedData.items || feedData.items.length === 0) {
        dom.rssTitle.textContent = activeFeed ? activeFeed.name : i18n.translate('error');
        dom.rssContent.innerHTML = `<div class="rss-item-source">${errorMessage}</div>`;
        return;
    }

    dom.rssTitle.textContent = feedData.title;
    dom.rssContent.innerHTML = ''; // İçeriği temizle

    feedData.items.forEach(item => {
        const itemElement = document.createElement('a');
        itemElement.className = 'rss-item';
        itemElement.href = item.link;
        itemElement.target = '_blank';
        itemElement.rel = 'noopener noreferrer';
        itemElement.title = item.title;

        const thumbnailHtml = item.thumbnail
            ? `<img src="${item.thumbnail}" class="rss-item-thumbnail" alt="" loading="lazy">`
            : '';

        // "Tümü" sekmesindeysek, haberin kaynağını da gösterelim.
        const sourceHtml = (activeFeed.id === 'all-feeds' && item.sourceTitle)
            ? `<div class="rss-item-source">${item.sourceTitle}</div>`
            : '';

        itemElement.innerHTML = `
            ${thumbnailHtml}
            <div class="rss-item-content-wrapper">
                <div class="rss-item-title">${item.title}</div>
                ${sourceHtml}
            </div>`;
        dom.rssContent.appendChild(itemElement);
    });
}

/**
 * Belirtilen akışın içeriğini yükler ve gösterir.
 * @param {object} feed - Yüklenecek akış nesnesi.
 * @param {boolean} [forceRefresh=false] - Önbelleği atlayıp atlamayacağı.
 */
async function loadAllFeedsContent(forceRefresh = false) {
    activeFeed = { id: 'all-feeds', name: i18n.translate('all') };
    dom.rssWidgetContainer.classList.remove('hidden');
    dom.rssRefreshBtn.classList.remove('hidden');
    dom.rssContent.innerHTML = i18n.translate('loading_content');
    dom.rssTitle.textContent = i18n.translate('all_feeds');

    // Bir akışın başarısız olması diğerlerini engellemesin diye her birini
    // ayrı ayrı yakalıyoruz.
    const feedPromises = feeds.map(feed =>
        fetchAndParseRss(feed.url, forceRefresh).catch(error => {
            console.error(i18n.translate('feed_load_error', { feedName: feed.name }), error);
            return null; // Başarısız olanlar için null döndür.
        })
    );

    try {
        const results = await Promise.all(feedPromises);
        let allItems = [];
        results.filter(r => r).forEach(result => { // Sadece başarılı olanları (null olmayanları) işle
            if (result && result.items) {
                // Her bir öğeye, hangi akıştan geldiğini belirtmek için kaynak başlığını ekle.
                const itemsWithSource = result.items.map(item => ({ ...item, sourceTitle: result.title }));
                allItems.push(...itemsWithSource);
            }
        });

        // Tüm öğeleri yayınlanma tarihine göre (en yeniden en eskiye) sırala.
        allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        const combinedData = {
            title: i18n.translate('all_feeds'),
            items: allItems.slice(0, 50) // Birleşik akışta en fazla 50 öğe göster.
        };
        renderContent(combinedData);
    } catch (error) {
        console.error(i18n.translate('all_feeds_load_error'), error);
        renderContent(null, error.message);
    }
}

/**
 * Belirtilen akışın içeriğini yükler ve gösterir.
 * @param {object} feed - Yüklenecek akış nesnesi.
 * @param {boolean} [forceRefresh=false] - Önbelleği atlayıp atlamayacağı.
 */
async function loadFeedContent(feed, forceRefresh = false) {
    if (!feed) {
        dom.rssWidgetContainer.classList.add('hidden');
        return;
    }
    activeFeed = feed;
    dom.rssWidgetContainer.classList.remove('hidden');
    dom.rssRefreshBtn.classList.remove('hidden');
    dom.rssContent.innerHTML = i18n.translate('loading_content');
    dom.rssTitle.textContent = feed.name;

    try {
        const feedData = await fetchAndParseRss(feed.url, forceRefresh);
        renderContent(feedData);
    } catch (error) {
        renderContent(null, error.message);
    }
}

/**
 * Akış sekmelerini oluşturur ve olayları bağlar.
 */
function renderTabs() {
    dom.rssTabs.innerHTML = '';

    // Birden fazla akış varsa "Tümü" sekmesini oluştur.
    if (feeds.length > 1) {
        const allTab = document.createElement('div');
        allTab.className = 'rss-tab all-tab'; // Sürüklenmemesi için özel class
        allTab.textContent = i18n.translate('all');
        allTab.dataset.id = 'all-feeds';
        if (activeFeed && activeFeed.id === 'all-feeds') {
            allTab.classList.add('active');
        }
        allTab.addEventListener('click', () => {
            localStorage.setItem('activeRssFeedId', 'all-feeds');
            initializeRss(); // Durumu yeniden başlat ve doğru içeriği yükle
        });
        dom.rssTabs.appendChild(allTab);
    }

    if (feeds.length <= 1) {
        dom.rssTabs.classList.add('hidden');
        return;
    }
    dom.rssTabs.classList.remove('hidden');

    feeds.forEach(feed => {
        const tab = document.createElement('div');
        tab.className = 'rss-tab';
        tab.textContent = feed.name;
        tab.dataset.id = feed.id;
        if (activeFeed && feed.id === activeFeed.id) {
            tab.classList.add('active');
        }
        tab.addEventListener('click', () => {
            const newActiveFeed = feeds.find(f => f.id === feed.id);
            if (newActiveFeed && newActiveFeed.id !== activeFeed.id) {
                localStorage.setItem('activeRssFeedId', feed.id);
                initializeRss(); // Durumu yeniden başlat
            }
        });
        dom.rssTabs.appendChild(tab);
    });

    // Sekmeleri sürükle-bırak ile sıralanabilir yap
    new Sortable(dom.rssTabs, {
        animation: 150,
        filter: '.all-tab', // "Tümü" sekmesinin sürüklenmesini engelle
        onEnd: (evt) => {
            // "Tümü" sekmesi (index 0) nedeniyle index'leri ayarla
            const oldIndex = evt.oldIndex - 1;
            const newIndex = evt.newIndex - 1;

            if (oldIndex < 0 || newIndex < 0) return; // "Tümü" sekmesiyle ilgili bir sürükleme ise işlem yapma

            // `feeds` dizisini yeniden sırala
            const [movedFeed] = feeds.splice(oldIndex, 1);
            feeds.splice(newIndex, 0, movedFeed);
            
            // Yeni sırayı kaydet
            storage.saveRssFeeds(feeds);
            // Ayarlar panelindeki listeyi güncellemek için bir olay tetikle
            document.dispatchEvent(new CustomEvent('rssFeedsReordered'));
        }
    });
}

/**
 * RSS widget'ını başlatır, kayıtlı akışları yükler ve gösterir.
 */
export function initializeRss() {
    feeds = storage.getRssFeeds();
    if (feeds.length === 0) {
        dom.rssWidgetContainer.classList.add('hidden');
        return;
    }

    const lastActiveId = localStorage.getItem('activeRssFeedId');
    
    if (lastActiveId === 'all-feeds' && feeds.length > 1) {
        activeFeed = { id: 'all-feeds', name: i18n.translate('all') };
    } else {
        activeFeed = feeds.find(f => f.id === lastActiveId) || feeds[0];
        // Eğer son aktif sekme silinmişse, ilk sekmeye dön ve bunu kaydet.
        if (activeFeed) {
            localStorage.setItem('activeRssFeedId', activeFeed.id);
        }
    }

    renderTabs();
    
    if (activeFeed && activeFeed.id === 'all-feeds') {
        loadAllFeedsContent();
    } else {
        loadFeedContent(activeFeed);
    }

    dom.rssRefreshBtn.onclick = () => {
        if (activeFeed) {
            const force = true;
            activeFeed.id === 'all-feeds' ? loadAllFeedsContent(force) : loadFeedContent(activeFeed, force);
        }
    };
}