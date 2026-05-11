// =====================================================================
//  Habesha Trends - Manual Weekly Chart Updater
// =====================================================================
//
//  WHAT THIS DOES
//    Pulls fresh stats from YouTube Data API v3 for every video ID in
//    the ytIds list below, merges with the previous data.json (so
//    editorial fields like country/lang/reason are preserved and weekly
//    deltas can be computed), and writes:
//      1. data.json           - paste-ready, commit to your repo
//      2. SONGS array literal - paste-ready, inline into index.html
//
//  WHAT THIS DOES NOT DO
//    Touch your website code. No HTML/CSS/JS files are modified except
//    data.json (which is just data, not design).
//
//  HOW TO RUN
//    Requires Node 18+ (for native fetch).
//
//    macOS / Linux:
//        YT_API_KEY=your_key_here node update-chart.mjs
//
//    Windows PowerShell:
//        $env:YT_API_KEY="your_key_here"; node update-chart.mjs
//
//    Windows CMD:
//        set YT_API_KEY=your_key_here && node update-chart.mjs
//
//  API KEY SAFETY
//    The key is read from the YT_API_KEY environment variable. It is
//    never written into this file, never written into output, never
//    committed. Add this file to your repo freely.
//    To keep the key off your shell history, put it in a local file
//    (e.g. .env.local) that is listed in .gitignore.
//
// =====================================================================

import fs from 'node:fs';
import path from 'node:path';

// --- EDIT THIS LIST: YouTube video IDs to track ---------------------
// The ID is the part after "watch?v=" in a YouTube URL.
// Example: https://www.youtube.com/watch?v=ADc9JPeLYi4  ->  "ADc9JPeLYi4"

const ytIds = [
  "ADc9JPeLYi4",   // [ETH] Teddy Afro - Das Tal (Ansaw)
  "UlqLeuVHpEU",   // [ETH] Teddy Afro - Shih Bibal (Back to 90s)
  "nw443G62EQc",   // [ETH] Teddy Afro - Sememene (GuReggae)
  "PA2aWF37Ljk",   // [ETH] Teddy Afro - Jember
  "DsH_LxBB4l8",   // [ETH] Teddy Afro - Ze Tsedal
  "jaBZ9xXM2gU",   // [ETH] Teddy Afro - Merema
  "BQSgYf4lfMg",   // [ETH] Teddy Afro - Merkeb
  "IYf-RLJNMGU",   // [ETH] Teddy Afro - Tsion Mushraye
  "FoBBYyvZCkc",   // [ETH] Teddy Afro - Bilchita
  "P9KzCEdCuV4",   // [ETH] Gelana Garomsa ft Yosan - Galmee Seenaa
  "pRHWe6Lz2mY",   // [ETH] Teddy Afro - Tayegn
  "oEIySELAmqU",   // [ETH] Teddy Afro - Etorika
  "d1rAhwRJNyI",   // [ETH] Teddy Afro - Tintago (Pintago)
  "jvYGP-reKEI",   // [ETH] Teddy Afro - Samnew
  "sPYgRlfA-kc",   // [ETH] Teddy Afro - Yeazo Emba
  "FvHyBLvGJl0",   // [ETH] Teddy Afro - Tewedaj
  "UHNizap0GX4",   // [ETH] Teddy Afro - Sema Erase
  "Mg0Wu49V8Bw",   // [ETH] Teddy Afro - Bemeskotu
  "NbYJmTUy1jg",   // [ETH] Teddy Afro - Yemaereg Tig
  "8EjcYircKvw",   // [ETH] Yo Marios - Digis New
  "naph6wDDooU",   // [ETH] Eden Aysheshem - Yelebe Sew
  "e6vSKh9hiBU",   // [ETH] Mak Ezra - Tewehade
  "JxjGMGJmP8U",   // [ETH] JA - Maru Negn ke Dessie
  "RGW5nMfZpp4",   // [ETH] Eyu Tsega - Eyu Tsega
  "jSgnlSaT_Ts",   // [ETH] Gelana Garomsa - Yaa Shuurakoo
  "gliv_skuGL8",   // [ETH] Hachalu Hundessa - Maalan Jira
  "rV4iG4nn5Iw",   // [ETH] Nati Ker - Neger Neger
  "2ixjSHqHqpU",   // [ETH] Hachalu Hundessa - Minnow Nesh
  "Gk6ZkJoFBnE",   // [ETH] Dawit Tsige - Sabbata
  "QxNe3k0b9EU",   // [ETH] Caalaa Bultumee - Siifan Jira
  "oBgUwARHrCo",   // [ERI] Timnit Welday - Shane
  "jWSRjGB3JMU",   // [ERI] Selamawit Yohannes - Mizan
  "wnK1O310CZI",   // [ERI] Amanuel Yemane - Niskila
  "jvxWsiK49nM",   // [ERI] Embza Aligaz - Atinye
  "Zs-r2C86fis",   // [ERI] Merkeb Bonitua - Akayda
  "yegG7qClGy0",   // [ERI] Rahel Haile - Elakani
  "HOADb_H4buk",   // [ERI] Nguse Abadi - Maeger
  "lvAoHssg6qQ",   // [ERI] Solomon Yikunoamlak - Zara
  "o4JUximUsCM",   // [ERI] Temesgen Teklay (Siktit) - Gudam
  "Q0wH8GVbRfY",   // [ERI] Helen Meles - Libi Zbele
  "YybkSxcgvIQ",   // [ERI] Yared Netsanet - Tayti
];

