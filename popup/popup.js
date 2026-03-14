// popup.js - Persistence & Side Panel / Pop-out Edition
document.addEventListener('DOMContentLoaded', () => {
  const startBtn      = document.getElementById('startBtn');
  const stopBtn       = document.getElementById('stopBtn');
  const clearBtn      = document.getElementById('clearBtn');
  const copyBtn       = document.getElementById('copyBtn');
  const statusSpan    = document.getElementById('status');
  const statusDot     = document.getElementById('statusDot');
  const transcriptDiv = document.getElementById('transcript');
  const wordCountSpan = document.getElementById('wordCount');
  const langSelect    = document.getElementById('langSelect');
  const progressBar   = document.getElementById('progressBar');
  const progressFill  = document.getElementById('progressFill');
  const progressLabel = document.getElementById('progressLabel');
  const popoutBtn     = document.getElementById('popoutBtn');

  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const apiKeyInput     = document.getElementById('apiKeyInput');
  const toggleKeyBtn    = document.getElementById('toggleKeyBtn');
  const saveMsg         = document.getElementById('saveMsg');

  const historyList   = document.getElementById('historyList');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');

  let fullTranscript = '';
  let currentTitle = '';

  // 1. OTURUM VERİLERİNİ GERİ YÜKLE
  chrome.runtime.sendMessage({ action: 'GET_SESSION_DATA' }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('[Popup] session_data okunamadı (Arka plan henüz hazır olmayabilir):', chrome.runtime.lastError);
      return;
    }
    if (response) {
      if (response.fullTranscript) {
        fullTranscript = response.fullTranscript;
        updateTranscriptDisplay('');
      }
      if (response.isCapturing) {
        setStatus('Dinleniyor...', 'active');
        startBtn.disabled = true;
        stopBtn.disabled = false;
        progressBar.style.display = 'block';
      }
      if (response.currentTitle) {
        currentTitle = response.currentTitle;
      }
    }
  });

  // API Anahtarını Yükle
  chrome.storage.local.get(['apiKey'], (result) => {
    if (result.apiKey) {
      document.getElementById('apiKeyInput').value = result.apiKey;
    }
  });

  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      document.getElementById('tab-' + tabId).classList.add('active');

      if (tabId === 'history') {
        loadHistory();
      }
    });
  });

  function loadHistory() {
    console.log('[Popup] Geçmiş yükleniyor...');
    chrome.storage.local.get(['transcriptHistory'], (result) => {
      const history = result.transcriptHistory || [];
      console.log('[Popup] Hafızadan çekilen kayıt sayısı:', history.length);
      displayHistory(history);
    });
  }

  function displayHistory(history) {
    if (!historyList) {
      console.error('[Popup] historyList elementi bulunamadı!');
      return;
    }
    
    historyList.textContent = '';
    
    if (!history || history.length === 0) {
      console.log('[Popup] Gösterilecek kayıt yok.');
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'empty-msg';
      emptyMsg.textContent = '🏖️ Henüz kaydedilmiş bir oturum yok.';
      historyList.appendChild(emptyMsg);
      return;
    }

    console.log('[Popup] Kayıtlar listeleniyor...');
    history.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'history-item';
      
      const sessionTitle = item.title || `Oturum #${index + 1}`;
      const sessionDate = item.date || 'Bilinmeyen Tarih';
      const previewText = item.transcript ? item.transcript.substring(0, 100) : 'İçerik yok';
      
      const headerDiv = document.createElement('div');
      headerDiv.className = 'history-item-header';
      
      const titleDiv = document.createElement('div');
      titleDiv.className = 'history-item-title';
      titleDiv.textContent = sessionTitle;
      
      const dateDiv = document.createElement('div');
      dateDiv.className = 'history-item-date';
      dateDiv.textContent = sessionDate;
      
      headerDiv.appendChild(titleDiv);
      headerDiv.appendChild(dateDiv);
      
      const previewDiv = document.createElement('div');
      previewDiv.className = 'history-item-preview';
      previewDiv.textContent = previewText + '...';
      
      const footerDiv = document.createElement('div');
      footerDiv.className = 'history-item-footer';
      
      const spanDiv = document.createElement('span');
      spanDiv.textContent = '📏 ' + (item.wordCount || 0) + ' kelime';
      
      const btnEl = document.createElement('button');
      btnEl.className = 'copy-small-btn';
      btnEl.dataset.id = item.id;
      btnEl.textContent = '📋';
      
      footerDiv.appendChild(spanDiv);
      footerDiv.appendChild(btnEl);
      
      el.appendChild(headerDiv);
      el.appendChild(previewDiv);
      el.appendChild(footerDiv);
      
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('copy-small-btn')) return;
        fullTranscript = item.transcript;
        updateTranscriptDisplay('');
        document.querySelector('[data-tab="main"]').click();
      });

      historyList.appendChild(el);
    });

    // Kopyalama butonlarını aktif et
    document.querySelectorAll('.copy-small-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const item = history.find(h => h.id == id);
        if (item && item.transcript) {
          navigator.clipboard.writeText(item.transcript);
          btn.textContent = '✅';
          setTimeout(() => btn.textContent = '📋', 1500);
        }
      });
    });
  }
  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Tüm geçmişi silmek istediğinize emin misiniz?')) {
      chrome.runtime.sendMessage({ action: 'DELETE_HISTORY' }, () => {
        loadHistory();
      });
    }
  });

  // Transkript ve Durum Güncelleme
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'TRANSCRIPT_UPDATE') {
      if (message.isFinal) {
        fullTranscript += message.text;
      }
      updateTranscriptDisplay(message.interim || '');
    }

    if (message.action === 'STATUS_UPDATE') {
      setStatus(message.text, message.type || '');
      
      // Model yüklenirken progress bar göster
      if (message.text.includes('Yükleniyor')) {
          progressBar.style.display = 'block';
          progressLabel.textContent = message.text;
          progressFill.style.width = '100%';
      }

      if (message.type === 'active') {
          progressBar.style.display = 'block';
          progressLabel.textContent = '🎙️ Ses Yakalanıyor...';
      }

      if (message.type === 'error') {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        progressBar.style.display = 'none';
      }
    }
  });

  function updateTranscriptDisplay(interim) {
    const placeholder = transcriptDiv.querySelector('.placeholder');
    if (placeholder && (fullTranscript || interim)) placeholder.remove();

    transcriptDiv.textContent = fullTranscript + interim;
    transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
    
    const words = fullTranscript.trim().split(/\s+/).filter(Boolean).length;
    updateWordCount(words);
  }

  // BAŞLAT
  startBtn.addEventListener('click', () => {
    // 1. Önce aktif sekmeyi bul
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].id) {
        setStatus('Hata: Aktif sekme bulunamadı', 'error');
        startBtn.disabled = false;
        return;
      }
      
      const activeTabId = tabs[0].id;
      currentTitle = tabs[0].title || 'Youtube / Video';
      setStatus('Yetki alınıyor...', '');
      startBtn.disabled = true;

      // 2. DOĞRUDAN BURADA Stream ID al (Kullanıcı etkileşimi burada)
      const tabCap = chrome['tabCapture'];
      if (tabCap && tabCap['getMediaStreamId']) {
        tabCap['getMediaStreamId']({ targetTabId: activeTabId }, (streamId) => {
          if (!streamId) {
            setStatus('Hata: Ses izni alınamadı (Sekmeyi yenileyip deneyin)', 'error');
            startBtn.disabled = false;
            return;
          }

          console.log('Stream ID Alındı:', streamId);

          // 3. ID'yi Background'a gönder
          chrome.runtime.sendMessage({
            action: 'START_CAPTURE',
            streamId: streamId, // ID'yi biz bulup gönderiyoruz
            title: currentTitle,
            lang: langSelect.value
          }, (response) => {
            if (response && response.success) {
              setStatus('Dinleniyor...', 'active');
              stopBtn.disabled = false;
              progressBar.style.display = 'block';
            } else {
              startBtn.disabled = false;
              setStatus('Hata: ' + (response ? response.error : 'Bilinmiyor'), 'error');
            }
          });
        });
      } else {
        setStatus('Hata: Tarayıcınız bu apiyi desteklemiyor.', 'error');
        startBtn.disabled = false;
      }
    });
  });

  // DURDUR
  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'STOP_CAPTURE' }, () => {
      setStatus('Kaydediliyor...', '');
      setTimeout(() => {
        fullTranscript = ''; 
        updateTranscriptDisplay('');
        setStatus('Kayıt Geçmişe Eklendi ✅', '');
        startBtn.disabled = false;
        stopBtn.disabled = true;
        progressBar.style.display = 'none';
        
        // Eğer o an geçmiş sekmesindeyse listeyi yenile
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab && activeTab.dataset.tab === 'history') {
          loadHistory();
        }
      }, 800);
    });
  });

  // TEMİZLE
  clearBtn.addEventListener('click', () => {
    fullTranscript = '';
    chrome.runtime.sendMessage({ action: 'CLEAR_TRANSCRIPT' }, () => {
      if (chrome.runtime.lastError) { /* Sessiz hata yutucu */ }
    });
    transcriptDiv.textContent = '';
    const spanEl = document.createElement('span');
    spanEl.className = 'placeholder';
    spanEl.textContent = 'Metin temizlendi.';
    transcriptDiv.appendChild(spanEl);
    updateWordCount(0);
  });

  // AYARLARI KAYDET
  saveSettingsBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    chrome.storage.local.set({ apiKey: key }, () => {
      saveMsg.textContent = '✅ Ayarlar kaydedildi.';
      saveMsg.style.color = '#4ade80';
      setTimeout(() => saveMsg.textContent = '', 2000);
    });
  });

  // ŞİFRE GÖSTER/GİZLE
  toggleKeyBtn.addEventListener('click', () => {
    const type = apiKeyInput.type === 'password' ? 'text' : 'password';
    apiKeyInput.type = type;
    toggleKeyBtn.textContent = type === 'password' ? '👁️' : '🙈';
  });

  // KOPYALA
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(fullTranscript).then(() => {
      copyBtn.textContent = '✅ Kopyalandı';
      setTimeout(() => copyBtn.textContent = '📋 Kopyala', 2000);
    });
  });

  // POP-OUT (Ayrı Pencere)
  popoutBtn.addEventListener('click', () => {
    chrome.windows.create({
      url: chrome.runtime.getURL('popup/popup.html'),
      type: 'popup',
      width: 400,
      height: 600
    });
  });

  function setStatus(text, type) {
    statusSpan.textContent = text;
    statusDot.className = 'status-dot' + (type ? ' ' + type : '');
  }

  function updateWordCount(n) {
    if (wordCountSpan) wordCountSpan.textContent = n + ' kelime';
  }
});
