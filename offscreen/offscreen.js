// offscreen.js - Plan D: Deepgram (Free 200h/month) Implementation
let socket = null;
let audioContext = null;
let stream = null;

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.action === 'OFFSCREEN_START_VOSK') {
    startDeepgram(message.apiKey, message.streamId);
  }
  if (message.action === 'OFFSCREEN_STOP_VOSK') {
    stopDeepgram();
  }
});

async function startDeepgram(apiKey, streamId) {
  if (!apiKey) {
    notifyStatus("⚠️ Ayarlardan OpenAI/Deepgram Anahtarı Girin", "error");
    return;
  }

  try {
    notifyStatus("🚀 Deepgram Bağlanıyor...", "busy");

    // Deepgram WebSocket URL (Parametreleri netleştirelim)
    const url = 'wss://api.deepgram.com/v1/listen?language=en&smart_format=true&model=nova-2&encoding=linear16&sample_rate=16000';
    socket = new WebSocket(url, ['token', apiKey]);

    socket.onopen = async () => {
      notifyStatus("📡 Dinleniyor (Deepgram)", "active");
      
      // Tab sesini yakala
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'tab',
            chromeMediaSourceId: streamId
          }
        },
        video: false
      });

      audioContext = new AudioContext({ sampleRate: 16000 });
      await audioContext.resume(); // Safari/Chrome autoplay policy
      
      const source = audioContext.createMediaStreamSource(stream);

      // SESİN DUYULMASI İÇİN: Source'u doğrudan destination'a bağla
      // Bu sayede yakalanan ses hoparlöre de gider.
      source.connect(audioContext.destination);

      // AudioWorklet modülünü yükle
      await audioContext.audioWorklet.addModule('audio-processor.js');
      
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');

      workletNode.port.onmessage = (event) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) return;

        const input = event.data;
        // Float32 -> Int16 dönüşümü
        const pcmData = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, input[i])) * 0x7FFF;
        }
        socket.send(pcmData.buffer);
      };

      source.connect(workletNode);
    };

    socket.onmessage = (message) => {
      const received = JSON.parse(message.data);
      const transcript = received.channel?.alternatives[0]?.transcript;
      
      if (transcript && received.is_final) {
        chrome.runtime.sendMessage({
          action: 'TRANSCRIPT_UPDATE',
          text: transcript + ' ',
          isFinal: true
        });
      } else if (transcript) {
        chrome.runtime.sendMessage({
          action: 'TRANSCRIPT_UPDATE',
          text: '',
          interim: transcript,
          isFinal: false
        });
      }
    };

    socket.onerror = (err) => {
      console.error('[Offscreen] Deepgram Hatası:', err);
      notifyStatus("⚠️ Bağlantı Hatası", "error");
    };

    socket.onclose = () => {
      console.log('[Offscreen] Deepgram Kapandı');
      stopDeepgram();
    };

  } catch (err) {
    console.error('[Offscreen] Başlatma Hatası:', err);
    notifyStatus("⚠️ Hata: " + err.message, "error");
  }
}

function stopDeepgram() {
  if (socket) {
    socket.close();
    socket = null;
  }
  if (audioContext) audioContext.close();
  if (stream) stream.getTracks().forEach(track => track.stop());
  notifyStatus("⏹ Durduruldu", "");
}

function notifyStatus(text, type) {
  chrome.runtime.sendMessage({ action: 'STATUS_UPDATE', text, type });
}
