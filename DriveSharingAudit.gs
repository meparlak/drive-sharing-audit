/**
 * Drive Paylaşım Denetimi
 * https://github.com/meparlak/drive-sharing-audit  (MIT License)
 *
 * 1) paylasimRaporu()     → Sahibi olduğun ve başkasıyla paylaşılmış / bağlantıyla açık olan her dosya ve
 *                            klasörü "Paylaşım Raporu" adlı yeni bir Google E-Tablosuna yazar. Hiçbir şeyi değiştirmez.
 * 2) secilenleriKaldir()  → Rapordaki "KALDIR" kutusu işaretli satırların paylaşımını kaldırır
 *                            (bağlantı erişimi ve kişiler silinir, dosya "yalnızca ben" olur). Sahiplik değişmez.
 *
 * Gerekli: Sol menü "Hizmetler" (+) → "Drive API" → sürüm v3 → Ekle.
 */

const RAPOR_ADI = 'Paylaşım Raporu';
const KOK_ADI = "Drive'ım";   // Drive'ın kök klasörünün rapordaki adı (İngilizce arayüzde "My Drive")
const BASLIK = ['KALDIR', 'Tür', 'Ad', 'Klasör yolu', 'Bağlantı erişimi', 'Bağlantı yetkisi',
                'Paylaşılan kişiler', 'Kişi sayısı', 'Aç', 'Sonuç', 'id', 'izinler'];

