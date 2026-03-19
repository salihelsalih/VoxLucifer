// offscreen.js - VoxLucifer Deepgram Ses İşleme
let socket = null;
let audioContext = null;
let stream = null;

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.action === 'OFFSCREEN_START') {
    startDeepgram(message.apiKey, message.streamId, message.lang);
  }
  if (message.action === 'OFFSCREEN_STOP') {
    stopDeepgram();
  }
});

async function startDeepgram(apiKey, streamId, lang) {
  if (!apiKey) {
    notifyStatus("⚠️ API Anahtarı Eksik — Eklenti ayarlarından girin.", "error");
    return;
  }

  // tr-TR → tr gibi normalize et (Deepgram kısa kodu tercih eder)
  const language = (lang || 'tr').split('-')[0];

  try {
    notifyStatus("🔗 Deepgram'a bağlanıyor...", "busy");

    const wsUrl = `wss://api.deepgram.com/v1/listen?language=${language}&smart_format=true&model=nova-2&encoding=linear16&sample_rate=16000`;
    socket = new WebSocket(wsUrl, ['token', apiKey]);

    socket.onopen = async () => {
      notifyStatus("🎙️ Dinleniyor...", "active");

      try {
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
      } catch (mediaErr) {
        notifyStatus("⚠️ Ses yakalama hatası: " + mediaErr.message, "error");
        socket.close();
        return;
      }

      audioContext = new AudioContext({ sampleRate: 16000 });
      await audioContext.resume();

      const source = audioContext.createMediaStreamSource(stream);
      // Kullanıcı sesi duymaya devam etsin
      source.connect(audioContext.destination);

      // AudioWorklet ile ses verisi al
      await audioContext.audioWorklet.addModule('audio-processor.js');
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');

      workletNode.port.onmessage = (event) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        const input = event.data;
        const pcm = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          pcm[i] = Math.max(-1, Math.min(1, input[i])) * 0x7FFF;
        }
        socket.send(pcm.buffer);
      };

      source.connect(workletNode);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const transcript = data.channel?.alternatives[0]?.transcript;
        if (!transcript) return;

        if (data.is_final) {
          chrome.runtime.sendMessage({
            action: 'TRANSCRIPT_UPDATE',
            text: transcript + ' ',
            isFinal: true
          });
        } else {
          chrome.runtime.sendMessage({
            action: 'TRANSCRIPT_UPDATE',
            text: '',
            interim: transcript,
            isFinal: false
          });
        }
      } catch (e) {}
    };

    socket.onerror = (err) => {
      notifyStatus("⚠️ Deepgram bağlantı hatası. API anahtarınızı kontrol edin.", "error");
    };

    socket.onclose = (ev) => {
      // Anormal kapanma (1000 = normal)
      if (ev.code !== 1000) {
        notifyStatus("⚠️ Bağlantı kesildi (kod: " + ev.code + ")", "error");
      }
      stopDeepgram();
    };

  } catch (err) {
    notifyStatus("⚠️ Hata: " + err.message, "error");
  }
}

function stopDeepgram() {
  if (socket) { socket.close(); socket = null; }
  if (audioContext) { audioContext.close(); audioContext = null; }
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  notifyStatus("⏹ Durduruldu", "");
}

function notifyStatus(text, type) {
  chrome.runtime.sendMessage({ action: 'STATUS_UPDATE', text, type });
}
