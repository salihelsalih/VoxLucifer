// background.js - VoxLucifer Background Service Worker
let isCapturing = false;
let fullTranscript = '';
let currentTitle = '';
let currentStartTime = null;

// --- CONTEXT MENU ---
function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "toggle_capture",
      title: isCapturing ? "VoxLucifer Dinlemeyi Durdur" : "VoxLucifer ile Dinlemeyi Başlat",
      contexts: ["all"]
    });
  });
}

chrome.runtime.onInstalled.addListener(() => createContextMenu());
chrome.runtime.onStartup.addListener(() => createContextMenu());

function updateContextMenu() {
  chrome.contextMenus.update("toggle_capture", {
    title: isCapturing ? "VoxLucifer Dinlemeyi Durdur" : "VoxLucifer ile Dinlemeyi Başlat"
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "toggle_capture") return;

  if (isCapturing) {
    saveToHistory();
    handleStop();
    return;
  }

  const tabUrl = tab.url || '';
  if (tabUrl.startsWith('chrome://') || tabUrl.startsWith('edge://') || tabUrl.startsWith('about:') || tabUrl === '') {
    return;
  }

  currentTitle = tab.title || 'Adsız Oturum';
  currentStartTime = Date.now();

  const tabCap = chrome.tabCapture;
  if (tabCap && tabCap.getMediaStreamId) {
    tabCap.getMediaStreamId({ targetTabId: tab.id }, (streamId) => {
      if (chrome.runtime.lastError || !streamId) return;
      handleStart(streamId, 'tr', () => {});
    });
  }
});

// --- MESSAGE HANDLER ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'START_CAPTURE') {
    currentTitle = message.title || 'Adsız Oturum';
    currentStartTime = Date.now();
    handleStart(message.streamId, message.lang, sendResponse);
    return true;
  }

  if (message.action === 'STOP_CAPTURE') {
    saveToHistory();
    handleStop(sendResponse);
    return true;
  }

  if (message.action === 'OPEN_POPUP_WINDOW') {
    chrome.windows.create({
      url: chrome.runtime.getURL('popup/popup.html'),
      type: 'popup',
      width: 420,
      height: 600
    });
    return true;
  }

  if (message.action === 'TRANSCRIPT_UPDATE') {
    if (message.isFinal) {
      fullTranscript += message.text;
    }
  }

  if (message.action === 'GET_SESSION_DATA') {
    sendResponse({ isCapturing, fullTranscript, currentTitle });
  }

  if (message.action === 'TRANSCRIBE_BLOB') {
    chrome.storage.local.get(['apiKey'], async (data) => {
      if (!data.apiKey) {
        chrome.storage.local.set({ lastTranscription: "Hata: API Anahtarını eklenti ayarlarından girin." });
        return;
      }
      try {
        const binaryString = atob(message.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&language=tr&smart_format=true', {
          method: 'POST',
          headers: { 'Authorization': `Token ${data.apiKey}`, 'Content-Type': 'audio/webm' },
          body: bytes.buffer
        });
        const result = await response.json();
        const text = result.results?.channels[0]?.alternatives[0]?.transcript || 'Ses tespit edilemedi.';
        fullTranscript += text;
        chrome.storage.local.set({ lastTranscription: text });
      } catch (err) {
        chrome.storage.local.set({ lastTranscription: "Hata: Sunucuya ulaşılamadı. " + err.message });
      }
    });
    return true;
  }

  if (message.action === 'TRANSCRIBE_URL') {
    chrome.storage.local.get(['apiKey'], async (data) => {
      if (!data.apiKey) {
        chrome.storage.local.set({ lastTranscription: "Hata: API Anahtarını eklenti ayarlarından girin." });
        return;
      }
      try {
        const mediaFetch = await fetch(message.url, { credentials: 'include' });
        if (!mediaFetch.ok) {
          throw new Error(`Dosya indirilemedi (${mediaFetch.status}).`);
        }
        const mediaBlob = await mediaFetch.blob();
        const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&language=tr&smart_format=true', {
          method: 'POST',
          headers: { 'Authorization': `Token ${data.apiKey}` },
          body: mediaBlob
        });
        const result = await response.json();
        const text = result.results?.channels[0]?.alternatives[0]?.transcript || 'Ses tespit edilemedi.';
        fullTranscript += text;
        chrome.storage.local.set({ lastTranscription: text });
      } catch (err) {
        chrome.storage.local.set({ lastTranscription: "Hata: Sunucuya ulaşılamadı. " + err.message });
      }
    });
    return true;
  }

  if (message.action === 'CLEAR_TRANSCRIPT') {
    fullTranscript = '';
  }

  if (message.action === 'GET_HISTORY') {
    chrome.storage.local.get(['transcriptHistory'], (result) => {
      sendResponse({ history: result.transcriptHistory || [] });
    });
    return true;
  }

  if (message.action === 'DELETE_HISTORY') {
    chrome.storage.local.set({ transcriptHistory: [] }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// --- HISTORY ---
async function saveToHistory() {
  const transcriptToSave = fullTranscript.trim();
  if (transcriptToSave.length < 2) return;

  const now = new Date();
  const timeString = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = now.toLocaleDateString('tr-TR');

  const session = {
    id: Date.now(),
    title: currentTitle || `Oturum ${timeString}`,
    date: dateString + ' ' + timeString,
    transcript: transcriptToSave,
    wordCount: transcriptToSave.split(/\s+/).filter(Boolean).length
  };

  chrome.storage.local.get(['transcriptHistory'], (result) => {
    let history = result.transcriptHistory || [];
    if (!Array.isArray(history)) history = [];
    history.unshift(session);
    const newHistory = history.slice(0, 50);

    chrome.storage.local.set({ transcriptHistory: newHistory, lastTranscription: transcriptToSave }, () => {
      if (chrome.runtime.lastError) return;

      // Sayfada toast göster ve panoya kopyala
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (textToCopy) => {
              navigator.clipboard.writeText(textToCopy).then(() => {
                const div = document.createElement('div');
                const wordCount = textToCopy.trim().split(/\s+/).filter(Boolean).length;
                div.textContent = '🎙️ VoxLucifer: Kayıt tamamlandı! (' + wordCount + ' kelime — panoya kopyalandı)';
                Object.assign(div.style, {
                  position: 'fixed', bottom: '20px', left: '20px',
                  backgroundColor: 'rgba(10,12,30,0.92)', color: 'white',
                  padding: '12px 18px', borderRadius: '10px', zIndex: '2147483647',
                  fontFamily: 'sans-serif', fontSize: '14px',
                  boxShadow: '0 4px 16px rgba(108,99,255,0.4)',
                  border: '1px solid rgba(108,99,255,0.5)',
                  opacity: '1', transition: 'opacity 0.5s ease'
                });
                document.body.appendChild(div);
                setTimeout(() => {
                  div.style.opacity = '0';
                  setTimeout(() => div.remove(), 500);
                }, 3500);
              }).catch(() => {});
            },
            args: [transcriptToSave]
          });
        }
      });

      fullTranscript = '';
    });
  });
}

