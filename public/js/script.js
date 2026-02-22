/* ──────────────────────────────────────────────────────
   Reveal-on-scroll for stagger groups and generic .reveal
   ────────────────────────────────────────────────────── */
(function () {
  const staggerGroups = document.querySelectorAll(".grid-3");

  staggerGroups.forEach((group) => {
    const cards = group.querySelectorAll(".card");
    cards.forEach((card, index) => {
      card.classList.add("reveal");
      card.style.setProperty(
        "--reveal-delay",
        `${Math.min(index * 70, 280)}ms`,
      );
    });
  });

  const revealItems = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window) || revealItems.length === 0) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -30px 0px" },
  );

  revealItems.forEach((item) => observer.observe(item));
})();

/* ──────────────────────────────────────────────────────
   Horizontal features slider
   ─────────────────────────────────────────────────────
   Desktop  → vertical scroll-jacking (sticky section)
   Mobile   → horizontal swipe + dots/arrows navigation
   ────────────────────────────────────────────────────── */
(function () {
  const section = document.querySelector(".features-slider");
  if (!section) return;

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const isDesktop = () => window.matchMedia("(min-width: 920px)").matches;

  /* ── DOM references ─────────────────────────────── */
  const track = section.querySelector(".feature-grid");
  const viewport = section.querySelector(".feature-viewport");
  const slides = Array.from(section.querySelectorAll(".feature-row"));
  const dots = Array.from(section.querySelectorAll(".slider-dot"));
  const btnPrev = section.querySelector(".slider-arrow--prev");
  const btnNext = section.querySelector(".slider-arrow--next");

  if (!track || slides.length === 0) return;

  const total = slides.length;

  /* ── State ──────────────────────────────────────── */
  let activeIndex = 0;
  let isAnimating = false;
  // Desktop scroll-jack state
  let unlocked = false;
  // Touch state (used by both desktop vertical and mobile horizontal)
  let touchStartX = 0;
  let touchStartY = 0;
  let touchDeltaX = 0;
  let touchDeltaY = 0;
  // null = direction not yet decided, 'h' = horizontal, 'v' = vertical
  let touchAxis = null;

  /* ── Sync DOM to current state ──────────────────── */
  function applySlide(index) {
    track.style.transform = `translateX(-${index * 100}%)`;

    const pct = total > 1 ? (index / (total - 1)) * 100 : 100;
    if (viewport) viewport.style.setProperty("--slider-progress", `${pct}%`);

    dots.forEach((dot, i) => {
      const active = i === index;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-selected", String(active));
    });

    if (btnPrev) btnPrev.disabled = index === 0;
    if (btnNext) btnNext.disabled = index === total - 1;
  }

  /* ── Navigate to a slide ────────────────────────── */
  function goTo(nextIndex) {
    if (nextIndex < 0 || nextIndex >= total || nextIndex === activeIndex)
      return;
    if (isAnimating) return;

    isAnimating = true;
    activeIndex = nextIndex;
    unlocked = activeIndex === total - 1;
    section.classList.toggle("is-unlocked", unlocked);
    applySlide(activeIndex);

    window.setTimeout(() => {
      isAnimating = false;
    }, 520);
  }

  /* ── Is section pinned & filling the viewport? ──── */
  function isInSliderZone() {
    const rect = section.getBoundingClientRect();
    return rect.top <= 0 && rect.bottom >= window.innerHeight;
  }

  /* ── Is the feature section visible on screen? ──── */
  function isSectionOnScreen() {
    const rect = section.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  /* ── Desktop: vertical scroll-jack handler ──────── */
  function handleDesktopScroll(direction, event) {
    if (reducedMotion) return;

    if (unlocked && direction > 0) return; // pass scroll through

    if (unlocked && direction < 0 && isInSliderZone()) {
      if (isAnimating) {
        event.preventDefault();
        return;
      }
      unlocked = false;
      section.classList.remove("is-unlocked");
      event.preventDefault();
      return;
    }

    if (!isInSliderZone()) return;
    if (isAnimating) {
      event.preventDefault();
      return;
    }

    if (direction > 0 && activeIndex < total - 1) {
      event.preventDefault();
      goTo(activeIndex + 1);
      return;
    }
    if (direction < 0 && activeIndex > 0) {
      event.preventDefault();
      goTo(activeIndex - 1);
    }
  }

  /* ── Initialise state ───────────────────────────── */
  applySlide(0);

  /* ── Dot clicks — all screen sizes ─────────────── */
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const idx = parseInt(dot.dataset.index, 10);
      if (!isNaN(idx)) goTo(idx);
    });
  });

  /* ── Arrow clicks — all screen sizes ───────────── */
  if (btnPrev) btnPrev.addEventListener("click", () => goTo(activeIndex - 1));
  if (btnNext) btnNext.addEventListener("click", () => goTo(activeIndex + 1));

  /* ── Keyboard — all screen sizes ───────────────── */
  section.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      goTo(activeIndex + 1);
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      goTo(activeIndex - 1);
    }
  });

  /* ── Mouse wheel (desktop only) ─────────────────── */
  window.addEventListener(
    "wheel",
    (event) => {
      if (!isDesktop()) return;
      if (Math.abs(event.deltaY) < 8) return;
      handleDesktopScroll(Math.sign(event.deltaY), event);
    },
    { passive: false },
  );

  /* ══════════════════════════════════════════════════
     Touch handling
     Desktop  → intercept vertical swipe for scroll-jack
     Mobile   → intercept horizontal swipe for slide nav,
                leave vertical swipe for normal page scroll
     ══════════════════════════════════════════════════ */

  window.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 1) return;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
      touchDeltaX = 0;
      touchDeltaY = 0;
      touchAxis = null; // reset direction lock
    },
    { passive: true },
  );

  window.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length !== 1) return;

      touchDeltaX = touchStartX - event.touches[0].clientX;
      touchDeltaY = touchStartY - event.touches[0].clientY;

      // Lock swipe axis on first meaningful movement
      if (
        touchAxis === null &&
        (Math.abs(touchDeltaX) > 6 || Math.abs(touchDeltaY) > 6)
      ) {
        touchAxis = Math.abs(touchDeltaX) >= Math.abs(touchDeltaY) ? "h" : "v";
      }

      if (isDesktop()) {
        /* ── Desktop: vertical scroll-jack ── */
        if (touchAxis !== "v") return;
        if (!isInSliderZone()) return;
        if (isAnimating) {
          event.preventDefault();
          return;
        }
        if (touchDeltaY > 12 && activeIndex < total - 1) event.preventDefault();
        if (touchDeltaY < -12 && activeIndex > 0) event.preventDefault();
      } else {
        /* ── Mobile: horizontal swipe ── */
        if (touchAxis !== "h") return; // vertical scroll = let it through
        if (!isSectionOnScreen()) return;
        if (isAnimating) {
          event.preventDefault();
          return;
        }
        // Prevent page scroll only when we can actually move a slide
        if (touchDeltaX > 8 && activeIndex < total - 1) event.preventDefault();
        if (touchDeltaX < -8 && activeIndex > 0) event.preventDefault();
      }
    },
    { passive: false },
  );

  window.addEventListener(
    "touchend",
    (event) => {
      if (isDesktop()) {
        /* ── Desktop: commit vertical swipe ── */
        if (touchAxis !== "v" || Math.abs(touchDeltaY) < 12) {
          touchAxis = null;
          return;
        }
        handleDesktopScroll(Math.sign(touchDeltaY), event);
      } else {
        /* ── Mobile: commit horizontal swipe ── */
        if (touchAxis !== "h" || Math.abs(touchDeltaX) < 40) {
          touchAxis = null;
          return;
        }
        if (!isSectionOnScreen()) {
          touchAxis = null;
          return;
        }
        if (touchDeltaX > 0)
          goTo(activeIndex + 1); // swipe left  → next slide
        else goTo(activeIndex - 1); // swipe right → prev slide
      }
      touchAxis = null;
      touchDeltaX = 0;
      touchDeltaY = 0;
    },
    { passive: false },
  );
})();
