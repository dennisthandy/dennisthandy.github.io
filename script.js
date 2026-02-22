/* ──────────────────────────────────────────────────────
   Reveal-on-scroll for stagger groups and generic .reveal
   ────────────────────────────────────────────────────── */
(function () {
  const staggerGroups = document.querySelectorAll('.grid-3');

  staggerGroups.forEach((group) => {
    const cards = group.querySelectorAll('.card');
    cards.forEach((card, index) => {
      card.classList.add('reveal');
      card.style.setProperty('--reveal-delay', `${Math.min(index * 70, 280)}ms`);
    });
  });

  const revealItems = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window) || revealItems.length === 0) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
  );

  revealItems.forEach((item) => observer.observe(item));
})();


/* ──────────────────────────────────────────────────────
   Horizontal features slider
   ────────────────────────────────────────────────────── */
(function () {
  const section = document.querySelector('.features-slider');
  if (!section) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop     = () => window.matchMedia('(min-width: 920px)').matches;

  /* ── DOM references ─────────────────────────────── */
  const track    = section.querySelector('.feature-grid');
  const viewport = section.querySelector('.feature-viewport');
  const slides   = Array.from(section.querySelectorAll('.feature-row'));
  const dots     = Array.from(section.querySelectorAll('.slider-dot'));
  const btnPrev  = section.querySelector('.slider-arrow--prev');
  const btnNext  = section.querySelector('.slider-arrow--next');

  if (!track || slides.length === 0) return;

  const total = slides.length;

  /* ── State ──────────────────────────────────────── */
  let activeIndex = 0;
  let isAnimating = false;
  let touchStartY = 0;
  let touchDeltaY = 0;
  let unlocked    = false; // true when on last slide; normal scroll resumes

  /* ── Sync DOM to current state ──────────────────── */
  function applySlide(index) {
    // Slide the track horizontally
    track.style.transform = `translateX(-${index * 100}%)`;

    // Progress bar via CSS custom property on viewport
    const pct = total > 1 ? (index / (total - 1)) * 100 : 100;
    viewport.style.setProperty('--slider-progress', `${pct}%`);

    // Update dots
    dots.forEach((dot, i) => {
      const active = i === index;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-selected', String(active));
    });

    // Update arrow disabled state
    if (btnPrev) btnPrev.disabled = index === 0;
    if (btnNext) btnNext.disabled = index === total - 1;
  }

  /* ── Navigate to a slide ────────────────────────── */
  function goTo(nextIndex) {
    if (nextIndex < 0 || nextIndex >= total || nextIndex === activeIndex) return;
    if (isAnimating) return;

    isAnimating = true;
    activeIndex = nextIndex;
    unlocked    = activeIndex === total - 1;
    section.classList.toggle('is-unlocked', unlocked);

    applySlide(activeIndex);

    // Clear animation guard after CSS transition finishes (~500ms)
    window.setTimeout(() => { isAnimating = false; }, 520);
  }

  /* ── Is the slider section pinned to fill viewport? */
  function isInSliderZone() {
    const rect = section.getBoundingClientRect();
    return rect.top <= 0 && rect.bottom >= window.innerHeight;
  }

  /* ── Shared direction handler (wheel + touch) ───── */
  function handleDirection(direction, event) {
    if (!isDesktop() || reducedMotion) return;

    // Last slide reached → let the page scroll past
    if (unlocked && direction > 0) return;

    // Re-engage slider when scrolling back up from unlocked state
    if (unlocked && direction < 0 && isInSliderZone()) {
      if (isAnimating) { event.preventDefault(); return; }
      unlocked = false;
      section.classList.remove('is-unlocked');
      event.preventDefault();
      return;
    }

    if (!isInSliderZone()) return;
    if (isAnimating)        { event.preventDefault(); return; }

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

  /* ── Dot clicks ─────────────────────────────────── */
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      if (!isDesktop()) return;
      const idx = parseInt(dot.dataset.index, 10);
      if (!isNaN(idx)) goTo(idx);
    });
  });

  /* ── Arrow clicks ───────────────────────────────── */
  if (btnPrev) btnPrev.addEventListener('click', () => goTo(activeIndex - 1));
  if (btnNext) btnNext.addEventListener('click', () => goTo(activeIndex + 1));

  /* ── Keyboard ───────────────────────────────────── */
  section.addEventListener('keydown', (e) => {
    if (!isDesktop()) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      goTo(activeIndex + 1);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      goTo(activeIndex - 1);
    }
  });

  /* ── Mouse wheel ────────────────────────────────── */
  window.addEventListener(
    'wheel',
    (event) => {
      if (Math.abs(event.deltaY) < 8) return;
      handleDirection(Math.sign(event.deltaY), event);
    },
    { passive: false }
  );

  /* ── Touch ──────────────────────────────────────── */
  window.addEventListener(
    'touchstart',
    (event) => {
      if (event.touches.length !== 1) return;
      touchStartY = event.touches[0].clientY;
      touchDeltaY = 0;
    },
    { passive: true }
  );

  window.addEventListener(
    'touchmove',
    (event) => {
      if (event.touches.length !== 1 || !isDesktop()) return;
      touchDeltaY = touchStartY - event.touches[0].clientY;
      if (!isInSliderZone()) return;
      if (isAnimating)                                   { event.preventDefault(); return; }
      if (touchDeltaY > 12 && activeIndex < total - 1)   event.preventDefault();
      if (touchDeltaY < -12 && activeIndex > 0)           event.preventDefault();
    },
    { passive: false }
  );

  window.addEventListener(
    'touchend',
    (event) => {
      if (Math.abs(touchDeltaY) < 12) return;
      handleDirection(Math.sign(touchDeltaY), event);
      touchDeltaY = 0;
    },
    { passive: false }
  );
})();
