# UpdateList — Watchlist'i Güncelleme Rehberi

Yeni Star Wars film/dizi çıktığında veya mevcut bir diziye sezon eklendiğinde watchlist'i nasıl güncelleyeceğinin adım adım rehberi.

> Tüm değişiklikler **`js/data.js`** dosyasında yapılır. Posterler, sezonlar, bölüm başlıkları ve görseller TMDB API'sinden otomatik çekilir — sen sadece `tmdbId` verirsin, gerisi otomatik.

---

## TL;DR — Hızlı Referans

| Ne yaptın? | Ne yapacaksın? |
|---|---|
| Yeni film/dizi çıktı | `data.js`'e satır ekle → push → sayfayı aç (otomatik fetch) |
| Mevcut diziye yeni sezon | Header'daki **↻ Yenile** butonuna bas |
| Bir başlığı sil | `data.js`'den satırı sil → push |
| Sırayı değiştir | `data.js`'de satırları yeniden sırala → push |
| TMDB ID bulamıyorum | `tmdbId: null` bırak, app /search ile bulmaya çalışır |

---

## 1. Yeni Film veya Dizi Eklemek

### Adım 1 — TMDB ID'sini bul

1. https://www.themoviedb.org/ adresine git
2. Üst arama kutusuna başlığı yaz, Enter
3. Doğru sonuca tıkla, sayfanın URL'sine bak:
   - **Film:** `https://www.themoviedb.org/movie/`**`1234567`**`-film-adi` → ID = `1234567`
   - **Dizi:** `https://www.themoviedb.org/tv/`**`98765`**`-dizi-adi` → ID = `98765`

> TMDB'de henüz yoksa veya emin değilsen `tmdbId: null` bırakabilirsin. App /search ile bulmaya çalışır.

### Adım 2 — `js/data.js`'i aç

Watch order'a göre yeni satırı uygun yere yerleştir (release order'ı bozma). Mevcut satırın altına/üstüne ekle.

### Adım 3 — Satırı ekle

**Film örneği:**
```js
{ id: 'starfighter', type: 'film', title: 'Star Wars: Starfighter', year: 2027, tmdbId: 1234567, era: '~15 ABY' },
```

**Dizi örneği:**
```js
{ id: 'new-jedi', type: 'series', title: 'Star Wars: New Jedi', year: 2027, tmdbId: 98765, era: '20–25 ABY' },
```

**Açıklama notu olan örnek** (örn. vizyon tarihi):
```js
{ id: 'starfighter', type: 'film', title: 'Star Wars: Starfighter', year: 2027, tmdbId: 1234567, era: '~15 ABY', note: 'Vizyonda — 28 Mayıs 2027' },
```

**TMDB ID'si bulamadığında:**
```js
{ id: 'mystery-show', type: 'series', title: 'Star Wars: Mystery', year: 2027, tmdbId: null, era: '~10 ABY' },
```

**Era bilgisi yoksa:** alanı tamamen atlayabilirsin, badge görünmez.

### Alan açıklamaları

| Alan | Zorunlu | Açıklama |
|---|---|---|
| `id` | ✓ | **Benzersiz** slug. Küçük harf + tire (`star-wars-x`). localStorage anahtarı — sonradan değiştirme yoksa işaretlerin kaybolur. |
| `type` | ✓ | `'film'` veya `'series'` |
| `title` | ✓ | Ekranda görünen başlık. İstediğin gibi yazabilirsin. |
| `year` | ✓ | Çıkış yılı (sayı, tırnak yok). Search fallback'inde kullanılır. |
| `tmdbId` | ✓ | TMDB ID (sayı) veya `null`. |
| `era` | — | (Opsiyonel) Star Wars evrenindeki zaman dilimi. Örn: `'9 ABY'`, `'22–19 BBY'`, `'~10 ABY'`. BBY = Yavin Muharebesi'nden önce, ABY = sonra. |
| `note` | — | (Opsiyonel) Küçük açıklama; başlığın altında görünür. |

### Adım 4 — Push et

```bash
cd "C:/Users/dolly/OneDrive/Masaüstü/Star Wars"
git add js/data.js
git commit -m "Add: Starfighter (2027)"
git push
```

GitHub Pages 1-2 dakika içinde yeni sürümü deploy eder.

### Adım 5 — Sayfayı aç

Site açıldığında app, önbellekte olmayan yeni başlığı **otomatik tespit edip TMDB'den çeker**. Manuel "Yenile" gerekmez. Üstte küçük bir yükleme barı görür, birkaç saniyede yeni başlık posteri ve (dizi ise) tüm sezonları/bölümleriyle gelir.

---

## 2. Mevcut Bir Diziye Yeni Sezon Eklendiğinde

Örnek: Ahsoka S2 çıktı. `data.js`'de Ahsoka satırı zaten var ama önbellekte sadece S1 var.

### Tek tıkla çözüm (önerilen)

