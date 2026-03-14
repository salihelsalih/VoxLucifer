// content.js - UZEM Mod Audio Capture
let mediaRecorder = null;
let audioChunks = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'START_RECORDING') {
    startRecording(message.lang);
    sendResponse({ status: 'started' });
  } else if (message.action === 'STOP_RECORDING') {
    stopRecording();
    sendResponse({ status: 'stopped' });
  }
});

function startRecording(lang) {
  // Sayfadaki video veya audio elementini bul
  const mediaElements = [...document.querySelectorAll('video, audio')].filter(el => !el.muted && el.readyState >= 1);
  
  if (mediaElements.length === 0) {
    console.error('[UZEM] Aktif ses/video öğesi bulunamadı.');
    chrome.runtime.sendMessage({ action: 'STATUS_UPDATE', text: '⚠️ Medya bulunamadı', type: 'error' });
    return;
  }

  // İlk bulunan aktif medyayı kullan (Genelde ana video)
  const targetMedia = mediaElements[0];
  console.log('[UZEM] Kayıt başlatılıyor:', targetMedia);

  try {
    let stream;
    if (targetMedia.captureStream) {
        stream = targetMedia.captureStream();
    } else if (targetMedia.webkitCaptureStream) {
        stream = targetMedia.webkitCaptureStream();
    } else {
        throw new Error('captureStream desteklenmiyor');
    }

    // Audio track al
    const audioStream = new MediaStream(stream.getAudioTracks());
    
    mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        // Blobu base64'e çevirip gönder (veya doğrudan blob gönderilebilirse gönder - MV3'te mesajlaşma sınırlı olabilir)
        const reader = new FileReader();
        reader.readAsDataURL(event.data);
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1];
          chrome.runtime.sendMessage({
            action: 'AUDIO_CHUNK',
            data: base64data,
            lang: lang
          });
        };
      }
    };

    // 8 saniyelik aralıklarla chunk gönder
    mediaRecorder.start(8000); 
    chrome.runtime.sendMessage({ action: 'STATUS_UPDATE', text: '📡 Kayıt Yapılıyor...', type: 'active' });

  } catch (err) {
    console.error('[UZEM] Kayıt hatası:', err);
    chrome.runtime.sendMessage({ action: 'STATUS_UPDATE', text: '🚫 Hata: ' + err.message, type: 'error' });
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  chrome.runtime.sendMessage({ action: 'STATUS_UPDATE', text: '⏹ Durduruldu', type: '' });
}
