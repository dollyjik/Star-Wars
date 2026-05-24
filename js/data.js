/**
 * Star Wars Watchlist — Data
 *
 * Minimal yapı. Posterler, episode listeleri, episode stilleri ve titlelar
 * TMDB API'sinden runtime'da çekilir ve localStorage'da önbelleğe alınır.
 *
 * Her item:
 *   id        : benzersiz slug (localStorage key'i için)
 *   type      : 'film' | 'series'
 *   title     : Görünen başlık
 *   year      : Yayın yılı
 *   tmdbId    : TMDB'deki ID (null ise app /search ile arar)
 *   era       : Star Wars evrenindeki zaman dilimi (BBY/ABY)
 *   note      : (opsiyonel) küçük açıklama
 *
 * BBY = Before the Battle of Yavin (Yavin Muharebesi'nden önce — Episode IV finalı)
 * ABY = After the Battle of Yavin
 *
 * Sıralama: kullanıcının verdiği watch order (release order).
 */

const WATCHLIST = [
  { id: 'acolyte',                type: 'series', title: 'The Acolyte',                                year: 2024, tmdbId: null,   era: '132 BBY' },
  { id: 'phantom-menace',         type: 'film',   title: 'Star Wars: The Phantom Menace (Episode I)',  year: 1999, tmdbId: 1893,   era: '32 BBY' },
  { id: 'attack-of-the-clones',   type: 'film',   title: 'Star Wars: Attack of the Clones (Episode II)', year: 2002, tmdbId: 1894, era: '22 BBY' },
  { id: 'clone-wars-movie',       type: 'film',   title: 'Star Wars: The Clone Wars (movie)',          year: 2008, tmdbId: 12180,  era: '22 BBY' },
  { id: 'clone-wars-series',      type: 'series', title: 'Star Wars: The Clone Wars (series)',         year: 2008, tmdbId: 4194,   era: '22–19 BBY' },
  { id: 'tales-of-the-jedi',      type: 'series', title: 'Star Wars: Tales of the Jedi',               year: 2022, tmdbId: 203085, era: '~60–19 BBY' },
  { id: 'revenge-of-the-sith',    type: 'film',   title: 'Star Wars: Revenge of the Sith (Episode III)', year: 2005, tmdbId: 1895, era: '19 BBY' },
  { id: 'tales-of-the-empire',    type: 'series', title: 'Star Wars: Tales of the Empire',             year: 2024, tmdbId: null,   era: '19–2 BBY' },
  { id: 'tales-of-the-underworld',type: 'series', title: 'Star Wars: Tales of the Underworld',         year: 2025, tmdbId: null,   era: '~19–3 BBY' },
  { id: 'bad-batch',              type: 'series', title: 'Star Wars: The Bad Batch',                   year: 2021, tmdbId: 105971, era: '19–18 BBY' },
  { id: 'maul-shadow-lord',       type: 'series', title: 'Star Wars: Maul – Shadow Lord',              year: 2026, tmdbId: null,   era: '~18–2 BBY' },
  { id: 'solo',                   type: 'film',   title: 'Solo: A Star Wars Story',                    year: 2018, tmdbId: 348350, era: '13–10 BBY' },
  { id: 'obi-wan-kenobi',         type: 'series', title: 'Obi-Wan Kenobi',                             year: 2022, tmdbId: 92830,  era: '9 BBY' },
  { id: 'andor',                  type: 'series', title: 'Andor',                                      year: 2022, tmdbId: 83867,  era: '5–1 BBY' },
  { id: 'rebels',                 type: 'series', title: 'Star Wars Rebels',                           year: 2014, tmdbId: 60554,  era: '5–1 BBY' },
  { id: 'rogue-one',              type: 'film',   title: 'Rogue One: A Star Wars Story',               year: 2016, tmdbId: 330459, era: '0 BBY' },
  { id: 'a-new-hope',             type: 'film',   title: 'Star Wars: A New Hope (Episode IV)',         year: 1977, tmdbId: 11,     era: '0 BBY' },
  { id: 'empire-strikes-back',    type: 'film',   title: 'Star Wars: The Empire Strikes Back (Episode V)', year: 1980, tmdbId: 1891, era: '3 ABY' },
  { id: 'return-of-the-jedi',     type: 'film',   title: 'Star Wars: Return of the Jedi (Episode VI)', year: 1983, tmdbId: 1892,  era: '4 ABY' },
  { id: 'mandalorian',            type: 'series', title: 'The Mandalorian',                            year: 2019, tmdbId: 82856,  era: '9 ABY' },
  { id: 'book-of-boba-fett',      type: 'series', title: 'The Book of Boba Fett',                      year: 2021, tmdbId: 115036, era: '9 ABY' },
  { id: 'ahsoka',                 type: 'series', title: 'Ahsoka',                                     year: 2023, tmdbId: 114479, era: '9 ABY' },
  { id: 'skeleton-crew',          type: 'series', title: 'Skeleton Crew',                              year: 2024, tmdbId: 202879, era: '9 ABY' },
  { id: 'mandalorian-and-grogu',  type: 'film',   title: 'The Mandalorian and Grogu',                  year: 2026, tmdbId: null,   era: '~10 ABY', note: 'Vizyonda — 22 Mayıs 2026' },
  { id: 'resistance',             type: 'series', title: 'Star Wars Resistance',                       year: 2018, tmdbId: 79093,  era: '34–35 ABY' },
  { id: 'force-awakens',          type: 'film',   title: 'Star Wars: The Force Awakens (Episode VII)', year: 2015, tmdbId: 140607, era: '34 ABY' },
  { id: 'last-jedi',              type: 'film',   title: 'Star Wars: The Last Jedi (Episode VIII)',    year: 2017, tmdbId: 181808, era: '34 ABY' },
  { id: 'rise-of-skywalker',      type: 'film',   title: 'Star Wars: The Rise of Skywalker (Episode IX)', year: 2019, tmdbId: 181812, era: '35 ABY' },
  { id: 'forces-of-destiny',      type: 'series', title: 'Star Wars: Forces of Destiny',                year: 2017, tmdbId: null,   era: 'Antoloji / Çeşitli',  note: 'Mikro-bölümler (~3 dk) — saganın farklı kadın karakterlerinden anlar' },
  { id: 'galaxy-of-adventures',   type: 'series', title: 'Star Wars Galaxy of Adventures',              year: 2018, tmdbId: null,   era: 'Antoloji / Çeşitli',  note: 'Animasyonlu kısa filmler (~1-2 dk) — klasik anların yeniden anlatımı' },
  { id: 'visions',                type: 'series', title: 'Star Wars: Visions',                          year: 2021, tmdbId: null,   era: 'Antoloji / Non-canon', note: 'Her bölüm farklı stüdyo — bağımsız What If hikayeleri' },
];
