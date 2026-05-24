# Star Wars Watchlist

Kişisel Star Wars izleme takip listesi. Her filmi ve dizi bölümünü işaretle, ilerlemeni gör. Posterler ve her bölümün still görseli **TMDB API**'sinden otomatik çekilir — yanlış görsel olmaz.

## Özellikler

- 28 başlık (filmler + diziler), release order'a göre sıralı
- Diziler için **sezon ve bölüm bazında** işaretleme
- Sezon başlığındaki checkbox tüm sezonu tek tıkla işaretler
- Her bölüm için TMDB'den **gerçek episode still görseli**, başlığı ve yayın tarihi
- Global ve dizi başına ilerleme çubukları
- Arama (başlık, sezon, bölüm)
- Filtre: Hepsi / İzlenmedi / İzlendi
- Karanlık Star Wars teması
- localStorage'da kalıcı: hem işaretler hem TMDB önbelleği
- Sıfır build step, sıfır bağımlılık — saf HTML/CSS/JS

## Kurulum: TMDB API Key (1 dakika)

Görsellerin yüklenmesi için ücretsiz bir TMDB API key gerekir. Tamamen ücretsiz, sınırı binlerce istek/gün.

1. https://www.themoviedb.org/signup adresinden kayıt ol (ücretsiz, e-posta + şifre)
2. https://www.themoviedb.org/settings/api adresine git
3. **"Request an API Key"** → "Developer" → küçük bir form (kişisel kullanım için "Personal" yeterli)
4. Onay anında çıkar. **"API Key (v3 auth)"** değerini kopyala — 32 karakterlik hex string
5. Watchlist sayfasını aç → üstteki sarı banner'a yapıştır → "Kaydet & Yükle"

Site açıldığında veriler otomatik çekilir (~30-60 saniye, ~28 başlık + tüm sezonlar). Sonraki açılışlarda önbellekten anında gelir.

## Lokal Çalıştırma

```bash
# Doğrudan: index.html'e çift tıkla
# VEYA yerel sunucu (önerilen):
python -m http.server 8080
# sonra: http://localhost:8080
```

## GitHub Pages'e Deploy

### 1. Repo oluştur ve push et

```bash
cd "C:/Users/dolly/OneDrive/Masaüstü/Star Wars"
git init
git add .
git commit -m "Initial commit: Star Wars Watchlist"
git branch -M main
git remote add origin https://github.com/<KULLANICI_ADIN>/star-wars-watchlist.git
git push -u origin main
```

### 2. GitHub Pages'i aktive et

1. Repo sayfasında **Settings** → **Pages**
2. **Source**: `Deploy from a branch`
3. **Branch**: `main` / `/ (root)` → **Save**
4. 1–2 dakika içinde site yayında: `https://<KULLANICI_ADIN>.github.io/star-wars-watchlist/`

### 3. (Opsiyonel) Özel Domain

Repo'da `CNAME` adında bir dosya oluştur ve içine sadece kendi domain'ini yaz:

```
watch.seninsiten.com
```

DNS sağlayıcında bir kayıt ekle:

- **A kayıtları** (apex domain için, örn. `seninsiten.com`):
  - `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- **CNAME** (alt domain için, örn. `watch.seninsiten.com`): `<KULLANICI_ADIN>.github.io`

Settings → Pages → **Custom domain** alanına domain'i gir, **Enforce HTTPS** seç.

## Güvenlik Notu: API Key

TMDB API key **localStorage**'da senin tarayıcında saklanır — repo'ya hiç gitmez, başkası göremez. Repo public olsa bile key güvende.

Yine de paranoya için: bir başka cihazdan açtığında key'i tekrar girmen gerekecek. Tarayıcı geçmişini silersen key de silinir, tekrar girmen gerekir.

## Veri Yapısı

Tüm Star Wars verisi `js/data.js` içinde — minimal yapı:

```js
{
  id: 'mandalorian',
  type: 'series',         // veya 'film'
  title: 'The Mandalorian',
  year: 2019,
  tmdbId: 82856,          // TMDB ID; null bırakılırsa /search ile aranır
}
```

Posterler, sezon listeleri, bölüm başlıkları ve still görselleri **runtime'da TMDB'den** çekilir ve önbelleğe alınır.

## Veriyi Yedekleme

Tarayıcı developer console'unda:

```js
// İzleme durumunu export et
copy(localStorage.getItem('sw-watchlist-v1'))

// Import (panodaki JSON ile)
localStorage.setItem('sw-watchlist-v1', '<yapıştırdığın JSON>')
```

## Önbelleği Yenileme

Header'daki **↻ Yenile** butonu TMDB önbelleğini temizler ve her şeyi yeniden çeker. İzleme durumu silinmez. Yeni sezon/bölüm geldiğinde kullan.

## Dosya Yapısı

```
.
├── index.html       # giriş sayfası
├── css/
│   └── styles.css   # tüm stiller
├── js/
│   ├── data.js      # watchlist (minimal: title + tmdbId)
│   └── app.js       # render + state + TMDB fetch
├── .nojekyll        # GitHub Pages için
├── .gitignore
└── README.md
```

## Lisans

Kişisel kullanım. Görseller TMDB'nin, Star Wars markası Lucasfilm/Disney'in.