Header'daki **↻ Yenile** butonuna bas → onayla. Tüm TMDB cache temizlenir, her şey yeniden çekilir (~30-60 sn). Yeni sezon dahil tüm veri güncellenir.

**İzleme durumun korunur** (o ayrı anahtarda: `sw-watchlist-v1`).

### Sadece tek bir başlığı yenilemek (gelişmiş)

Tüm cache'i yenilemek istemiyorsan, tarayıcı developer console'da (F12):

```js
const c = JSON.parse(localStorage.getItem('sw-tmdb-cache-v3'));
delete c.byId['ahsoka'];  // id'yi data.js'deki ile aynı yaz
localStorage.setItem('sw-tmdb-cache-v3', JSON.stringify(c));
location.reload();
```

Sayfa yenilenince sadece Ahsoka için TMDB fetch atılır.

---

## 3. Bir Başlığı Silmek

`data.js`'den o satırı sil + push.

```js
// SIL bu satırı:
{ id: 'resistance', type: 'series', title: 'Star Wars Resistance', year: 2018, tmdbId: 79093 },
```

- İzleme durumu (silinen başlığa ait işaretler) localStorage'da kalır, ama UI'da görünmez. Zararsız.
- Geri eklersen işaretlerin geri gelir (id aynıysa).

---

## 4. Sırayı Değiştirmek

`data.js`'deki satır sıralaması = UI'da gösterim sıralaması. Bir satırı yukarı/aşağı taşı + push.

> Örnek: Tales of the Jedi'yi izleme sırasında daha aşağı taşımak istersen, satırı kes-yapıştır + push. İzleme durumun değişmez.

---

## 5. Başlığı Değiştirmek

`title` veya `year` değiştirebilirsin, ama **`id`'yi değiştirme** — değiştirirsen o başlığın eski işaretleri kaybolur.

`tmdbId`'yi değiştirirsen sayfayı açtığında o başlığın cache'i otomatik güncellenmez. Önce console'dan o id'yi cache'ten sil (yukarıdaki tek-tıkla yöntem) veya **↻ Yenile** bas.

---

## 6. Sorun Giderme

### "Yeni eklediğim başlığın posteri gelmiyor"
- TMDB'de o başlığa git, URL'deki sayıyı doğru kopyaladığından emin ol.
- `tmdbId: 1234567` (sayı, tırnak yok!) yazmış olmalısın. `tmdbId: '1234567'` yanlış olur — string olur.
- `tmdbId: null` ise: app /search atıyor. Başlığında "Star Wars:" prefix'i varsa otomatik temizlenir, ama yine de bulamamış olabilir. Manuel ID gir.

### "Yeni sezon eklendi ama görmüyorum"
- Header'da **↻ Yenile** butonu var → bas. Cache temizlenir, yeni sezon dahil tüm veri yeniden çekilir.

### "data.js'i edit ettim, sayfa kırıldı"
- JSON gibi görünse de bu JavaScript — virgül kuralları aynı:
  - Her satırın sonunda virgül olmalı (son satır hariç bile sorun olmaz, ES2017+ trailing comma okay)
  - String'ler tek tırnak veya çift tırnak; kapatmayı unutma
  - Sayılar tırnaksız (yıl, tmdbId)
- F12 → Console'da hata satırını gör, o satırı kontrol et.

### "TMDB ID buldum ama tamamen alakasız başka şey geliyor"
- Yanlış ID kopyalamış olabilirsin. TMDB'de doğru sayfaya gittiğinden emin ol (bazı remake/farklı yıl sürümleri olabilir).
- ID'yi düzelt, console'dan o item'ın cache'ini sil, sayfayı yenile.

---

## 7. Şablon — Kopyala/Yapıştır

```js
// FİLM:
{ id: '', type: 'film', title: '', year: , tmdbId:  },

// DİZİ:
{ id: '', type: 'series', title: '', year: , tmdbId:  },

// NOT'LU:
{ id: '', type: 'film', title: '', year: , tmdbId: , note: '' },

// TMDB ID YOKSA:
{ id: '', type: 'film', title: '', year: , tmdbId: null },
```

---

## 8. Toplu Güncelleme Örneği

2026'da çıkacak diyelim 3 yeni başlık var. `data.js`'in WATCHLIST array'ine 3 satır ekle:

```js
const WATCHLIST = [
  // ... mevcut satırlar ...

  // Yeni:
  { id: 'starfighter',     type: 'film',   title: 'Star Wars: Starfighter',     year: 2027, tmdbId: 1234567 },
  { id: 'new-jedi-order',  type: 'series', title: 'Star Wars: New Jedi Order',  year: 2027, tmdbId: 7654321 },
  { id: 'rey-movie',       type: 'film',   title: 'Star Wars: Rey',             year: 2028, tmdbId: 9999999 },
];
```

Push → sayfa açıldığında üçü birden otomatik fetch edilir.

---

İyi izlemeler. May the Force be with you.
