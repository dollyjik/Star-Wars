/**
 * Star Wars Watchlist — App
 *
 * Mimari:
 *  - WATCHLIST verisi minimal (id, type, title, year, tmdbId).
 *  - Posterler, sezonlar, bölüm başlıkları, bölüm still görselleri
 *    TMDB API'sinden runtime'da çekilir, localStorage'da önbelleğe alınır.
 *  - İzleme durumu (her bölüm/film için) ayrı localStorage anahtarında.
 *
 * localStorage anahtarları:
 *  - sw-watchlist-v1   — izleme durumu  ({ [itemId]: true | { [season]: { [ep]: true } } })
 *  - sw-tmdb-key       — TMDB API key
 *  - sw-tmdb-cache-v3  — TMDB'den çekilmiş poster/episode/runtime verisi
 */

(function () {
  'use strict';

  // -------- Constants --------
  const STORAGE_KEY = 'sw-watchlist-v1';
  const TMDB_KEY_STORE = 'sw-tmdb-key';
  const TMDB_CACHE_STORE = 'sw-tmdb-cache-v3';
  const IMG_BASE = 'https://image.tmdb.org/t/p';
  const POSTER_SIZE = 'w342';
  const STILL_SIZE = 'w300';
  const API_BASE = 'https://api.themoviedb.org/3';

  // -------- DOM --------
  const listEl = document.getElementById('list');
  const searchEl = document.getElementById('searchInput');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const progressLabel = document.getElementById('progressLabel');
  const progressPercent = document.getElementById('progressPercent');
  const progressFill = document.getElementById('progressFill');
  const timeLabel = document.getElementById('timeLabel');
  const timePercent = document.getElementById('timePercent');
  const timeFill = document.getElementById('timeFill');
  const resetBtn = document.getElementById('resetBtn');
  const keyBanner = document.getElementById('keyBanner');
  const keyInput = document.getElementById('keyInput');
  const keySaveBtn = document.getElementById('keySaveBtn');
  const keyStatus = document.getElementById('keyStatus');
  const refreshBtn = document.getElementById('refreshBtn');
  const editKeyBtn = document.getElementById('editKeyBtn');
  const loadingBar = document.getElementById('loadingBar');
  const loadingFill = document.getElementById('loadingFill');
  const loadingText = document.getElementById('loadingText');

  // -------- State --------
  let state = loadState();
  let cache = loadCache();
  let apiKey = localStorage.getItem(TMDB_KEY_STORE) || '';
  let activeFilter = 'all';
  let searchQuery = '';
  let fetchInFlight = false;

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }
  function loadCache() {
    try { return JSON.parse(localStorage.getItem(TMDB_CACHE_STORE)) || { byId: {} }; }
    catch { return { byId: {} }; }
  }
  function saveCache() {
    try { localStorage.setItem(TMDB_CACHE_STORE, JSON.stringify(cache)); } catch {}
  }

  // -------- Watch state helpers --------
  function isFilmWatched(id) { return state[id] === true; }
  function isEpisodeWatched(id, s, e) {
    const it = state[id];
    if (!it || it === true) return false;
    return !!(it[s] && it[s][e]);
  }
  function setFilmWatched(id, w) {
    if (w) state[id] = true; else delete state[id];
    saveState();
  }
  function setEpisodeWatched(id, s, e, w) {
    if (!state[id] || state[id] === true) state[id] = {};
    if (!state[id][s]) state[id][s] = {};
    if (w) state[id][s][e] = true;
    else {
      delete state[id][s][e];
      if (!Object.keys(state[id][s]).length) delete state[id][s];
      if (!Object.keys(state[id]).length) delete state[id];
    }
    saveState();
  }

  function itemSeasons(item) {
    return cache.byId[item.id]?.seasons || [];
  }
  function itemPoster(item) {
    return cache.byId[item.id]?.poster || null;
  }
  function itemProgress(item) {
    if (item.type === 'film') return { watched: isFilmWatched(item.id) ? 1 : 0, total: 1 };
    const seasons = itemSeasons(item);
    let total = 0, watched = 0;
    for (const s of seasons) for (const e of s.episodes) {
      total++; if (isEpisodeWatched(item.id, s.number, e.n)) watched++;
    }
    return { watched, total };
  }
  function seasonProgress(item, season) {
    let w = 0;
    for (const e of season.episodes) if (isEpisodeWatched(item.id, season.number, e.n)) w++;
    return { watched: w, total: season.episodes.length };
  }
  function globalProgress() {
    let w = 0, t = 0;
    for (const item of WATCHLIST) {
      const p = itemProgress(item); w += p.watched; t += p.total;
    }
    return { watched: w, total: t };
  }

  // -------- Runtime / time helpers --------
  function itemTimeProgress(item) {
    const c = cache.byId[item.id];
    if (item.type === 'film') {
      const total = Number(c?.runtime) || 0;
      const watched = isFilmWatched(item.id) ? total : 0;
      return { watched, total };
    }
    if (!c) return { watched: 0, total: 0 };
    let total = 0, watched = 0;
    for (const s of c.seasons || []) {
      for (const e of s.episodes) {
        const r = Number(e.runtime) || 0;
        total += r;
        if (isEpisodeWatched(item.id, s.number, e.n)) watched += r;
      }
    }
    return { watched, total };
  }

  function globalTimeProgress() {
    let w = 0, t = 0;
    for (const item of WATCHLIST) {
      const p = itemTimeProgress(item);
      w += p.watched; t += p.total;
    }
    return { watched: w, total: t };
  }

  function formatDuration(min) {
    min = Math.max(0, Math.round(min || 0));
    if (min === 0) return '0dk';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return m + 'dk';
    if (m === 0) return h + 'sa';
    return h + 'sa ' + m + 'dk';
  }

  // -------- TMDB --------
  async function tmdbGet(path, params = {}) {
    const url = new URL(API_BASE + path);
    url.searchParams.set('api_key', apiKey);
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = new Error('TMDB ' + res.status);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async function resolveMovieId(item) {
    if (item.tmdbId) return item.tmdbId;
    const data = await tmdbGet('/search/movie', { query: item.title, year: item.year });
    return data.results?.[0]?.id || null;
  }
  async function resolveTvId(item) {
    if (item.tmdbId) return item.tmdbId;
    // Strip "Star Wars:" / "Star Wars" prefix for cleaner search
    const cleanTitle = item.title.replace(/^Star Wars[:\s]*/i, '').trim();
    let data = await tmdbGet('/search/tv', { query: cleanTitle, first_air_date_year: item.year });
    if (!data.results?.length) {
      data = await tmdbGet('/search/tv', { query: item.title, first_air_date_year: item.year });
    }
    if (!data.results?.length) {
      data = await tmdbGet('/search/tv', { query: cleanTitle });
    }
    return data.results?.[0]?.id || null;
  }

  async function fetchMovie(item) {
    let id = item.tmdbId;
    let data = null;
    if (id) {
      try {
        data = await tmdbGet('/movie/' + id);
      } catch (e) {
        if (e.status !== 404) throw e;
        console.warn('TMDB movie ID ' + id + ' not found for "' + item.id + '" — arama fallback\'ine geçiliyor');
        id = null; data = null;
      }
    }
    if (!data) {
      id = await resolveMovieId({ ...item, tmdbId: null });
      if (!id) return null;
      data = await tmdbGet('/movie/' + id);
    }
    return {
      tmdbId: id,
      poster: data.poster_path ? `${IMG_BASE}/${POSTER_SIZE}${data.poster_path}` : null,
      runtime: Number(data.runtime) || 0,
    };
  }

  async function fetchTv(item) {
    let id = item.tmdbId;
    let data = null;
    if (id) {
      try {
        data = await tmdbGet('/tv/' + id);
      } catch (e) {
        if (e.status !== 404) throw e;
        console.warn('TMDB tv ID ' + id + ' not found for "' + item.id + '" — arama fallback\'ine geçiliyor');
        id = null; data = null;
      }
    }
    if (!data) {
      id = await resolveTvId({ ...item, tmdbId: null });
      if (!id) return null;
      data = await tmdbGet('/tv/' + id);
    }
    const poster = data.poster_path ? `${IMG_BASE}/${POSTER_SIZE}${data.poster_path}` : null;
    // TMDB'nin tahmini ortalama bölüm süresi (bazı bölümler runtime'sız geldiğinde fallback)
    const fallbackRuntime = Array.isArray(data.episode_run_time) && data.episode_run_time.length
      ? Math.round(data.episode_run_time.reduce((a, b) => a + b, 0) / data.episode_run_time.length)
      : 0;

    const validSeasons = (data.seasons || [])
      .filter(s => s.season_number > 0 && (s.episode_count == null || s.episode_count > 0));
    const seasons = [];
    for (const s of validSeasons) {
      try {
        const sData = await tmdbGet(`/tv/${id}/season/${s.season_number}`);
        seasons.push({
          number: s.season_number,
          name: sData.name || ('Sezon ' + s.season_number),
          episodes: (sData.episodes || []).map(e => ({
            n: e.episode_number,
            title: e.name || ('Episode ' + e.episode_number),
            still: e.still_path ? `${IMG_BASE}/${STILL_SIZE}${e.still_path}` : null,
            air_date: e.air_date || null,
            runtime: Number(e.runtime) || fallbackRuntime || 0,
          })),
        });
      } catch (e) {
        console.warn('Season fetch failed', item.id, s.season_number, e);
      }
    }
    return { tmdbId: id, poster, seasons, fallbackRuntime };
  }

  async function fetchItem(item) {
    if (item.type === 'film') return fetchMovie(item);
    return fetchTv(item);
  }

  async function fetchAll(opts = {}) {
    const force = !!opts.force;
    if (!apiKey) return;
    if (fetchInFlight) return;
    fetchInFlight = true;
    showLoading('TMDB\'den veriler çekiliyor…');

    const items = WATCHLIST.filter(i => force || !cache.byId[i.id]);
    if (items.length === 0) { hideLoading(); fetchInFlight = false; return; }

    let done = 0;
    const total = items.length;
    const concurrency = 3;
    let cursor = 0;

    async function worker() {
      while (cursor < items.length) {
        const item = items[cursor++];
        try {
          const data = await fetchItem(item);
          if (data) {
            cache.byId[item.id] = data;
            saveCache();
            refreshCard(item.id);
            updateGlobalProgress();
          }
        } catch (e) {
          if (e.status === 401) {
            hideLoading();
            fetchInFlight = false;
            apiKey = '';
            localStorage.removeItem(TMDB_KEY_STORE);
            showKeyBanner('Geçersiz API key. Lütfen tekrar gir.');
            throw e;
          }
          console.warn('Item fetch failed', item.id, e);
        }
        done++;
        updateLoading(done, total);
      }
    }

    try {
      await Promise.all(Array.from({ length: concurrency }, worker));
    } catch (e) {
      console.error('fetchAll error', e);
    } finally {
      hideLoading();
      fetchInFlight = false;
    }
  }

  // -------- Loading UI --------
  function showLoading(text) {
    loadingBar.classList.remove('is-hidden');
    loadingText.textContent = text || 'Yükleniyor…';
    loadingFill.style.width = '0%';
  }
  function updateLoading(done, total) {
    const pct = total === 0 ? 100 : Math.round((done / total) * 100);
    loadingFill.style.width = pct + '%';
    loadingText.textContent = `TMDB'den çekiliyor… ${done} / ${total}`;
  }
  function hideLoading() {
    loadingBar.classList.add('is-hidden');
  }

  // -------- Key Banner --------
  function showKeyBanner(msg) {
    keyBanner.classList.remove('is-hidden');
    keyStatus.textContent = msg || '';
    refreshBtn.classList.add('is-hidden');
    editKeyBtn.classList.add('is-hidden');
  }
  function hideKeyBanner() {
    keyBanner.classList.add('is-hidden');
    refreshBtn.classList.remove('is-hidden');
    editKeyBtn.classList.remove('is-hidden');
  }

  // -------- Rendering --------
  function renderAll() {
    const frag = document.createDocumentFragment();
    for (const item of WATCHLIST) frag.appendChild(renderCard(item));
    listEl.innerHTML = '';
    listEl.appendChild(frag);
    applyFiltersAndSearch();
    updateGlobalProgress();
  }

  function renderCard(item) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.id = item.id;
    card.dataset.type = item.type;
    card.dataset.title = item.title.toLowerCase();
    if (item.type === 'series') card.classList.add('is-series');

    const head = document.createElement('div');
    head.className = 'card-head';
    head.appendChild(renderPoster(item));
    head.appendChild(renderMeta(item));
    head.appendChild(renderRight(item));
    card.appendChild(head);

    if (item.type === 'series') {
      card.appendChild(renderSeasons(item));
      head.addEventListener('click', (ev) => {
        if (ev.target.closest('.cbox')) return;
        if (ev.target.closest('button')) return;
        card.classList.toggle('is-open');
      });
    }

    updateCardWatchedState(card, item);
    return card;
  }

  function renderPoster(item) {
    const p = document.createElement('div');
    p.className = 'poster';
    p.dataset.fallback = item.title.replace(/^Star Wars[:\s]*/i, '').slice(0, 40);

    const src = itemPoster(item);
    if (src) {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = item.title + ' poster';
      img.src = src;
      img.addEventListener('error', () => p.classList.add('is-broken'), { once: true });
      p.appendChild(img);
    } else {
      p.classList.add('is-broken');
    }
    return p;
  }

  function renderMeta(item) {
    const meta = document.createElement('div');
    meta.className = 'meta';

    const title = document.createElement('h2');
    title.className = 'meta-title';
    title.appendChild(document.createTextNode(item.title));
    const year = document.createElement('span');
    year.className = 'meta-year';
    year.textContent = '(' + item.year + ')';
    title.appendChild(year);

    const badge = document.createElement('span');
    badge.className = 'badge ' + (item.type === 'film' ? 'is-film' : 'is-series');
    badge.textContent = item.type === 'film' ? 'Film' : 'Dizi';
    title.appendChild(badge);

    if (item.era) {
      const era = document.createElement('span');
      era.className = 'badge is-era';
      era.textContent = item.era;
      era.title = 'Star Wars evrenindeki zaman dilimi · BBY = Yavin Muharebesi\'nden Önce, ABY = Sonra';
      title.appendChild(era);
    }

    meta.appendChild(title);

    if (item.note) {
      const note = document.createElement('div');
      note.className = 'note';
      note.textContent = item.note;
      meta.appendChild(note);
    }

    if (item.type === 'series') {
      const stats = document.createElement('div');
      stats.className = 'meta-stats';
      const seasons = itemSeasons(item);
      const txt = document.createElement('span');
      if (seasons.length) {
        const epCount = seasons.reduce((a, s) => a + s.episodes.length, 0);
        const totalMin = itemTimeProgress(item).total;
        let label = seasons.length + ' sezon · ' + epCount + ' bölüm';
        if (totalMin > 0) label += ' · ' + formatDuration(totalMin);
        txt.textContent = label;
      } else {
        txt.textContent = cache.byId[item.id] ? 'Sezon verisi yok' : 'Sezonlar yükleniyor…';
        txt.style.color = 'var(--text-mute)';
      }
      stats.appendChild(txt);

      const bar = document.createElement('div');
      bar.className = 'mini-bar';
      const fill = document.createElement('div');
      fill.className = 'mini-bar-fill';
      bar.appendChild(fill);
      stats.appendChild(bar);

      const pct = document.createElement('span');
      pct.className = 'meta-progress';
      stats.appendChild(pct);

      meta.appendChild(stats);
    }

    return meta;
  }

  function renderRight(item) {
    const right = document.createElement('div');
    right.className = 'right';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'cbox';
    cb.title = item.type === 'film' ? 'İzlendi olarak işaretle' : 'Tüm bölümleri işaretle';
    cb.addEventListener('click', (ev) => ev.stopPropagation());
    cb.addEventListener('change', () => {
      if (item.type === 'film') {
        setFilmWatched(item.id, cb.checked);
      } else {
        for (const s of itemSeasons(item)) {
          for (const e of s.episodes) {
            setEpisodeWatched(item.id, s.number, e.n, cb.checked);
          }
        }
        refreshCard(item.id);
      }
      const card = listEl.querySelector('.card[data-id="' + cssEscape(item.id) + '"]');
      if (card) updateCardWatchedState(card, item);
      updateGlobalProgress();
      applyFiltersAndSearch();
    });
    right.appendChild(cb);

    if (item.type === 'series') {
      const chev = document.createElement('span');
      chev.className = 'chev';
      right.appendChild(chev);
    }

    return right;
  }

  function renderSeasons(item) {
    const wrap = document.createElement('div');
    wrap.className = 'seasons';

    const seasons = itemSeasons(item);
    if (!seasons.length) {
      const empty = document.createElement('div');
      empty.className = 'seasons-empty';
      empty.textContent = cache.byId[item.id]
        ? 'TMDB\'de sezon verisi bulunamadı.'
        : 'Sezonlar TMDB\'den yükleniyor…';
      wrap.appendChild(empty);
      return wrap;
    }

    for (const season of seasons) {
      const sEl = document.createElement('div');
      sEl.className = 'season';
      sEl.dataset.season = season.number;

      const head = document.createElement('div');
      head.className = 'season-head';

      const sCb = document.createElement('input');
      sCb.type = 'checkbox';
      sCb.className = 'cbox season-cbox';
      sCb.title = 'Sezonun tüm bölümlerini işaretle';
      sCb.addEventListener('click', (ev) => ev.stopPropagation());
      sCb.addEventListener('change', () => {
        for (const e of season.episodes) {
          setEpisodeWatched(item.id, season.number, e.n, sCb.checked);
        }
        refreshCard(item.id);
        updateGlobalProgress();
        applyFiltersAndSearch();
      });
      head.appendChild(sCb);

      const title = document.createElement('div');
      title.className = 'season-title';
      title.textContent = season.name || ('Sezon ' + season.number);
      head.appendChild(title);

      const stats = document.createElement('div');
      stats.className = 'season-stats';
      head.appendChild(stats);

      head.addEventListener('click', (ev) => {
        if (ev.target.closest('.cbox')) return;
        sEl.classList.toggle('is-open');
      });

      sEl.appendChild(head);

      const epsEl = document.createElement('div');
      epsEl.className = 'episodes';

      for (const e of season.episodes) {
        const epEl = document.createElement('label');
        epEl.className = 'episode';
        epEl.dataset.ep = e.n;

        // Episode still thumbnail
        const thumb = document.createElement('div');
        thumb.className = 'ep-thumb';
        if (e.still) {
          const img = document.createElement('img');
          img.loading = 'lazy';
          img.src = e.still;
          img.alt = '';
          img.addEventListener('error', () => thumb.classList.add('is-broken'), { once: true });
          thumb.appendChild(img);
        } else {
          thumb.classList.add('is-broken');
        }
        epEl.appendChild(thumb);

        const info = document.createElement('div');
        info.className = 'ep-info';

        const top = document.createElement('div');
        top.className = 'ep-top';

        const num = document.createElement('span');
        num.className = 'episode-num';
        num.textContent = 'E' + e.n;
        top.appendChild(num);

        const t = document.createElement('span');
        t.className = 'episode-title';
        t.textContent = e.title || ('Episode ' + e.n);
        top.appendChild(t);

        info.appendChild(top);

        if (e.air_date) {
          const ad = document.createElement('div');
          ad.className = 'ep-air';
          ad.textContent = e.air_date;
          info.appendChild(ad);
        }

        epEl.appendChild(info);

        const eCb = document.createElement('input');
        eCb.type = 'checkbox';
        eCb.className = 'cbox';
        eCb.checked = isEpisodeWatched(item.id, season.number, e.n);
        eCb.addEventListener('click', (ev) => ev.stopPropagation());
        eCb.addEventListener('change', () => {
          setEpisodeWatched(item.id, season.number, e.n, eCb.checked);
          epEl.classList.toggle('is-watched', eCb.checked);
          updateSeasonState(item, season, sEl);
          const card = listEl.querySelector('.card[data-id="' + cssEscape(item.id) + '"]');
          if (card) updateCardWatchedState(card, item);
          updateGlobalProgress();
          applyFiltersAndSearch();
        });
        epEl.appendChild(eCb);

        if (eCb.checked) epEl.classList.add('is-watched');
        epsEl.appendChild(epEl);
      }

      sEl.appendChild(epsEl);
      updateSeasonState(item, season, sEl);
      wrap.appendChild(sEl);
    }

    return wrap;
  }

  // -------- Updaters --------
  function updateSeasonState(item, season, sEl) {
    const { watched, total } = seasonProgress(item, season);
    const cb = sEl.querySelector('.season-cbox');
    const stats = sEl.querySelector('.season-stats');
    stats.textContent = watched + ' / ' + total;
    if (watched === 0) { cb.checked = false; cb.classList.remove('is-indeterminate'); }
    else if (watched === total) { cb.checked = true; cb.classList.remove('is-indeterminate'); }
    else { cb.checked = false; cb.classList.add('is-indeterminate'); }
  }

  function updateCardWatchedState(card, item) {
    const { watched, total } = itemProgress(item);
    card.classList.toggle('is-watched', total > 0 && watched === total);

    const cb = card.querySelector('.card-head > .right > .cbox');
    if (cb && item.type === 'film') cb.checked = isFilmWatched(item.id);
    if (cb && item.type === 'series') {
      if (total === 0) { cb.checked = false; cb.classList.remove('is-indeterminate'); cb.disabled = true; }
      else if (watched === 0) { cb.checked = false; cb.classList.remove('is-indeterminate'); cb.disabled = false; }
      else if (watched === total) { cb.checked = true; cb.classList.remove('is-indeterminate'); cb.disabled = false; }
      else { cb.checked = false; cb.classList.add('is-indeterminate'); cb.disabled = false; }
    }

    const pct = card.querySelector('.meta-progress');
    const fill = card.querySelector('.mini-bar-fill');
    if (pct && total > 0) {
      const p = Math.round((watched / total) * 100);
      pct.textContent = p + '%';
      if (fill) fill.style.width = p + '%';
    } else if (pct) {
      pct.textContent = '';
      if (fill) fill.style.width = '0%';
    }
  }

  function refreshCard(id) {
    const item = WATCHLIST.find(x => x.id === id);
    if (!item) return;
    const card = listEl.querySelector('.card[data-id="' + cssEscape(id) + '"]');
    if (!card) return;
    const wasOpen = card.classList.contains('is-open');
    const openSeasons = new Set();
    card.querySelectorAll('.season.is-open').forEach(s => openSeasons.add(s.dataset.season));
    const fresh = renderCard(item);
    if (wasOpen) fresh.classList.add('is-open');
    fresh.querySelectorAll('.season').forEach(s => {
      if (openSeasons.has(s.dataset.season)) s.classList.add('is-open');
    });
    card.replaceWith(fresh);
  }

  function updateGlobalProgress() {
    const { watched, total } = globalProgress();
    progressLabel.textContent = 'Bölüm: ' + watched + ' / ' + total;
    const pct = total === 0 ? 0 : Math.round((watched / total) * 100);
    progressPercent.textContent = pct + '%';
    progressFill.style.width = pct + '%';

    if (timeLabel && timeFill && timePercent) {
      const tp = globalTimeProgress();
      timeLabel.textContent = 'Süre: ' + formatDuration(tp.watched) + ' / ' + formatDuration(tp.total);
      const tpct = tp.total === 0 ? 0 : Math.round((tp.watched / tp.total) * 100);
      timePercent.textContent = tpct + '%';
      timeFill.style.width = tpct + '%';
    }
  }

  // -------- Filters & search --------
  function applyFiltersAndSearch() {
    const q = searchQuery.trim().toLowerCase();
    for (const card of listEl.querySelectorAll('.card')) {
      const id = card.dataset.id;
      const item = WATCHLIST.find(x => x.id === id);
      if (!item) continue;
      const { watched, total } = itemProgress(item);

      let passFilter = true;
      if (activeFilter === 'watched') passFilter = total > 0 && watched === total;
      else if (activeFilter === 'unwatched') passFilter = total === 0 || watched < total;

      let passSearch = true;
      if (q) {
        const haystack = [
          item.title,
          item.era || '',
          ...itemSeasons(item).flatMap(s => [
            'sezon ' + s.number,
            s.name || '',
            ...s.episodes.map(e => e.title || ''),
          ]),
        ].join(' ').toLowerCase();
        passSearch = haystack.includes(q);
      }

      card.classList.toggle('is-hidden', !(passFilter && passSearch));
    }
  }

  // -------- Wiring --------
  searchEl.addEventListener('input', () => {
    searchQuery = searchEl.value;
    applyFiltersAndSearch();
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeFilter = btn.dataset.filter;
      applyFiltersAndSearch();
    });
  });

  resetBtn.addEventListener('click', () => {
    const g = globalProgress();
    if (g.watched === 0) { alert('Henüz işaretlenmiş bir şey yok.'); return; }
    if (!confirm('Tüm işaretler silinecek (' + g.watched + ' / ' + g.total + '). Emin misin?')) return;
    state = {};
    saveState();
    renderAll();
  });

  keySaveBtn.addEventListener('click', async () => {
    const v = keyInput.value.trim();
    if (!v) { keyStatus.textContent = 'Key girilmedi.'; return; }
    keyStatus.textContent = 'Doğrulanıyor…';
    apiKey = v;
    try {
      // Validate by a small test request
      await tmdbGet('/configuration');
      localStorage.setItem(TMDB_KEY_STORE, v);
      keyInput.value = '';
      hideKeyBanner();
      await fetchAll({ force: true });
    } catch (e) {
      apiKey = '';
      if (e.status === 401) keyStatus.textContent = 'Geçersiz API key.';
      else keyStatus.textContent = 'Hata: ' + e.message;
    }
  });

  refreshBtn.addEventListener('click', async () => {
    if (!apiKey) { showKeyBanner('Önce API key gir.'); return; }
    if (!confirm('TMDB verileri yeniden çekilsin mi? (Önbellek temizlenir)')) return;
    cache = { byId: {} };
    saveCache();
    renderAll();
    await fetchAll({ force: true });
  });

  editKeyBtn.addEventListener('click', () => {
    keyInput.value = apiKey;
    showKeyBanner('');
  });

  // CSS.escape polyfill
  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  // -------- One-time cache cleanups --------
  // Yanlış TMDB ID'leri yüzünden cache'de hatalı entryler kalmış olabilir.
  // Her bir cleanup tek seferlik bir bayrak ile çalışır; tekrar tekrar çalışmaz.
  function runCleanups() {
    const cleanups = [
      // 2026-05: Acolyte ID 114472 yanlışlıkla Secret Invasion idi; Tales of the Empire ID
      // de hatalı / mevcut değildi. İlgili cache entrylerini sil ki yeniden çekilsinler.
      { flag: 'sw-cleanup-2026-05-acolyte-toe', ids: ['acolyte', 'tales-of-the-empire'] },
    ];
    let touched = false;
    for (const c of cleanups) {
      if (localStorage.getItem(c.flag)) continue;
      for (const id of c.ids) {
        if (cache.byId[id]) { delete cache.byId[id]; touched = true; }
      }
      localStorage.setItem(c.flag, '1');
    }
    if (touched) saveCache();
  }
  runCleanups();

  // -------- Boot --------
  renderAll();
  if (!apiKey) {
    showKeyBanner('');
  } else {
    hideKeyBanner();
    // Önbellekte eksik olanları arka planda çek
    const missing = WATCHLIST.some(i => !cache.byId[i.id]);
    if (missing) fetchAll();
  }
})();