function paylasimRaporu() {
  const kokId = DriveApp.getRootFolder().getId();
  const ogeler = {};          // id -> {ad, ebeveyn, klasorMu}
  const paylasilan = [];
  let sayfa = null;

  do {
    const yanit = Drive.Files.list({
      q: "'me' in owners and trashed = false",
      pageSize: 1000,
      pageToken: sayfa,
      fields: 'nextPageToken, files(id, name, mimeType, parents, shared, webViewLink, ' +
              'permissions(id, type, role, emailAddress, domain, displayName, allowFileDiscovery))'
    });
    (yanit.files || []).forEach(f => {
      ogeler[f.id] = {ad: f.name, ebeveyn: (f.parents || [])[0],
                      klasorMu: f.mimeType === 'application/vnd.google-apps.folder'};
      const izinler = (f.permissions || []).filter(p => p.role !== 'owner');
      if (f.shared || izinler.length) paylasilan.push({f: f, izinler: izinler});
    });
    sayfa = yanit.nextPageToken;
  } while (sayfa);

  const yol = id => {
    const parcalar = [];
    let e = ogeler[id] && ogeler[id].ebeveyn;
    for (let i = 0; e && i < 20; i++) {
      if (e === kokId) { parcalar.unshift(KOK_ADI); break; }
      if (!ogeler[e]) { parcalar.unshift('(başkasının klasörü)'); break; }
      parcalar.unshift(ogeler[e].ad);
      e = ogeler[e].ebeveyn;
    }
    return parcalar.join(' / ');
  };

  const ROL = {reader: 'Görüntüleyen', commenter: 'Yorumcu', writer: 'Düzenleyen', fileOrganizer: 'Düzenleyen'};
  const satirlar = paylasilan.map(({f, izinler}) => {
    const baglanti = izinler.find(p => p.type === 'anyone') || izinler.find(p => p.type === 'domain');
    const kisiler = izinler.filter(p => p.type === 'user' || p.type === 'group');
    return [
      false,
      ogeler[f.id].klasorMu ? 'Klasör' : 'Dosya',
      f.name,
      yol(f.id),
      !baglanti ? '—' : baglanti.type === 'anyone'
        ? (baglanti.allowFileDiscovery ? 'Herkese açık (aranabilir)' : 'Bağlantıya sahip herkes')
        : 'Kuruluş: ' + baglanti.domain,
      baglanti ? (ROL[baglanti.role] || baglanti.role) : '—',
      kisiler.map(p => (p.emailAddress || p.displayName) + ' (' + (ROL[p.role] || p.role) + ')').join(', '),
      kisiler.length,
      f.webViewLink,
      '',
      f.id,
      JSON.stringify(izinler.map(p => p.id))
    ];
  });

  // Klasörler üstte, sonra bağlantıyla açık olanlar, sonra yola göre
  satirlar.sort((a, b) => (a[1] === b[1] ? 0 : a[1] === 'Klasör' ? -1 : 1) ||
                          (a[4] === b[4] ? 0 : a[4] === '—' ? 1 : -1) ||
                          (a[3] + a[2]).localeCompare(b[3] + b[2], 'tr'));

  const ss = SpreadsheetApp.create(RAPOR_ADI + ' ' + Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyy-MM-dd HH:mm'));
  const sh = ss.getSheets()[0];
  sh.setName('Rapor');
  sh.getRange(1, 1, 1, BASLIK.length).setValues([BASLIK]).setFontWeight('bold').setBackground('#DDEBF7');
  if (satirlar.length) {
    sh.getRange(2, 1, satirlar.length, BASLIK.length).setValues(satirlar);
    sh.getRange(2, 1, satirlar.length, 1).insertCheckboxes();
  }
  sh.setFrozenRows(1);
  sh.hideColumns(11, 2);
  sh.setColumnWidth(1, 70); sh.setColumnWidth(3, 260); sh.setColumnWidth(4, 380);
  sh.setColumnWidth(5, 190); sh.setColumnWidth(7, 360); sh.setColumnWidth(10, 220);
  if (satirlar.length) sh.getRange(1, 1, satirlar.length + 1, BASLIK.length).createFilter();

  const ozet = ss.insertSheet('Özet');
  const acik = satirlar.filter(r => r[4] !== '—').length;
  const kisiyle = satirlar.filter(r => r[7] > 0).length;
  const kisiSay = {};
  satirlar.forEach(r => r[6] && r[6].split(', ').forEach(k => {
    const e = k.replace(/ \(.*\)$/, ''); kisiSay[e] = (kisiSay[e] || 0) + 1;
  }));
  ozet.getRange(1, 1, 4, 2).setValues([
    ['Paylaşılmış öğe', satirlar.length],
    ['Bağlantıyla açık olan', acik],
    ['Belirli kişilerle paylaşılan', kisiyle],
    ['Taranan öğe (sahibi sensin)', Object.keys(ogeler).length]]);
  ozet.getRange(6, 1, 1, 2).setValues([['Kişi / e-posta', 'Erişebildiği öğe sayısı']]).setFontWeight('bold');
  const kl = Object.entries(kisiSay).sort((a, b) => b[1] - a[1]);
  if (kl.length) ozet.getRange(7, 1, kl.length, 2).setValues(kl);
  ozet.autoResizeColumns(1, 2);

  PropertiesService.getUserProperties().setProperty('RAPOR_ID', ss.getId());
  Logger.log('Rapor hazır: ' + ss.getUrl() + '  |  paylaşılmış öğe: ' + satirlar.length);
}

function secilenleriKaldir() {
  const id = PropertiesService.getUserProperties().getProperty('RAPOR_ID');
  if (!id) throw new Error('Önce paylasimRaporu() çalıştırılmalı.');
  const sh = SpreadsheetApp.openById(id).getSheetByName('Rapor');
  const n = sh.getLastRow() - 1;
  if (n < 1) return;
  const veri = sh.getRange(2, 1, n, BASLIK.length).getValues();
  const basla = Date.now();
  let kaldirilan = 0;

  // Önce klasörler: klasörden kaldırılan erişim içindekilerden de kalkar.
  const sira = veri.map((r, i) => i).sort((a, b) => (veri[a][1] === 'Klasör' ? 0 : 1) - (veri[b][1] === 'Klasör' ? 0 : 1));
  for (const i of sira) {
    const r = veri[i];
    if (r[0] !== true || String(r[9]).startsWith('Kaldırıldı')) continue;
    if (Date.now() - basla > 5 * 60 * 1000) {
      Logger.log('Süre doldu; kalanlar için secilenleriKaldir() tekrar çalıştırılmalı.');
      break;
    }
    const hatalar = [];
    JSON.parse(r[11] || '[]').forEach(pid => {
      try {
        Drive.Permissions.remove(r[10], pid);
      } catch (e) {
        if (!/not ?found|404/i.test(String(e))) hatalar.push(String(e.message || e).slice(0, 120));
      }
    });
    const sonuc = hatalar.length ? 'Hata: ' + hatalar.join(' | ')
                                 : 'Kaldırıldı ' + Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyy-MM-dd HH:mm');
    sh.getRange(i + 2, 10).setValue(sonuc);
    if (!hatalar.length) kaldirilan++;
  }
  Logger.log('Paylaşımı kaldırılan öğe: ' + kaldirilan);
}
