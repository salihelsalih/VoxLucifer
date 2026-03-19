// content.js - VoxLucifer Anti-Cheat Bypass
let cheatConfig = { mode: false, domains: [] };

// Ayarları başlangıçta bir kez çek
chrome.storage.local.get(['cheatMode', 'cheatDomains'], (res) => {
    cheatConfig.mode = res.cheatMode || false;
    cheatConfig.domains = res.cheatDomains || ['uzak.mehmetakif.edu.tr'];

    if (cheatConfig.mode && isTargetPage()) {
        applyCheatBypass();
    }
});

function isTargetPage() {
    return cheatConfig.domains.some(d => window.location.hostname.includes(d));
}

function applyCheatBypass() {


    // 1. Sağ Tık Engeli Kaldır (Global)
    window.addEventListener('contextmenu', (e) => e.stopImmediatePropagation(), true);

    // 2. Klavye ve Kopyala/Yapıştır Engeli Kaldır
    const handleKeyEvents = (e) => {
        const isAltShiftV = e.altKey && e.shiftKey && (e.key === 'v' || e.key === 'V' || e.code === 'KeyV');
        const isCopyPaste = (e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.code === 'KeyC' || e.code === 'KeyV' || e.code === 'KeyX');

        if (isAltShiftV || isCopyPaste) {
            e.stopImmediatePropagation();
            if (isAltShiftV && e.type === 'keydown') {
                chrome.runtime.sendMessage({ action: 'OPEN_POPUP_WINDOW' }).catch(() => {});
            }
        }
    };
    window.addEventListener('keydown', handleKeyEvents, true);
    window.addEventListener('keyup', handleKeyEvents, true);
    window.addEventListener('keypress', handleKeyEvents, true);

    // 3. Fare ve Seçim Engellerini Kaldır
    const blockEvents = ['copy', 'paste', 'cut', 'selectstart', 'dragstart', 'drop', 'mousedown', 'mouseup'];
    blockEvents.forEach(evt => {
        window.addEventListener(evt, (e) => e.stopImmediatePropagation(), true);
    });

    // 4. Uyarıları (Alert) Sustur — harici inject.js ile (CSP uyumlu)
    const scriptEl = document.createElement('script');
    scriptEl.src = chrome.runtime.getURL('inject.js');
    scriptEl.onload = function() { this.remove(); };
    (document.head || document.documentElement).appendChild(scriptEl);

    // 5. CSS ile Seçimi Zorla Aç
    const style = document.createElement('style');
    style.innerHTML = `
        * {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
            pointer-events: auto !important;
        }
    `;
    document.documentElement.appendChild(style);

    // 6. Body seviyesindeki engelleri temizle
    if (document.body) {
        document.body.style.userSelect = 'text';
        document.body.onselectstart = () => true;
        document.body.oncontextmenu = () => true;
        document.body.oncopy = () => true;
        document.body.onpaste = () => true;
    }
}
