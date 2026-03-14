# UZEM_Mod Project

## Proje Nedir?
Bu proje, tarayıcıda çalışan bir web sitesindeki ses (audio) akışını dinleyen ve bu sesi eş zamanlı (veya kaydederek) metne (Speech-to-Text) dönüştüren bir tarayıcı eklentisidir. Özellikle eğitim platformları (UZEM vb.) veya video içerikli sitelerde sesli içeriği metin olarak takip etmek için tasarlanmıştır.

## Dosya Yapısı ve Görevleri
Proje dizini ve dosyaların işlevleri aşağıda belirtilmiştir:

- **manifest.json**: Eklentinin kimlik kartıdır. İzinler, dosyalar ve eklenti ayarları burada tanımlanır.
- **content.js**: Web sayfasının içine sızan script. Sayfadaki ses elementlerini tespit eder veya sayfa içeriğiyle etkileşime girer.
- **background.js**: Arka planda sürekli çalışan script. Ses yakalama (Tab Capture) ve API iletişimini yönetir.
- **popup/**: Eklenti simgesine tıklandığında açılan küçük arayüz.
  - `popup.html`: Arayüz tasarımı.
  - `popup.js`: Arayüz mantığı, başlatma/durdurma butonları.
  - `popup.css`: Görsel düzenlemeler.
- **icons/**: Eklenti simgeleri.

## Teknik Detaylar
- **Ses Yakalama**: `chrome.tabCapture` veya `MediaStream` API kullanılarak aktif sekmedeki ses yakalanır.
- **Dönüştürme**: Google Cloud Speech-to-Text API, OpenAI Whisper veya tarayıcının yerleşik `Web Speech API`'ı kullanılabilir.