// --- SIDE PANEL ---
const sPanel = chrome['sidePanel'];
if (sPanel && sPanel['setPanelBehavior']) {
  sPanel['setPanelBehavior']({ openPanelOnActionClick: true }).catch(() => {});
}

// --- CAPTURE HANDLERS ---
async function handleStart(streamId, lang, sendResponse) {
  try {
    const { apiKey } = await chrome.storage.local.get(['apiKey']);

    if (!apiKey) {
      sendResponse({ success: false, error: 'API anahtarı bulunamadı. Lütfen Ayarlar sekmesinden girin.' });
      return;
    }

    const existing = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    if (existing.length === 0) {
      const offscreen = chrome['offscreen'];
      if (offscreen && offscreen['createDocument']) {
        await offscreen['createDocument']({
          url: 'offscreen/offscreen.html',
          reasons: ['USER_MEDIA'],
          justification: 'Deepgram ses tanıma servisini çalıştırmak için'
        });
        // Offscreen dokümanın tamamen yüklenmesi için bekle
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    chrome.runtime.sendMessage({
      action: 'OFFSCREEN_START',
      lang,
      streamId,
      apiKey
    }, () => { if (chrome.runtime.lastError) {} });

    isCapturing = true;
    updateIcon(true);
    updateContextMenu();
    sendResponse({ success: true });
  } catch (e) {
    sendResponse({ success: false, error: e.message });
  }
}

async function handleStop(sendResponse) {
  isCapturing = false;
  updateIcon(false);
  updateContextMenu();

  chrome.runtime.sendMessage({ action: 'OFFSCREEN_STOP' }, () => {
    if (chrome.runtime.lastError) {}
  });

  const existing = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (existing.length > 0) {
    const offscreen = chrome['offscreen'];
    if (offscreen && offscreen['closeDocument']) {
      await offscreen['closeDocument']();
    }
  }

  if (sendResponse) sendResponse({ success: true });
}

function updateIcon(recording) {
  const path = recording ? {
    "16": "icons/recording16.png",
    "48": "icons/recording48.png",
    "128": "icons/recording128.png"
  } : {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  };
  chrome.action.setIcon({ path });
}

// --- ANTI-MINIMAL WINDOW (Sınav sitesi popup koruması) ---
chrome.windows.onCreated.addListener((window) => {
  if (window.type !== 'popup') return;

  setTimeout(() => {
    chrome.tabs.query({ windowId: window.id }, (tabs) => {
      if (chrome.runtime.lastError || !tabs || tabs.length === 0) return;

      const url = tabs[0].url || tabs[0].pendingUrl;
      if (!url || url.startsWith('chrome-extension://') || url === 'about:blank') return;

      chrome.storage.local.get(['cheatMode', 'cheatDomains'], (result) => {
        if (!result.cheatMode) return;

        const domains = result.cheatDomains || ['uzak.mehmetakif.edu.tr'];
        const isTargetSite = domains.some(d => url.includes(d));
        if (!isTargetSite) return;

        chrome.windows.getLastFocused({ windowTypes: ['normal'] }, (lastWindow) => {
          if (lastWindow && lastWindow.id) {
            chrome.tabs.create({ windowId: lastWindow.id, url, active: true });
          } else {
            chrome.windows.create({ type: 'normal', url });
          }
          chrome.windows.remove(window.id);
        });
      });
    });
  }, 400);
});
