// background.js - Persistence & Side Panel Support
let isCapturing = false;
let fullTranscript = '';
let currentTitle = '';
let currentStartTime = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'START_CAPTURE') {
    currentTitle = message.title || 'Adsız Oturum';
    currentStartTime = Date.now();
    handleStart(message.streamId, message.lang, sendResponse);
    return true;
  }

  if (message.action === 'STOP_CAPTURE') {
    saveToHistory(); // Durdurunca kaydet
    handleStop(sendResponse);
    return true;
  }

  if (message.action === 'TRANSCRIPT_UPDATE') {
    if (message.isFinal) {
      console.log('[Background] Metin eklendi:', message.text.substring(0, 20) + '...');
      fullTranscript += message.text;
    }
  }

  if (message.action === 'GET_SESSION_DATA') {
    sendResponse({
      isCapturing,
      fullTranscript,
      currentTitle
    });
  }

  if (message.action === 'CLEAR_TRANSCRIPT') {
    fullTranscript = '';
  }

  // GEÇMİŞ İŞLEMLERİ
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

async function saveToHistory() {
  const transcriptToSave = fullTranscript.trim();
  console.log('[Background] Kayıt denemesi. Uzunluk:', transcriptToSave.length);
  
  if (transcriptToSave.length < 2) {
    console.log('[Background] Metin çok kısa, kaydedilmedi.');
    return;
  }

  const now = new Date();
  const timeString = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = now.toLocaleDateString('tr-TR');

  const session = {
    id: Date.now(),
    title: `Oturum ${timeString}`, 
    date: dateString + ' ' + timeString,
    transcript: transcriptToSave,
    wordCount: transcriptToSave.split(/\s+/).filter(Boolean).length
  };

  chrome.storage.local.get(['transcriptHistory'], (result) => {
    let history = result.transcriptHistory || [];
    if (!Array.isArray(history)) history = [];
    
    history.unshift(session);
    const newHistory = history.slice(0, 50);
    
    chrome.storage.local.set({ 'transcriptHistory': newHistory }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Background] Kayıt Hatası:', chrome.runtime.lastError);
      } else {
        console.log('[Background] Başarıyla kaydedildi. Liste uzunluğu:', newHistory.length);
        fullTranscript = ''; // Sadece başarı durumunda temizle
      }
    });
  });
}

// Eklenti simgesine tıklandığında Yan Paneli aç (Sadece Chrome destekler)
const sPanel = chrome['sidePanel'];
if (sPanel && sPanel['setPanelBehavior']) {
  sPanel['setPanelBehavior']({ openPanelOnActionClick: true }).catch((error) => console.error(error));
}

async function handleStart(streamId, lang, sendResponse) {
  try {
    console.log('[Background] handleStart - StreamId:', streamId);
    
    const { apiKey } = await chrome.storage.local.get(['apiKey']);

    const existing = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    if (existing.length === 0) {
      const offscreen = chrome['offscreen'];
      if (offscreen && offscreen['createDocument']) {
        await offscreen['createDocument']({
          url: 'offscreen/offscreen.html',
          reasons: ['USER_MEDIA'], 
          justification: 'Deepgram ses tanıma servisini çalıştırmak için'
        });
      }
    }

    chrome.runtime.sendMessage({ 
      action: 'OFFSCREEN_START_VOSK', 
      lang, 
      streamId,
      apiKey
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn('[Background] Offscreen mesaj hatası:', chrome.runtime.lastError);
      }
    });

    isCapturing = true;
    updateIcon(true);
    sendResponse({ success: true });
  } catch (e) {
    sendResponse({ success: false, error: e.message });
  }
}

async function handleStop(sendResponse) {
  isCapturing = false;
  updateIcon(false);
  chrome.runtime.sendMessage({ action: 'OFFSCREEN_STOP_VOSK' }, () => {
    if (chrome.runtime.lastError) {
      // Hata mesajını sessizce yut
    }
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
  chrome.action.setIcon({ path: path });
}