// --- Config ---------------------------------------------------------
const DATA_PATH            = './data.json';
const NEW_THRESHOLD_DAYS   = 7;     // "isNew" if uploaded within 7 days
const TRENDING_GROWTH_RATE = 0.50;  // "isTrending" if >= 50% week-over-week

// --- API key check (read from env, never hardcoded) -----------------
const API_KEY = process.env.YT_API_KEY;
if (!API_KEY) {
  console.error('');
  console.error('  ERROR: YT_API_KEY environment variable not set.');
  console.error('');
  console.error('  Run with:');
  console.error('    YT_API_KEY=your_key_here node update-chart.mjs');
  console.error('');
  process.exit(1);
}

if (ytIds.length === 0) {
  console.error('  ERROR: ytIds list is empty. Add some video IDs at the top of this file.');
  process.exit(1);
}

// --- YouTube Data API call (batched, 50 IDs per call = 1 quota unit) -
async function fetchVideos(ids) {
  const result = {};
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url = 'https://www.googleapis.com/youtube/v3/videos'
              + '?part=snippet,statistics'
              + '&id=' + batch.join(',')
              + '&key=' + API_KEY;

    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error('YouTube API ' + res.status + ': ' + body.slice(0, 400));
    }
    const data = await res.json();
    for (const item of data.items || []) {
      const sn = item.snippet    || {};
      const st = item.statistics || {};
      const thumbs = sn.thumbnails || {};
      result[item.id] = {
        ytId:        item.id,
        title:       sn.title         || '',
        artist:      sn.channelTitle  || '',
        publishedAt: sn.publishedAt   || '',
        views:       parseInt(st.viewCount    || '0', 10),
        likes:       parseInt(st.likeCount    || '0', 10),
        comments:    parseInt(st.commentCount || '0', 10),
        thumbUrl:    (thumbs.maxres   && thumbs.maxres.url)
                  || (thumbs.standard && thumbs.standard.url)
                  || (thumbs.high     && thumbs.high.url)
                  || ('https://i.ytimg.com/vi/' + item.id + '/maxresdefault.jpg'),
        youtubeUrl:  'https://www.youtube.com/watch?v=' + item.id,
      };
    }
    console.log('  batch ' + (Math.floor(i / 50) + 1) + ': ' + Object.keys(result).length + '/' + ids.length + ' fetched');
  }
  return result;
}

