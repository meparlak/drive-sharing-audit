# Drive Paylaşım Denetimi

Google Drive'da yıllar içinde kimlerle neyi paylaştığımı bir türlü göremiyordum. Drive'ın arayüzünde "benim paylaştıklarım" diye bir liste yok; bir dosyanın kimlerle paylaşıldığını görmek için tek tek açmak gerekiyor. Bu küçük Google Apps Script bunu iki adımda çözüyor:

1. **Rapor:** Sahibi olduğun bütün dosya ve klasörleri tarar. Bağlantıyla açık olanları ve belirli kişilerle paylaşılanları kimlerle, hangi yetkiyle paylaşıldıklarıyla birlikte bir Google E-Tablosuna yazar. Hiçbir şeyi değiştirmez.
2. **Kaldırma:** Raporda işaretlediğin satırların paylaşımını kaldırır ve o dosyaları "yalnızca ben" durumuna getirir.

Betik tamamen kendi Google hesabının içinde çalışır. Hiçbir veri başka bir sunucuya gönderilmez ve dışarıdan bir kütüphane kullanılmaz.

## Rapor neleri gösteriyor

Rapor sayfasındaki sütunlar:

- **KALDIR:** Paylaşımını kaldırmak istediğin satırlar için işaret kutusu.
- **Tür, Ad, Klasör yolu:** Öğenin ne olduğu ve Drive'da nerede durduğu.
- **Bağlantı erişimi:** "Bağlantıya sahip herkes", "Herkese açık (aranabilir)", "Kuruluş: alan-adı" ya da "—".
- **Bağlantı yetkisi:** Görüntüleyen, Yorumcu ya da Düzenleyen.
- **Paylaşılan kişiler:** E-posta adresleri ve her birinin yetkisi.
- **Aç:** Öğenin Drive bağlantısı.
- **Sonuç:** Kaldırma işleminden sonra "Kaldırıldı" ya da hata yazar.

Özet sayfasında toplam sayılar ve hangi kişinin kaç öğeye erişebildiği yer alıyor. Klasörler en üstte, ardından bağlantıyla açık olanlar listelenir.

## Kurulum (bir kez, yaklaşık 3 dakika)

1. [script.google.com](https://script.google.com) adresine git ve **Yeni proje** oluştur.
2. Editördeki örnek kodu sil, [`PaylasimDenetimi.gs`](PaylasimDenetimi.gs) dosyasının içeriğini yapıştır ve kaydet.
3. Sol menüde **Hizmetler** yanındaki **+** işaretine tıkla, **Drive API**'yi seç, sürümü **v3** bırak ve **Ekle** de.

İstersen 3. adım yerine **Proje Ayarları → "appsscript.json" dosyasını göster** seçeneğini açıp [`appsscript.json`](appsscript.json) içeriğini oradaki dosyanın yerine yapıştırabilirsin. Drive API bu yolla da etkinleşir.

## Kullanım

### 1. Raporu çıkar

1. Üstteki işlev listesinden `paylasimRaporu` seç ve **Çalıştır**'a bas.
2. İlk çalıştırmada Google izin ister: **İzinleri incele** → hesabını seç. "Google bu uygulamayı doğrulamadı" uyarısı çıkarsa **Gelişmiş** → **(güvenli değil) projesine git** → **İzin ver**. Bu uyarı, betiği kendin oluşturduğun için çıkıyor.
3. Bitince alttaki yürütme günlüğünde raporun linki görünür. Rapor Drive'ında "Paylaşım Raporu YYYY-AA-GG SS:DD" adıyla oluşur.

### 2. Paylaşımları kaldır

1. Raporda kaldırmak istediğin satırların **KALDIR** kutusunu işaretle. Hepsini kaldırmak istersen sütunu seçip boşluk tuşuna basman yeterli.
2. Editöre dön, `secilenleriKaldir` seç ve **Çalıştır**'a bas.
3. Her satırın **Sonuç** sütununa ne olduğu yazılır. Çok sayıda satır varsa betik 5 dakikada bir durur; tekrar çalıştırdığında kaldığı yerden devam eder.

## Bilmen gerekenler

- Yalnızca **sahibi olduğun** öğeler taranır. Başkalarının seninle paylaştıkları listeye girmez.
- Paylaşımı kaldırmak otomatik olarak geri alınamaz. Yanlış kaldırırsan o kişiyle dosyayı yeniden paylaşman gerekir. Kişiye bildirim gitmez, yalnızca erişimi kalkar.
- Bir klasörün paylaşımını kaldırdığında, içindeki dosyaların o klasörden gelen erişimi de kalkar. Bu yüzden betik önce klasörleri işler.
- Sahiplik değişmez; dosyalar silinmez ya da taşınmaz.
- Rapor bir anlık görüntüdür. Sonradan yeni paylaşımlar yaparsan raporu yeniden çıkarman gerekir.
- Kök klasörün adı rapordaki yollarda "Drive'ım" olarak görünür. İngilizce arayüz kullanıyorsan betiğin başındaki `KOK_ADI` değerini "My Drive" yapabilirsin.

## Nasıl çalışıyor

`paylasimRaporu` Drive API v3'ün `files.list` çağrısıyla, sahibi olduğun ve çöpte olmayan öğeleri 1000'erli sayfalar hâlinde çeker. Her öğenin izinleri aynı çağrıda gelir, bu yüzden on binlerce dosyada bile tarama birkaç dakika sürer. Sahip dışındaki izinleri olan ya da `shared` işaretli öğeler rapora yazılır.

`secilenleriKaldir` işaretli satırların izin kimliklerini `permissions.delete` ile siler. Zaten kaldırılmış izinler (örneğin önce üst klasörden kalkmış olanlar) hata sayılmaz.

---

## English summary

A small Google Apps Script that lists every file and folder you own in Google Drive that is shared via link or with specific people, writes them to a Google Sheet with who has access and at what level, and then removes sharing from the rows you tick. It runs entirely inside your own Google account and needs the Drive API v3 advanced service. The interface and sheet headers are in Turkish; run `paylasimRaporu` for the report and `secilenleriKaldir` to remove sharing from selected rows.

## Lisans

[MIT](LICENSE)
