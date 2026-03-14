# UZEM Mod - Audio to Text Extension

Bu tarayıcı eklentisi, web sitelerindeki (özellikle UZEM, YouTube, Coursera vb.) aktif ses ve video içeriklerini anlık olarak yakalar ve **OpenAI Whisper API** kullanarak yüksek doğrulukla metne dönüştürür.

## Özellikler

- **Anlık Ses Yakalama**: Sayfadaki `video` ve `audio` elementlerini doğrudan yakalar.
- **Whisper API Desteği**: Dünyanın en gelişmiş ses tanıma modellerinden birini kullanır.
- **Çoklu Dil Desteği**: Türkçe, İngilizce, Almanca ve daha fazlası.
- **Premium UI**: Modern, karanlık tema ve kullanıcı dostu arayüz.
- **Gizlilik Odaklı**: Ses verileri sadece API'ye gönderilir, yerel olarak saklanmaz.

## Kurulum

1. Bu projeyi bir klasöre indirin.
2. Google Chrome'u açın ve `chrome://extensions/` adresine gidin.
3. Sağ üstteki **Geliştirici Modu**'nu (Developer Mode) açın.
4. **Paketlenmemiş öğe yükle** (Load unpacked) butonuna tıklayın ve bu klasörü seçin.
5. Eklenti simgesine tıklayın, **Ayarlar** sekmesine gidin ve **OpenAI API Anahtarınızı** girin.

## Kullanım

1. Herhangi bir video veya ses içeren web sayfasına gidin.
2. Eklenti popup'ını açın.
3. İstediğiniz dili seçin ve **▶ Başlat** butonuna basın.
4. Transkript anlık olarak panelde görünecektir.
5. **📋 Kopyala** butonu ile metni panoya alabilirsiniz.

## Teknik Detaylar

- **Kayıt**: `MediaRecorder` API ve `captureStream()` kullanılarak 8 saniyelik bloklar halinde yapılır.
- **İşleme**: Bloklar Base64 formatında arka plana iletilir ve Whisper API'ye gönderilir.
- **Performans**: Düşük kaynak tüketimi için verimli chunk yönetimi yapılmıştır.

## Lisans
MIT
