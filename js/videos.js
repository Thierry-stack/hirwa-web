/* "Our Projects in Motion" gallery. Videos stay on YouTube: only metadata/thumbnails are fetched,
   and playback uses YouTube's embedded player. Config (API key etc.) lives in js/config.js. */
(function () {
  "use strict";

  const cfg = window.HDCG_CONFIG && window.HDCG_CONFIG.youtube;
  const grid = document.getElementById("video-grid");
  if (!cfg || !grid) return;

  const API = "https://www.googleapis.com/youtube/v3/";
  const CACHE_KEY = "hdcg_yt_videos_v3";
  const CACHE_TTL_MS = (cfg.cacheMinutes || 60) * 60 * 1000;
  const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z"/></svg>';

  /* ---------- data ---------- */

  function thumbFor(id) {
    return "https://i.ytimg.com/vi/" + encodeURIComponent(id) + "/hqdefault.jpg";
  }

  function getJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  // "PT1H2M3S" / "P1DT2H" -> seconds. Returns 0 for live/upcoming ("P0D") or unparseable values.
  function parseDuration(iso) {
    const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(iso || "");
    if (!m) return 0;
    return (+m[1] || 0) * 604800 + (+m[2] || 0) * 86400 + (+m[3] || 0) * 3600 + (+m[4] || 0) * 60 + (+m[5] || 0);
  }

  // Shorts have no public "isShort" flag, so anything at or under the threshold is treated as a Short.
  function toVideo(item) {
    const s = item.snippet;
    const dur = parseDuration(item.contentDetails && item.contentDetails.duration);
    if (!s || dur <= (cfg.minDurationSeconds || 60)) return null;
    const t = s.thumbnails && (s.thumbnails.high || s.thumbnails.medium || s.thumbnails.default);
    return {
      id: item.id,
      title: s.title,
      thumb: t ? t.url : thumbFor(item.id),
      publishedAt: s.publishedAt || "",
      views: parseInt(item.statistics && item.statistics.viewCount, 10) || 0
    };
  }

  function fetchDetails(ids, key) {
    const chunks = [];
    for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
    return Promise.all(chunks.map(function (chunk) {
      return getJson(API + "videos?part=contentDetails,statistics,snippet&id=" +
        chunk.map(encodeURIComponent).join(",") + "&key=" + key);
    })).then(function (responses) {
      return responses.reduce(function (all, r) { return all.concat(r.items || []); }, []);
    });
  }

  // Walk the uploads playlist page by page, keeping non-Short videos, until we have enough or run out.
  function collectVideos(uploads, key, pageToken, found, page) {
    let url = API + "playlistItems?part=contentDetails&playlistId=" + encodeURIComponent(uploads) +
      "&maxResults=" + (cfg.pageSize || 50) + "&key=" + key;
    if (pageToken) url += "&pageToken=" + encodeURIComponent(pageToken);
    return getJson(url).then(function (pl) {
      const ids = (pl.items || []).map(function (i) { return i.contentDetails && i.contentDetails.videoId; }).filter(Boolean);
      return (ids.length ? fetchDetails(ids, key) : Promise.resolve([])).then(function (details) {
        const all = found.concat(details.map(toVideo).filter(Boolean));
        const enough = !cfg.scanAllUploads && all.length >= (cfg.videosToShow || 8);
        if (enough || !pl.nextPageToken || page + 1 >= (cfg.maxPages || 10)) return all;
        return collectVideos(uploads, key, pl.nextPageToken, all, page + 1);
      });
    });
  }

  function fetchFromApi() {
    const key = encodeURIComponent(cfg.apiKey);
    return getJson(API + "channels?part=contentDetails&id=" + encodeURIComponent(cfg.channelId) + "&key=" + key)
      .then(function (ch) {
        const uploads = ch.items && ch.items[0] && ch.items[0].contentDetails.relatedPlaylists.uploads;
        if (!uploads) throw new Error("uploads playlist not found");
        return collectVideos(uploads, key, "", [], 0);
      })
      .then(function (videos) {
        return videos
          .sort(function (a, b) { return b.views - a.views; })
          .slice(0, cfg.videosToShow || 8);
      });
  }

  /* ---------- curated list ---------- */

  // When config.featuredVideos is set, show exactly those videos in that order instead of auto-ranking.
  // The signature makes the cache refresh as soon as the list changes.
  const featured = cfg.featuredVideos || [];
  const SIG = featured.length ? featured.map(function (v) { return v.id; }).join(",") : "auto";

  function fetchFeatured() {
    const key = encodeURIComponent(cfg.apiKey);
    const ids = featured.map(function (v) { return encodeURIComponent(v.id); }).join(",");
    return getJson(API + "videos?part=snippet&id=" + ids + "&key=" + key).then(function (res) {
      const byId = {};
      (res.items || []).forEach(function (i) { byId[i.id] = i; });
      // Keep the configured order; skip IDs YouTube no longer returns (deleted or private).
      return featured.map(function (f) {
        const it = byId[f.id];
        if (!it) return null;
        const t = it.snippet.thumbnails && (it.snippet.thumbnails.high || it.snippet.thumbnails.medium || it.snippet.thumbnails.default);
        return { id: f.id, title: it.snippet.title, thumb: t ? t.url : thumbFor(f.id), publishedAt: it.snippet.publishedAt || "" };
      }).filter(Boolean);
    });
  }

  function featuredFallback() {
    return featured.map(function (f) {
      return { id: f.id, title: f.title, thumb: thumbFor(f.id), publishedAt: "" };
    });
  }

  /* ---------- cache + loading ---------- */

  function readCache(allowStale) {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (!c || c.channelId !== cfg.channelId || c.sig !== SIG || !c.videos || !c.videos.length) return null;
      return allowStale || Date.now() - c.savedAt < CACHE_TTL_MS ? c.videos : null;
    } catch (e) {
      return null;
    }
  }

  function writeCache(videos) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), channelId: cfg.channelId, sig: SIG, videos: videos }));
    } catch (e) { /* storage unavailable: just skip caching */ }
  }

  function fallbackVideos() {
    if (featured.length) return featuredFallback();
    return (cfg.fallbackVideos || []).map(function (v) {
      return { id: v.id, title: v.title, thumb: thumbFor(v.id), publishedAt: "" };
    });
  }

  function loadVideos() {
    const fresh = readCache(false);
    if (fresh) return Promise.resolve(fresh);
    return (featured.length ? fetchFeatured() : fetchFromApi())
      .then(function (live) {
        if (!live.length) throw new Error("no public videos returned");
        writeCache(live);
        return live;
      })
      .catch(function (err) {
        console.warn("[videos] YouTube API unavailable, using fallback:", err.message);
        return readCache(true) || fallbackVideos();
      });
  }

  /* ---------- modal player ---------- */

  let modal, frameWrap, closeBtn, lastFocus, inertNodes = [], prevOverflow = "";

  function buildModal() {
    modal = document.createElement("div");
    modal.className = "video-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Video player");

    const inner = document.createElement("div");
    inner.className = "video-modal-inner";

    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "video-modal-close";
    closeBtn.setAttribute("aria-label", "Close video");
    closeBtn.innerHTML = "&times;";

    frameWrap = document.createElement("div");
    frameWrap.className = "video-modal-frame";

    inner.appendChild(closeBtn);
    inner.appendChild(frameWrap);
    modal.appendChild(inner);
    document.body.appendChild(modal);

    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });
    modal.addEventListener("keydown", trapFocus);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });
  }

  function trapFocus(e) {
    if (e.key !== "Tab") return;
    const stops = [closeBtn, frameWrap.querySelector("iframe")].filter(Boolean);
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openModal(video, opener) {
    if (!modal) buildModal();
    lastFocus = opener;

    const iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube.com/embed/" + encodeURIComponent(video.id) + "?autoplay=1";
    iframe.title = video.title;
    iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    frameWrap.textContent = "";
    frameWrap.appendChild(iframe);

    modal.setAttribute("aria-label", "Video player: " + video.title);
    modal.classList.add("open");

    // Make the rest of the page unreachable while the dialog is open.
    inertNodes = Array.prototype.filter.call(document.body.children, function (n) {
      return n !== modal && n.tagName !== "SCRIPT";
    });
    inertNodes.forEach(function (n) { n.inert = true; });
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    closeBtn.focus();
  }

  function closeModal() {
    if (!modal || !modal.classList.contains("open")) return;
    modal.classList.remove("open");
    frameWrap.textContent = ""; // removing the iframe is what actually stops playback
    inertNodes.forEach(function (n) { n.inert = false; });
    inertNodes = [];
    document.body.style.overflow = prevOverflow;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- rendering ---------- */

  function formatDate(iso) {
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function makeCard(video) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "video-card";
    card.setAttribute("aria-label", "Play video: " + video.title);

    const thumb = document.createElement("span");
    thumb.className = "video-thumb";
    const img = document.createElement("img");
    img.src = video.thumb;
    img.alt = "";
    img.loading = "lazy";
    thumb.appendChild(img);
    const play = document.createElement("span");
    play.className = "video-play";
    play.innerHTML = PLAY_ICON;
    thumb.appendChild(play);

    const meta = document.createElement("span");
    meta.className = "video-meta";
    const title = document.createElement("span");
    title.className = "video-title";
    title.textContent = video.title;
    meta.appendChild(title);
    const date = formatDate(video.publishedAt);
    if (date) {
      const d = document.createElement("span");
      d.className = "video-date";
      d.textContent = date;
      meta.appendChild(d);
    }

    card.appendChild(thumb);
    card.appendChild(meta);
    card.addEventListener("click", function () { openModal(video, card); });
    return card;
  }

  function render(videos) {
    grid.textContent = "";
    grid.setAttribute("aria-busy", "false");
    if (!videos.length) {
      const msg = document.createElement("p");
      msg.className = "video-status";
      msg.textContent = "Videos coming soon — subscribe to our channel.";
      grid.appendChild(msg);
      return;
    }
    // A grid can cap how many cards it shows (e.g. data-limit="3" on the homepage).
    const limit = parseInt(grid.getAttribute("data-limit"), 10);
    (limit > 0 ? videos.slice(0, limit) : videos).forEach(function (v) { grid.appendChild(makeCard(v)); });
  }

  loadVideos().then(render, function () { render([]); });
})();
