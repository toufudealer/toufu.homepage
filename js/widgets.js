import * as dom from './dom.js';
import * as storage from './storage.js';

// Widget'ları ve ilgili DOM elementlerini eşleştir
const WIDGETS = {
    greeting: [dom.greetingElement, dom.searchContainer],
    quicklinks: [dom.quickLinksContainer],
    clock: [dom.clockElement],
    weather: [dom.weatherContainer],
    rss: [dom.rssWidgetContainer]
};

/**
 * localStorage'dan widget görünürlük ayarlarını alır.
 * @returns {object} Widget görünürlük ayarları.
 */
function getWidgetVisibilitySettings() {
    const defaults = {
        greeting: true,
        quicklinks: true,
        clock: true,
        weather: true,
        rss: true
    };
    return storage.getStoredJSON('widgetVisibility', defaults);
}

/**
 * Kayıtlı ayarlara göre widget'ları gösterir/gizler ve ayarlar panelindeki switch'leri günceller.
 */
function applyWidgetVisibility() {
    const settings = getWidgetVisibilitySettings();
    for (const widgetId in settings) {
        if (Object.hasOwnProperty.call(WIDGETS, widgetId)) {
            const isVisible = settings[widgetId];
            const elements = WIDGETS[widgetId];

            elements.forEach(el => {
                if (el) {
                    el.style.display = isVisible ? '' : 'none';
                }
            });

            const toggle = dom.widgetManager.querySelector(`[data-widget-id="${widgetId}"]`);
            if (toggle) {
                toggle.checked = isVisible;
            }
        }
    }
}

/**
 * Widget yönetimi olay dinleyicilerini ve başlangıç durumunu ayarlar.
 */
export function initializeWidgets() {
    // Başlangıçta widget görünürlüğünü uygula
    applyWidgetVisibility();

    // Ayarlar panelindeki her bir toggle için olay dinleyici ekle
    dom.widgetManager.addEventListener('change', (event) => {
        const toggle = event.target;
        if (toggle.matches('input[type="checkbox"][data-widget-id]')) {
            const widgetId = toggle.dataset.widgetId;
            const settings = getWidgetVisibilitySettings();
            settings[widgetId] = toggle.checked;
            storage.setStoredJSON('widgetVisibility', settings);
            applyWidgetVisibility(); // Değişiklik sonrası tüm widget'ların durumunu yeniden uygula
        }
    });
}