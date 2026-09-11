/* Hirwa Design Construction Group — shared front-end behavior */
document.addEventListener("DOMContentLoaded", function () {

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouchDevice = window.matchMedia("(hover: none)").matches;
  var isNarrowViewport = window.matchMedia("(max-width: 700px)").matches;

  /* Background videos: skip autoplay on mobile/low-power or reduced-motion to save bandwidth — poster image shows instead */
  document.querySelectorAll("video[autoplay]").forEach(function (video) {
    if (prefersReducedMotion || isNarrowViewport) {
      video.pause();
      video.removeAttribute("autoplay");
    }
  });

  /* Scroll progress bar */
  var progressBar = document.querySelector(".scroll-progress");
  if (progressBar) {
    var updateProgress = function () {
      var scrollTop = window.scrollY;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressBar.style.width = pct + "%";
    };
    document.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
  }

  /* Cursor glow (desktop only) */
  var cursorGlow = document.querySelector(".cursor-glow");
  if (cursorGlow && !isTouchDevice && !prefersReducedMotion) {
    var glowX = 0, glowY = 0, curX = 0, curY = 0;
    document.addEventListener("mousemove", function (e) {
      glowX = e.clientX;
      glowY = e.clientY;
      cursorGlow.classList.add("active");
    });
    (function animateGlow() {
      curX += (glowX - curX) * 0.12;
      curY += (glowY - curY) * 0.12;
      cursorGlow.style.transform = "translate(" + curX + "px, " + curY + "px) translate(-50%, -50%)";
      requestAnimationFrame(animateGlow);
    })();
  }

  /* Tilt effect on cards with [data-tilt] (desktop only) */
  if (!isTouchDevice && !prefersReducedMotion) {
    document.querySelectorAll("[data-tilt]").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var rect = card.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        var rotateY = px * 10;
        var rotateX = py * -10;
        card.style.transform = "perspective(900px) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg) translateY(-6px)";
      });
      card.addEventListener("mouseleave", function () {
        card.style.transform = "";
      });
    });
  }

  /* Animated stat counters */
  var counters = document.querySelectorAll("[data-counter]");
  if (counters.length && "IntersectionObserver" in window) {
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = parseInt(el.getAttribute("data-counter"), 10);
        var suffix = el.getAttribute("data-suffix") || "";
        var duration = prefersReducedMotion ? 0 : 1400;
        if (duration === 0) {
          el.textContent = target + suffix;
        } else {
          var startTime = null;
          var step = function (timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(eased * target) + suffix;
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
        counterObserver.unobserve(el);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { counterObserver.observe(el); });
  }

  /* Process timeline: highlight active step + fill connecting line while scrolling */
  var timeline = document.querySelector(".process-timeline");
  if (timeline) {
    var steps = timeline.querySelectorAll(".process-step");
    var lineFill = timeline.querySelector(".process-line-fill");
    var updateTimeline = function () {
      var viewportMid = window.innerHeight * 0.55;
      var lastActiveIndex = -1;
      steps.forEach(function (step, i) {
        var rect = step.getBoundingClientRect();
        if (rect.top < viewportMid) lastActiveIndex = i;
      });
      steps.forEach(function (step, i) {
        step.classList.toggle("active", i <= lastActiveIndex);
      });
      if (lineFill && steps.length) {
        var firstRect = steps[0].getBoundingClientRect();
        var timelineRect = timeline.getBoundingClientRect();
        var pct = 0;
        if (lastActiveIndex >= 0) {
          var activeStep = steps[lastActiveIndex];
          var activeRect = activeStep.getBoundingClientRect();
          var filled = (activeRect.top + activeRect.height / 2) - timelineRect.top;
          pct = Math.max(0, Math.min(100, (filled / timelineRect.height) * 100));
        }
        lineFill.style.height = pct + "%";
      }
    };
    document.addEventListener("scroll", updateTimeline, { passive: true });
    window.addEventListener("resize", updateTimeline);
    updateTimeline();
  }

  /* Before / after comparison slider */
  var baSlider = document.getElementById("before-after");
  if (baSlider) {
    var baHandle = baSlider.querySelector(".ba-handle");
    var setBaPos = function (pct) {
      pct = Math.max(0, Math.min(100, pct));
      baSlider.style.setProperty("--ba-pos", pct + "%");
    };
    var baPosFromClientX = function (clientX) {
      var rect = baSlider.getBoundingClientRect();
      return ((clientX - rect.left) / rect.width) * 100;
    };
    var baDragging = false;
    var startDrag = function () { baDragging = true; baSlider.classList.add("dragging"); };
    var stopDrag = function () { baDragging = false; baSlider.classList.remove("dragging"); };

    baSlider.addEventListener("mousedown", function (e) { startDrag(); setBaPos(baPosFromClientX(e.clientX)); });
    document.addEventListener("mousemove", function (e) { if (baDragging) setBaPos(baPosFromClientX(e.clientX)); });
    document.addEventListener("mouseup", stopDrag);

    baSlider.addEventListener("touchstart", function (e) { startDrag(); setBaPos(baPosFromClientX(e.touches[0].clientX)); }, { passive: true });
    baSlider.addEventListener("touchmove", function (e) { if (baDragging) setBaPos(baPosFromClientX(e.touches[0].clientX)); }, { passive: true });
    document.addEventListener("touchend", stopDrag);

    if (baHandle) {
      baHandle.addEventListener("keydown", function (e) {
        var current = parseFloat(getComputedStyle(baSlider).getPropertyValue("--ba-pos")) || 50;
        if (e.key === "ArrowLeft") setBaPos(current - 5);
        if (e.key === "ArrowRight") setBaPos(current + 5);
      });
    }

    /* Gentle auto-sweep the first time it scrolls into view, to hint it's interactive */
    if ("IntersectionObserver" in window && !prefersReducedMotion) {
      var baObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          setBaPos(50);
          setTimeout(function () { setBaPos(28); }, 500);
          setTimeout(function () { setBaPos(72); }, 1400);
          setTimeout(function () { setBaPos(50); }, 2300);
          baObserver.unobserve(entry.target);
        });
      }, { threshold: 0.5 });
      baObserver.observe(baSlider);
    }
  }

  /* Mobile nav toggle */
  var navToggle = document.querySelector(".nav-toggle");
  var mainNav = document.querySelector(".main-nav");
  var navOverlay = document.querySelector(".nav-overlay");
  if (navToggle && mainNav) {
    var setNavOpen = function (open) {
      mainNav.classList.toggle("open", open);
      navToggle.classList.toggle("is-active", open);
      if (navOverlay) navOverlay.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    navToggle.addEventListener("click", function () {
      setNavOpen(!mainNav.classList.contains("open"));
    });
    if (navOverlay) {
      navOverlay.addEventListener("click", function () { setNavOpen(false); });
    }
    mainNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setNavOpen(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setNavOpen(false);
    });
  }

  /* Footer year */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Scroll reveal */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  }

  /* Project filter (Projects page) */
  var filterBtns = document.querySelectorAll(".filter-btn");
  var projectCards = document.querySelectorAll(".project-card");
  if (filterBtns.length && projectCards.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterBtns.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var filter = btn.getAttribute("data-filter");
        projectCards.forEach(function (card) {
          var cat = card.getAttribute("data-category");
          var show = filter === "all" || filter === cat;
          card.classList.toggle("hidden-card", !show);
        });
      });
    });
  }

  /* Lightbox (Projects page) */
  var lightbox = document.getElementById("lightbox");
  if (lightbox) {
    var lightboxImg = lightbox.querySelector("img");
    var lightboxTitle = lightbox.querySelector(".lb-title");
    var lightboxDesc = lightbox.querySelector(".lb-desc");
    document.querySelectorAll("[data-lightbox-trigger]").forEach(function (card) {
      card.addEventListener("click", function () {
        var img = card.querySelector("img");
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightboxTitle.textContent = card.getAttribute("data-title") || "";
        lightboxDesc.textContent = card.getAttribute("data-desc") || "";
        lightbox.classList.add("open");
      });
    });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox || e.target.classList.contains("lightbox-close")) {
        lightbox.classList.remove("open");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") lightbox.classList.remove("open");
    });
  }

  /* Contact form validation (front-end only — see TODO in contact.html for backend wiring) */
  var form = document.getElementById("quote-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = true;
      var fields = form.querySelectorAll("[required]");
      fields.forEach(function (field) {
        var wrapper = field.closest(".field");
        var isEmpty = field.value.trim() === "";
        var isBadEmail = field.type === "email" && field.value.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim());
        var isBadPhone = field.type === "tel" && field.value.trim() !== "" && field.value.replace(/[^\d]/g, "").length < 7;
        if (isEmpty || isBadEmail || isBadPhone) {
          wrapper.classList.add("invalid");
          valid = false;
        } else {
          wrapper.classList.remove("invalid");
        }
      });

      if (valid) {
        // TODO(backend): Formspree is the chosen provider — not wired up yet. When ready:
        //   1. Create a form at https://formspree.io and copy its endpoint (https://formspree.io/f/xxxxxxx)
        //   2. Add action="<that endpoint>" method="POST" to the <form id="quote-form"> tag in contact.html
        //   3. Delete the e.preventDefault() call above (or only call it when validation fails) so the browser submits normally
        form.reset();
        var successEl = document.getElementById("form-success");
        if (successEl) successEl.classList.add("show");
      }
    });
  }
});
