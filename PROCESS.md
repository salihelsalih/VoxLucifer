# Proje İlerleme Planı (PROCESS.md)

Bu dosya projenin geliştirme aşamalarını ve mevcut durumu takip etmek için kullanılır. Tamamlanan adımlar `[x]` ile işaretlenir.

## 1. Hazırlık ve Altyapı
- [x] `manifest.json` dosyasının oluşturulması ve temel izinlerin (`tabCapture`, `storage`) tanımlanması.
- [x] İkonların ve temel klasör yapısının (`popup/`, `icons/`, `offscreen/`) hazırlanması.
- [x] Geliştirici modunda eklentinin tarayıcıya yüklenmesi.

## 2. Ücretsiz Ses Yakalama ve İşleme (Plan A: Vosk)
- [x] `manifest.json` tabCapture ve offscreen izinlerinin eklenmesi.
- [x] `vosk.js` kütüphanesinin yerel olarak dahil edilmesi.
- [x] `offscreen.js` içerisinde WASM tabanlı İngilizce modelin yüklenmesi.
- [x] `background.js` üzerinden tab stream aktarımının tamamlanması.

## 3. Metne Dönüştürme (İngilizce Odaklı)
- [x] OpenAI Whisper API bağımlılığı opsiyonel hale getirildi.
- [x] İngilizce model (`en-us`) varsayılan yapıldı.
- [x] Offline transkript işleminin popup'a iletilmesi.

## 4. Kullanıcı Arayüzü (UI)
- [x] `popup.html` üzerinden başlat/durdur butonlarının tasarımı (dark mode, premium).
- [x] Transkriptin popup'ta gösterilmesi + kelime sayıcı, kopyala, temizle butonları.
- [x] **Ayarlar sekmesi**: OpenAI API key girme, dil seçimi, kaydetme.
- [x] Progress bar (8 saniyelik chunk işleme animasyonu).

## 5. Test ve Optimizasyon
- [x] Farklı web sitelerinde (YouTube, UZEM vb.) ses yakalama testleri.
- [x] Chunk süresinin optimize edilmesi (8s → Stabil).
- [x] Hata yönetimi (API key eksik, ağ hatası, 401 unauthorized).

## 6. Yayınlama ve Final
- [x] Eklentinin temizlenmesi (Gereksiz dosyaların kaldırılması).
- [x] README.md ve kullanım kılavuzunun hazırlanması.