// --- Main -----------------------------------------------------------
async function main() {
  console.log('> Habesha Trends - Weekly Chart Updater');
  console.log('  ' + new Date().toISOString());
  console.log('  Tracking ' + ytIds.length + ' video(s)');
  console.log('');

  // Load previous data.json for delta math AND for preserving editorial
  // fields (country, lang, genre, reason, spotifyId) that the API does
  // not provide.
  let previous = { songs: [] };
  if (fs.existsSync(DATA_PATH)) {
    try {
      previous = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      console.log('  loaded previous data.json (' + (previous.songs || []).length + ' songs)');
    } catch (e) {
      console.warn('  could not parse existing data.json - starting fresh');
    }
  } else {
    console.log('  no previous data.json found - first run');
  }
  const prevByYtId = {};
  for (const s of (previous.songs || [])) {
    prevByYtId[s.ytId] = s;
  }

  // Fetch fresh data
  console.log('');
  console.log('> Calling YouTube Data API v3 ...');
  const fresh = await fetchVideos(ytIds);
  const missing = ytIds.filter(function (id) { return !fresh[id]; });
  if (missing.length) {
    console.warn('  ! ' + missing.length + ' video(s) not returned (deleted, private, or invalid):');
    missing.forEach(function (id) { console.warn('    - ' + id); });
  }

  // Build the new song list. Order matches ytIds until we sort by weekViews.
  const now = Date.now();
  const songs = ytIds.map(function (ytId) {
    const f    = fresh[ytId];
    const prev = prevByYtId[ytId] || null;

    // If API did not return this video, keep the previous record so it
    // does not disappear from the chart. If we have no previous either,
    // skip it.
    if (!f) return prev || null;

    const oldViews   = (prev && prev.views) || 0;
    const weekViews  = Math.max(0, f.views - oldViews);
    const growthRate = oldViews > 0 ? weekViews / oldViews : 1;
    const ageDays    = f.publishedAt
      ? (now - new Date(f.publishedAt).getTime()) / 86400000
      : 999;

    return {
      // --- From YouTube API (fresh stats every run) ---
      ytId:        f.ytId,
      views:       f.views,
      likes:       f.likes,
      comments:    f.comments,
      publishedAt: f.publishedAt,
      thumbUrl:    f.thumbUrl,
      youtubeUrl:  f.youtubeUrl,

      // --- Editorial (preserved from previous data.json; falls back to YouTube if absent) ---
      title:       (prev && prev.title)  || f.title,
      artist:      (prev && prev.artist) || f.artist,

      // --- Computed (this week) ---
      weekViews:   weekViews,
      growthRate:  Number(growthRate.toFixed(4)),
      rank:        0,                                          // assigned after sort
      prev:        prev ? prev.rank : null,
      isNew:       ageDays <= NEW_THRESHOLD_DAYS || !prev,
      isTrending:  growthRate >= TRENDING_GROWTH_RATE,

      // --- Preserved editorial (the API does not know these) ---
      country:     (prev && prev.country)   || '',
      lang:        (prev && prev.lang)      || '',
      genre:       (prev && prev.genre)     || '',
      reason:      (prev && prev.reason)    || '',
      spotifyId:   (prev && prev.spotifyId) || null,
      year:        (prev && prev.year)
                || (f.publishedAt ? new Date(f.publishedAt).getFullYear() : null),
    };
  }).filter(function (x) { return x; });

  // Rank by weekly view growth
  songs.sort(function (a, b) { return b.weekViews - a.weekViews; });
  songs.forEach(function (s, i) { s.rank = i + 1; });

  // --- Output 1: data.json ------------------------------------------
  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      videoCount:  songs.length,
      missing:     missing,
    },
    songs: songs,
  };
  fs.writeFileSync(DATA_PATH, JSON.stringify(output, null, 2));
  console.log('');
  console.log('[OK] Wrote ' + path.resolve(DATA_PATH));
  console.log('     ' + songs.length + ' song(s) ranked by weekViews');

  // --- Output 2: SONGS array literal (inline paste into index.html) -
  const songsLiteralPath = './SONGS.snippet.js';
  const literal = 'const SONGS = ' + JSON.stringify(songs, null, 2) + ';\n';
  fs.writeFileSync(songsLiteralPath, literal);
  console.log('[OK] Wrote ' + path.resolve(songsLiteralPath) + '  (paste-ready snippet)');

  // --- Summary ------------------------------------------------------
  console.log('');
  console.log('> Top 10 this week:');
  songs.slice(0, 10).forEach(function (s) {
    let move;
    if (s.prev == null)          move = 'NEW';
    else if (s.prev === s.rank)  move = ' - ';
    else if (s.prev > s.rank)    move = '+' + (s.prev - s.rank);
    else                         move = '-' + (s.rank - s.prev);

    const tag = s.isTrending ? '[T]' : (s.isNew ? '[N]' : '   ');

    console.log(
      '  #' + String(s.rank).padStart(2) + ' ' +
      move.padStart(4) + ' ' + tag + '  ' +
      (s.title  || '').slice(0, 36).padEnd(36) + ' ' +
      (s.artist || '').slice(0, 22).padEnd(22) + ' ' +
      s.weekViews.toLocaleString().padStart(12) + ' wk'
    );
  });
  console.log('');
  console.log('  Done. Commit data.json (and SONGS.snippet.js if you use it).');
  console.log('');
}

main().catch(function (err) {
  console.error('');
  console.error('FAILED: ' + err.message);
  process.exit(1);
});
