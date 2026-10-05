/* Service galleries: any element with data-gallery="<key>" opens a swipeable photo viewer.
   Images live in <base>/<folder>/01.jpg, 02.jpg ... (the first image opens first).
   To add images: drop the next number into the folder and raise that category's `count`. */
(function () {
  "use strict";

  const GALLERIES = {
    interior: {
      title: "Interior Design",
      base: "assets/images/interior/",
      categories: [
        { folder: "office", label: "Office", count: 10 },
        { folder: "bedroom", label: "Bedroom", count: 17 },
        { folder: "sitting-room", label: "Sitting Room", count: 15 },
        { folder: "bathroom", label: "Bathroom", count: 3 },
        { folder: "dining-room", label: "Dining Room", count: 7 },
        { folder: "kitchen", label: "Kitchen", count: 16 }
      ]
    },
    architectural: {
      title: "Architectural Design",
      base: "assets/images/gallery/",
      categories: [{ folder: "architectural", label: "Apartment design", count: 5 }]
    },
    residential: {
      title: "Residential Construction",
      base: "assets/images/gallery/",
      categories: [{ folder: "residential", label: "Residential design", count: 6 }]
    },
    renovation: {
      title: "Renovation & Remodeling",
      base: "assets/images/gallery/",
      categories: [{ folder: "renovation", label: "Twin house design", count: 5 }]
    },
    commercial: {
      title: "Commercial Construction",
      base: "assets/images/gallery/",
      categories: [{ folder: "commercial", label: "Rebero project", count: 6 }]
    }
  };

  const triggers = document.querySelectorAll("[data-gallery]");
  if (!triggers.length) return;

  const ARROW_LEFT = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7"/></svg>';
  const ARROW_RIGHT = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>';
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let modal, titleEl, tabsEl, track, counterEl, prevBtn, nextBtn, closeBtn, captionEl;
  let gallery = null, activeCat = 0, index = 0, lastFocus = null, inertNodes = [], prevOverflow = "";

  function el(tag, cls, attrs) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  /* ---------- build ---------- */

  function build() {
    modal = el("div", "interior-modal", { role: "dialog", "aria-modal": "true" });
    const inner = el("div", "interior-modal-inner");

    const head = el("div", "interior-head");
    titleEl = el("h2", "interior-title");
    closeBtn = el("button", "interior-close", { type: "button", "aria-label": "Close gallery" });
    closeBtn.innerHTML = "&times;";
    head.appendChild(titleEl);
    head.appendChild(closeBtn);

    tabsEl = el("div", "interior-tabs", { role: "group", "aria-label": "Room type" });

    const stage = el("div", "interior-stage");
    track = el("div", "interior-track", { tabindex: "0", "aria-label": "Images. Swipe or use the arrow keys." });
    prevBtn = el("button", "interior-nav interior-prev", { type: "button", "aria-label": "Previous image" });
    prevBtn.innerHTML = ARROW_LEFT;
    nextBtn = el("button", "interior-nav interior-next", { type: "button", "aria-label": "Next image" });
    nextBtn.innerHTML = ARROW_RIGHT;
    counterEl = el("div", "interior-counter", { "aria-live": "polite" });
    stage.appendChild(track);
    stage.appendChild(prevBtn);
    stage.appendChild(nextBtn);
    stage.appendChild(counterEl);

    captionEl = el("p", "interior-caption");

    inner.appendChild(head);
    inner.appendChild(tabsEl);
    inner.appendChild(stage);
    inner.appendChild(captionEl);
    modal.appendChild(inner);
    document.body.appendChild(modal);

    closeBtn.addEventListener("click", close);
    modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
    prevBtn.addEventListener("click", function () { go(index - 1); });
    nextBtn.addEventListener("click", function () { go(index + 1); });
    track.addEventListener("scroll", onScroll, { passive: true });
    modal.addEventListener("keydown", trapFocus);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", function () {
      if (modal.classList.contains("open")) track.scrollTo({ left: index * track.clientWidth, behavior: "auto" });
    });
    enableMouseDrag();
  }

  /* ---------- slides ---------- */

  function buildTabs() {
    tabsEl.textContent = "";
    const multi = gallery.categories.length > 1;
    tabsEl.hidden = !multi; // a single-category gallery needs no room tabs
    if (!multi) return;
    gallery.categories.forEach(function (c, i) {
      const b = el("button", "interior-tab", { type: "button" });
      b.appendChild(document.createTextNode(c.label + " "));
      const n = el("span", "interior-tab-count");
      n.textContent = c.count;
      b.appendChild(n);
      b.addEventListener("click", function () { selectCategory(i); });
      tabsEl.appendChild(b);
    });
  }

  function selectCategory(i) {
    activeCat = i;
    const cat = gallery.categories[i];
    Array.prototype.forEach.call(tabsEl.children, function (b, k) {
      b.setAttribute("aria-pressed", k === i ? "true" : "false");
      b.classList.toggle("active", k === i);
    });
    track.textContent = "";
    for (let n = 1; n <= cat.count; n++) {
      const slide = el("div", "interior-slide", {
        role: "group", "aria-roledescription": "slide", "aria-label": n + " of " + cat.count
      });
      const img = el("img", "", { alt: cat.label + " " + n, draggable: "false", decoding: "async" });
      img.loading = n <= 2 ? "eager" : "lazy";
      img.src = gallery.base + cat.folder + "/" + pad(n) + ".jpg";
      slide.appendChild(img);
      track.appendChild(slide);
    }
    index = 0;
    track.scrollTo({ left: 0, behavior: "auto" });
    update();
  }

  function update() {
    const cat = gallery.categories[activeCat];
    counterEl.textContent = (index + 1) + " / " + cat.count;
    captionEl.textContent = cat.label + " " + (index + 1) + " of " + cat.count;
    prevBtn.disabled = index <= 0;
    nextBtn.disabled = index >= cat.count - 1;
  }

  function go(i) {
    const max = gallery.categories[activeCat].count - 1;
    index = Math.max(0, Math.min(max, i));
    track.scrollTo({ left: index * track.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
    update();
  }

  function onScroll() {
    const i = Math.round(track.scrollLeft / (track.clientWidth || 1));
    if (i !== index) { index = i; update(); }
  }

  // Touch swipe is native (scroll-snap); this adds click-and-drag for mouse users.
  function enableMouseDrag() {
    let down = false, startX = 0, startScroll = 0, startIndex = 0, moved = 0;
    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = 0; startX = e.clientX; startScroll = track.scrollLeft; startIndex = index;
      track.classList.add("dragging");
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener("pointermove", function (e) {
      if (!down) return;
      moved = e.clientX - startX;
      track.scrollLeft = startScroll - moved;
    });
    function end() {
      if (!down) return;
      down = false;
      track.classList.remove("dragging");
      const threshold = Math.min(80, track.clientWidth * 0.15);
      go(moved <= -threshold ? startIndex + 1 : moved >= threshold ? startIndex - 1 : startIndex);
    }
    track.addEventListener("pointerup", end);
    track.addEventListener("pointercancel", end);
  }

  /* ---------- open / close / keyboard ---------- */

  function open(key, opener) {
    if (!GALLERIES[key]) return;
    if (!modal) build();
    gallery = GALLERIES[key];
    lastFocus = opener;
    titleEl.textContent = gallery.title;
    modal.setAttribute("aria-label", gallery.title + " gallery");
    buildTabs();
    modal.classList.add("open");
    inertNodes = Array.prototype.filter.call(document.body.children, function (n) {
      return n !== modal && n.tagName !== "SCRIPT";
    });
    inertNodes.forEach(function (n) { n.inert = true; });
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    selectCategory(0);
    closeBtn.focus();
  }

  function close() {
    if (!modal || !modal.classList.contains("open")) return;
    modal.classList.remove("open");
    inertNodes.forEach(function (n) { n.inert = false; });
    inertNodes = [];
    document.body.style.overflow = prevOverflow;
    track.textContent = ""; // stop loading images that are no longer on screen
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onKey(e) {
    if (!modal || !modal.classList.contains("open")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
  }

  function trapFocus(e) {
    if (e.key !== "Tab") return;
    const stops = Array.prototype.filter.call(
      modal.querySelectorAll("button, [tabindex='0']"),
      function (n) { return !n.disabled && n.offsetParent !== null; }
    );
    if (!stops.length) return;
    const first = stops[0], last = stops[stops.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  triggers.forEach(function (t) {
    const key = t.getAttribute("data-gallery");
    t.addEventListener("click", function () { open(key, t); });
    t.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(key, t); }
    });
  });
})();
