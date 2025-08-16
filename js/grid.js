import * as storage from './storage.js';
import * as dom from './dom.js';
import * as ui from './ui.js';
import * as rss from './rss.js';

let grid;

const WIDGET_LAYOUT_KEY = 'widgetLayout';

/**
 * Saves the current grid layout to localStorage.
 */
function saveLayout() {
    const layout = grid.save(true); // true to save content
    storage.setStoredJSON(WIDGET_LAYOUT_KEY, layout);
}

/**
 * Loads the grid layout from localStorage.
 */
function loadLayout() {
    const layout = storage.getStoredJSON(WIDGET_LAYOUT_KEY);
    if (layout) {
        grid.load(layout);
    }
}

/**
 * Initializes the GridStack instance and sets up event listeners.
 */
export function initGrid() {
    grid = GridStack.init({
        // 12 columns
        column: 12,
        // gap between widgets
        margin: 10,
        // enable resizing
        resizable: {
            handles: 'e, se, s, sw, w'
        },
        // always show resize handles
        alwaysShowResizeHandle: true,
        // float the widgets
        float: true
    });

    loadLayout();

    grid.on('change', () => {
        saveLayout();
    });
}

/**
 * Returns the grid instance.
 * @returns {GridStack}
 */
export function getGrid() {
    return grid;
}

/**
 * Adds a widget to the grid.
 * @param {object} options The options for the widget.
 */
export function addWidget(options) {
    if (!grid) return;
    grid.addWidget(options);
}

/**
 * Loads the initial widgets into the grid.
 */
export function loadInitialWidgets() {
    const widgets = [
        {
            id: 'greeting-search-widget',
            content: `<div class="grid-stack-item-content"><main> <h1 id="greeting"></h1> <div id="search-container"> <form id="search-form"> <input type="text" id="search-input" placeholder="Arama yap..." autocomplete="off" autofocus data-i18n-key="search_placeholder"> <button type="submit" data-i18n-key="search_button">Ara</button> </form> <div id="autocomplete-suggestions"></div> </div> </main></div>`,
            w: 6,
            h: 2,
            x: 0,
            y: 0
        },
        {
            id: 'quick-links-widget',
            content: `<div class="grid-stack-item-content"><div class="quick-links" id="quick-links-container"></div></div>`,
            w: 6,
            h: 2,
            x: 6,
            y: 0
        },
        {
            id: 'rss-widget',
            content: `<div class="grid-stack-item-content"><div id="rss-widget-container" class="hidden"> <div class="rss-header-container"> <div id="rss-tabs"></div> <button id="rss-refresh-btn" class="hidden" title="Yenile">↻</button> </div> <h2 id="rss-title" data-i18n-key="rss_feed_title"></h2> <div id="rss-content"></div> </div></div>`,
            w: 6,
            h: 4,
            x: 0,
            y: 2
        },
        {
            id: 'custom-widgets-widget',
            content: `<div class="grid-stack-item-content"><div id="custom-widget-area"></div></div>`,
            w: 6,
            h: 4,
            x: 6,
            y: 2
        }
    ];

    widgets.forEach(widget => {
        addWidget(widget);
    });

    ui.updateGreeting();
    ui.updateSearchPlaceholder();
    ui.loadAndRenderLinks();
    ui.renderCustomWidgetsOnPage();
    rss.initializeRss();
}
