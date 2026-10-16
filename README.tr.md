# Drive Sharing Audit

Türkçe | [English](README.md)

Google Drive'da yıllar içinde kimlerle neyi paylaştığımı bir türlü göremiyordum. Drive'ın arayüzünde "benim paylaştıklarım" diye bir liste yok; bir dosyanın kimlerle paylaşıldığını görmek için tek tek açmak gerekiyor. Bu küçük Google Apps Script bunu iki adımda çözüyor:

1. **Rapor:** Sahibi olduğun bütün dosya ve klasörleri tarar. Bağlantıyla açık olanları ve belirli kişilerle paylaşılanları kimlerle, hangi yetkiyle paylaşıldıklarıyla birlikte bir Google E-Tablosuna yazar. Hiçbir şeyi değiştirmez.
2. **Kaldırma:** Raporda işaretlediğin satırların paylaşımını kaldırır ve o dosyaları "yalnızca ben" durumuna getirir.

Betik tamamen kendi Google hesabının içinde çalışır. Hiçbir veri başka bir sunucuya gönderilmez ve dışarıdan bir kütüphane kullanılmaz.

## Rapor neleri gösteriyor

Betiğin arayüzü İngilizce. Report (Rapor) sayfasındaki sütunlar:

- **REMOVE (Kaldır):** Paylaşımını kaldırmak istediğin satırlar için işaret kutusu.
- **Type, Name, Folder path (Tür, Ad, Klasör yolu):** Öğenin ne olduğu ve Drive'da nerede durduğu.
- **Link access (Bağlantı erişimi):** "Anyone with the link" (bağlantıya sahip herkes), "Public on the web" (herkese açık, aranabilir), "Organization: alan-adı" (kuruluş) ya da "—".
- **Link role (Bağlantı yetkisi):** Viewer (görüntüleyen), Commenter (yorumcu) ya da Editor (düzenleyen).
- **Shared with (Paylaşılan kişiler):** E-posta adresleri ve her birinin yetkisi.
- **People (Kişi sayısı):** Öğenin kaç kişiyle paylaşıldığı.
- **Open (Aç):** Öğenin Drive bağlantısı.
- **Result (Sonuç):** Kaldırma işleminden sonra "Removed" ya da hata yazar.

Summary (Özet) sayfasında toplam sayılar ve hangi kişinin kaç öğeye erişebildiği yer alıyor. Klasörler en üstte, ardından bağlantıyla açık olanlar listelenir.

## Kurulum (bir kez, yaklaşık 3 dakika)

1. [script.google.com](https://script.google.com) adresine git ve **Yeni proje** oluştur.
2. Editördeki örnek kodu sil, [`DriveSharingAudit.gs`](DriveSharingAudit.gs) dosyasının içeriğini yapıştır ve kaydet.
3. Sol menüde **Hizmetler** yanındaki **+** işaretine tıkla, **Drive API**'yi seç, sürümü **v3** bırak ve **Ekle** de.

İstersen 3. adım yerine **Proje Ayarları → "appsscript.json" dosyasını göster** seçeneğini açıp [`appsscript.json`](appsscript.json) içeriğini oradaki dosyanın yerine yapıştırabilirsin. Drive API bu yolla da etkinleşir.

## Kullanım

### 1. Raporu çıkar

1. Üstteki işlev listesinden `sharingReport` seç ve **Çalıştır**'a bas.
2. İlk çalıştırmada Google izin ister: **İzinleri incele** → hesabını seç. "Google bu uygulamayı doğrulamadı" uyarısı çıkarsa **Gelişmiş** → **(güvenli değil) projesine git** → **İzin ver**. Bu uyarı, betiği kendin oluşturduğun için çıkıyor.
3. Bitince alttaki yürütme günlüğünde raporun linki görünür. Rapor Drive'ında "Sharing Report YYYY-AA-GG SS:DD" adıyla oluşur.

### 2. Paylaşımları kaldır

1. Raporda kaldırmak istediğin satırların **REMOVE** kutusunu işaretle. Hepsini kaldırmak istersen sütunu seçip boşluk tuşuna basman yeterli.
2. Editöre dön, `removeSelected` seç ve **Çalıştır**'a bas.
3. Her satırın **Result** sütununa ne olduğu yazılır. Çok sayıda satır varsa betik 5 dakikada bir durur; tekrar çalıştırdığında kaldığı yerden devam eder.

## Bilmen gerekenler

- Paylaşımı kaldırmak otomatik olarak geri alınamaz. Yanlış kaldırırsan o kişiyle dosyayı yeniden paylaşman gerekir. Kişiye bildirim gitmez, yalnızca erişimi kalkar.
- Bir klasörün paylaşımını kaldırdığında, içindeki dosyaların o klasörden gelen erişimi de kalkar. Bu yüzden betik önce klasörleri işler.
- Sahiplik değişmez; dosyalar silinmez veya taşınmaz.
- Rapor bir anlık görüntüdür. Sonradan yeni paylaşımlar yaparsan raporu yeniden çıkarman gerekir.
- Kök klasörün adı rapordaki yollarda "My Drive" olarak görünür. Betiğin başındaki `ROOT_NAME` değerini "Drive'ım" yapabilirsin.

## Nasıl çalışıyor

`sharingReport` Drive API v3'ün `files.list` çağrısıyla, sahibi olduğun ve çöpte olmayan öğeleri 1000'erli sayfalar hâlinde çeker. Her öğenin izinleri aynı çağrıda gelir, bu yüzden on binlerce dosyada bile tarama birkaç dakika sürer. Sahip dışındaki izinleri olan ya da `shared` işaretli öğeler rapora yazılır.

`removeSelected` işaretli satırların izin kimliklerini `permissions.delete` ile siler. Zaten kaldırılmış izinler (örneğin önce üst klasörden kalkmış olanlar) hata sayılmaz.

## Lisans

[MIT](LICENSE)
