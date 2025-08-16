# toufu.homepage - Kişiselleştirilebilir Başlangıç Sayfası

toufu.homepage, tarayıcınızın her yeni sekmesini, ihtiyaçlarınıza göre şekillendirebileceğiniz, şık ve fonksiyonel bir başlangıç sayfasına dönüştüren bir tarayıcı eklentisidir. Kapsamlı tema desteği, modüler widget yapısı ve gelişmiş kişiselleştirme seçenekleriyle tamamen size özel bir deneyim sunar.

![Proje Ekran Görüntüsü](./resources/screenshot.png)

## ✨ Özellikler

- **Kapsamlı Tema Desteği:**
  - Dahili ve özel `.css` dosyaları ile temanızı tamamen değiştirin.
  - "Matrix", "iOS", "Dracula", "Nordic" gibi birçok hazır tema ile gelir.
  - Ayarlar panelinden kolayca tema ekleyin, seçin ve silin.

- **Dinamik Hava Durumu Efektleri:**
  - Anlık hava durumuna göre ekranda canlanan yağmur, kar ve şimşek animasyonları.
  - Efektlerin renkleri, seçili temaya göre dinamik olarak değişir.
  - Bu özellik ayarlardan isteğe bağlı olarak açılıp kapatılabilir.

- **Modüler Widget Sistemi:**
  - Saat, Hava Durumu, Selamlama, Hızlı Bağlantılar ve RSS gibi widget'ları istediğiniz gibi açıp kapatın.
  - **Özel Widget Desteği:** Kendi widget'larınızı `iframe` ile sayfaya ekleyin.

- **Gelişmiş Veri Yönetimi:**
  - **Ayarları İçe/Dışa Aktarma:** Tüm ayarlarınızı (bağlantılar, temalar, RSS akışları vb.) tek bir JSON dosyası ile yedekleyin veya başka bir cihazdan geri yükleyin.
  - **Performanslı Depolama:** Ayarlar için `localStorage`, büyük veriler (resimler, temalar, önbellek) için ise `IndexedDB` kullanılarak yüksek performans sağlanır.

- **Çoklu Dil Desteği:**
  - Türkçe, İngilizce, Almanca ve Japonca dilleri arasında geçiş yapma imkanı.
  - Tarayıcı dilini otomatik olarak algılayarak başlangıç dilini ayarlar.

- **Gelişmiş Arama Çubuğu:**
  - Google, DuckDuckGo, Bing ve Yandex gibi popüler arama motorları arasında seçim yapma.
  - Arama yaparken otomatik tamamlama önerileri ve **arama geçmişi**.

- **Entegre RSS Okuyucu:**
  - İstediğiniz RSS akışlarını (tekli veya toplu) ekleyerek en son haberleri takip edin.
  - Akışlar arasında sekmelerle kolayca geçiş yapın ve "Tümü" sekmesinde birleşik bir görünüm elde edin.
  - Sekmeleri **sürükleyip bırakarak** akış sırasını kişiselleştirin.
  - Performans için akış verileri otomatik olarak önbelleğe alınır.

- **Kişiselleştirilebilir Hızlı Bağlantılar:**
  - Sık kullandığınız siteleri kolayca ekleyin.
  - **Sağ Tık Menüsü:** Bağlantılara sağ tıklayarak hızlıca "Düzenle" ve "Sil" işlemlerini yapın.
  - **Sürükle ve Bırak:** Bağlantıları kolayca sürükleyerek yeniden düzenleyin.

- **Özelleştirilebilir Arka Plan:**
  - **Bing Günün Resmi:** Arka planı her gün otomatik olarak Bing'in resmiyle güncelleyin.
  - **URL:** İstediğiniz bir resim URL'sini arka plan olarak ayarlayın.
  - **Kendi Resimleriniz:** Bilgisayarınızdan resimler yükleyerek rastgele bir tanesinin gösterilmesini sağlayın.

## 🚀 Kurulum

Bu eklentiyi tarayıcınızda yerel olarak çalıştırmak için aşağıdaki adımları izleyin:

1.  Bu repoyu bilgisayarınıza ZIP olarak indirin ve bir klasöre çıkartın.
2.  Kullandığınız tarayıcının (Chrome, Edge, Brave vb.) **Uzantılar** sayfasına gidin.
    - Chrome için: `chrome://extensions`
    - Edge için: `edge://extensions`
3.  Sağ üst köşedeki **"Geliştirici Modu"** (Developer Mode) seçeneğini etkinleştirin.
4.  **"Paketlenmemiş öğe yükle"** (Load unpacked) butonuna tıklayın.
5.  Açılan pencerede, 1. adımda dosyaları çıkarttığınız klasörü seçin.
6.  Eklenti yüklenecek ve yeni açtığınız her sekmede kişisel başlangıç sayfanız görünecektir.

## 🛠️ Kullanılan Teknolojiler ve Servisler
-**GEMINI** (Kodları yazarken Geminiden yardım aldım.)
- **HTML5**
- **CSS3** (CSS Değişkenleri ile dinamik tema yapısı)
- **Vanilla JavaScript** (ES6+ Modülleri)
- **IndexedDB:** Büyük verilerin (resimler, temalar, önbellek) kalıcı ve performanslı depolanması için.
- **Sortable.js:** Sürükle-bırak işlevselliği için.

### Harici API'ler

- **Open-Meteo API:** Hava durumu verileri için kullanıldı.
- **Bing Image of the Day API:** Arka plan resmi için kullanıldı.
- **DuckDuckGo Autocomplete API:** Arama önerileri için kullanıldı.
- **Google S2 Favicon:** Hızlı bağlantıların ikonlarını çekmek için kullanıldı.
- **RSS2JSON API:** RSS akışlarını JSON formatına çevirmek için kullanıldı.

## 📄 Lisans

Bu proje GPL V3 Lisansı ile lisanslanmıştır. Detaylar için `LICENSE` dosyasına göz atabilirsiniz.