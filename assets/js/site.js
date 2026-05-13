// ── Cookie storage helpers (module-level) ────────────────────────────────────
var COOKIE_STORAGE_KEY = 'agentka_cookie_consent';

function readCookieConsent() {
  try {
    var raw = window.localStorage.getItem(COOKIE_STORAGE_KEY);
    if (!raw) return null;
    if (raw === 'accepted') return { essential: true, functional: true, analytics: true, marketing: true };
    if (raw === 'rejected') return { essential: true, functional: false, analytics: false, marketing: false };
    var parsed = JSON.parse(raw);
    if (parsed && parsed.categories) {
      return Object.assign({ essential: true, functional: false, analytics: false, marketing: false }, parsed.categories);
    }
  } catch (e) { return null; }
  return null;
}

function writeCookieConsent(categories, mode) {
  try {
    window.localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify({
      mode: mode || 'custom',
      categories: Object.assign({ essential: true, functional: false, analytics: false, marketing: false }, categories)
    }));
    document.dispatchEvent(new CustomEvent('agentka:consentUpdated'));
  } catch (e) { /* ignore storage failures */ }
}

// ── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  initMobileNav();
  initTabs();
  initRevealOnScroll();
  initGalleryLightbox();
  initCookieBanner();
  initCookieModal();
  initCookieSettingsLinks();
  initConditionalMap();
  initBookingDemo();
});

// ── Mobile nav ───────────────────────────────────────────────────────────────
function initMobileNav() {
  var toggle = document.getElementById('nav-toggle');
  var header = document.querySelector('.site-header');
  var nav = document.getElementById('site-nav');
  if (!toggle || !header || !nav) return;

  toggle.addEventListener('click', function () {
    var isOpen = header.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Zamknij menu' : 'Otwórz menu');
  });

  document.addEventListener('click', function (e) {
    if (!header.contains(e.target)) {
      header.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// ── Page navigation (full-page view switching) ───────────────────────────────
function initTabs() {
  var navLinks   = Array.prototype.slice.call(document.querySelectorAll('[data-tab]'));
  var ctaLinks   = Array.prototype.slice.call(document.querySelectorAll('[data-tab-link], [data-view-link]'));
  var pageViews  = Array.prototype.slice.call(document.querySelectorAll('[data-view]'));
  if (!pageViews.length) return;

  var pageHeader      = document.getElementById('page-header');
  var pageHeaderTitle = document.getElementById('page-header-title');
  var viewTitles = {
    oferta: 'Oferta', opinie: 'Opinie', galeria: 'Galeria',
    faq: 'FAQ', rezerwacja: 'Rezerwacja', kontakt: 'Kontakt'
  };

  function closeMobileNav() {
    var header = document.querySelector('.site-header');
    var toggle = document.getElementById('nav-toggle');
    if (header) header.classList.remove('nav-open');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Otwórz menu');
    }
  }

  function activateView(viewId) {
    // Update nav active state
    navLinks.forEach(function (link) {
      link.classList.toggle('is-active', link.dataset.tab === viewId);
    });

    // Show / hide page views
    pageViews.forEach(function (view) {
      view.classList.toggle('is-active', view.dataset.view === viewId);
    });

    // Breadcrumb bar — show on sub-pages, hide on home
    if (pageHeader) {
      if (viewId === 'home') {
        pageHeader.hidden = true;
      } else {
        pageHeader.hidden = false;
        if (pageHeaderTitle) pageHeaderTitle.textContent = viewTitles[viewId] || viewId;
      }
    }

    // Scroll to top of page instantly
    window.scrollTo(0, 0);

    // Update URL hash (clean path for home)
    history.replaceState(null, '', viewId === 'home' ? location.pathname : '#' + viewId);

    // Close mobile nav
    closeMobileNav();

    // Trigger reveal animations for elements now entering the viewport
    setTimeout(function () {
      for (var i = 0; i < pageViews.length; i++) {
        if (pageViews[i].dataset.view === viewId) {
          Array.prototype.forEach.call(
            pageViews[i].querySelectorAll('.reveal:not(.in-view)'),
            function (el) { el.classList.add('in-view'); }
          );
          break;
        }
      }
    }, 80);
  }

  // Nav links (data-tab)
  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      activateView(link.dataset.tab);
    });
  });

  // CTA / home links (data-tab-link, data-view-link)
  ctaLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      activateView(link.dataset.tabLink || link.dataset.viewLink);
    });
  });

  // Initialise from URL hash, or default to home
  var hash = location.hash.slice(1);
  var validViews = pageViews.map(function (v) { return v.dataset.view; });
  activateView(validViews.indexOf(hash) !== -1 ? hash : 'home');
}

// ── Reveal on scroll ─────────────────────────────────────────────────────────
function initRevealOnScroll() {
  var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (!items.length) return;
  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in-view'); });
    return;
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.10 });
  items.forEach(function (el) { observer.observe(el); });
}

// ── Gallery lightbox ─────────────────────────────────────────────────────────
function initGalleryLightbox() {
  var modal = document.getElementById('gallery-modal');
  var modalImg = document.getElementById('gallery-modal-image');
  var closeBtn = document.getElementById('gallery-close');
  if (!modal || !modalImg || !closeBtn) return;

  function openModal(src, alt) {
    modalImg.src = src;
    modalImg.alt = alt || 'Podgląd zdjęcia';
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    modalImg.removeAttribute('src');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-gallery-src]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openModal(btn.dataset.gallerySrc || '', btn.dataset.galleryAlt || '');
    });
  });

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
}

// ── Cookie banner (slim bar) ──────────────────────────────────────────────────
function initCookieBanner() {
  var banner = document.querySelector('[data-cookie-banner]');
  if (!banner) return;

  var acceptBtn = banner.querySelector('[data-cookie-accept]');
  var rejectBtn = banner.querySelector('[data-cookie-reject]');

  function hideBanner() {
    banner.hidden = true;
    banner.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('has-cookie-banner');
  }

  function showBanner() {
    banner.hidden = false;
    banner.setAttribute('aria-hidden', 'false');
    document.body.classList.add('has-cookie-banner');
  }

  window.agentkaShowCookieBanner = showBanner;
  window.agentkaHideCookieBanner = hideBanner;

  if (!readCookieConsent()) showBanner();

  if (acceptBtn) {
    acceptBtn.addEventListener('click', function () {
      writeCookieConsent({ essential: true, functional: true, analytics: true, marketing: true }, 'accepted');
      hideBanner();
    });
  }
  if (rejectBtn) {
    rejectBtn.addEventListener('click', function () {
      writeCookieConsent({ essential: true, functional: false, analytics: false, marketing: false }, 'rejected');
      hideBanner();
    });
  }
}

// ── Cookie settings modal ─────────────────────────────────────────────────────
function initCookieModal() {
  var modal = document.getElementById('cookie-settings-modal');
  if (!modal) return;

  var closeBtn = document.getElementById('cookie-modal-close');
  var backdrop = document.getElementById('cookie-modal-backdrop');
  var categoryInputs = Array.prototype.slice.call(modal.querySelectorAll('[data-cookie-category]'));
  var saveBtn = modal.querySelector('[data-cookie-save]');
  var rejectBtn = modal.querySelector('[data-cookie-reject]');

  function openModal() {
    var consent = readCookieConsent() || { essential: true, functional: false, analytics: false, marketing: false };
    categoryInputs.forEach(function (input) {
      var cat = input.dataset.cookieCategory;
      if (cat && cat !== 'essential') input.checked = Boolean(consent[cat]);
    });
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  window.agentkaOpenCookieModal = openModal;

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      var categories = { essential: true, functional: false, analytics: false, marketing: false };
      categoryInputs.forEach(function (input) {
        var cat = input.dataset.cookieCategory;
        if (cat && cat !== 'essential') categories[cat] = input.checked;
      });
      writeCookieConsent(categories, 'custom');
      closeModal();
      if (typeof window.agentkaHideCookieBanner === 'function') window.agentkaHideCookieBanner();
    });
  }

  if (rejectBtn) {
    rejectBtn.addEventListener('click', function () {
      writeCookieConsent({ essential: true, functional: false, analytics: false, marketing: false }, 'rejected');
      closeModal();
      if (typeof window.agentkaHideCookieBanner === 'function') window.agentkaHideCookieBanner();
    });
  }
}

// ── Cookie settings links ([data-cookie-settings]) ────────────────────────────
function initCookieSettingsLinks() {
  Array.prototype.slice.call(document.querySelectorAll('[data-cookie-settings]')).forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      if (typeof window.agentkaOpenCookieModal === 'function') {
        window.agentkaOpenCookieModal();
      } else if (typeof window.agentkaShowCookieBanner === 'function') {
        window.agentkaShowCookieBanner();
      }
    });
  });
}

// ── Conditional map ───────────────────────────────────────────────────────────
function initConditionalMap() {
  var container = document.getElementById('map-container');
  var placeholder = document.getElementById('map-placeholder');
  var acceptBtn = document.getElementById('map-accept-btn');
  if (!container || !placeholder) return;

  var MAP_SRC = 'https://www.google.com/maps?q=Wichrowa%201A%2C%2060-449%20Pozna%C5%84%2C%20Polska&output=embed';

  function tryLoadMap() {
    var consent = readCookieConsent();
    if (consent && (consent.analytics || consent.functional)) {
      if (!container.querySelector('iframe')) {
        var iframe = document.createElement('iframe');
        iframe.src = MAP_SRC;
        iframe.loading = 'lazy';
        iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
        iframe.setAttribute('aria-label', 'Mapa lokalizacji biura — Wichrowa 1A, Poznań');
        iframe.style.cssText = 'width:100%;height:100%;min-height:380px;border:0;display:block;';
        placeholder.style.display = 'none';
        container.appendChild(iframe);
      }
    }
  }

  tryLoadMap();
  document.addEventListener('agentka:consentUpdated', tryLoadMap);

  if (acceptBtn) {
    acceptBtn.addEventListener('click', function () {
      writeCookieConsent({ essential: true, functional: true, analytics: true, marketing: false }, 'partial');
      tryLoadMap();
      if (typeof window.agentkaHideCookieBanner === 'function') window.agentkaHideCookieBanner();
    });
  }
}

// ── Booking demo (custom calendar) ───────────────────────────────────────────
function initBookingDemo() {
  var calEl = document.getElementById('agentka-calendar');
  var dateTitleEl = document.getElementById('agentka-selected-date-text');
  var dateMetaEl = document.getElementById('agentka-selected-date-meta');
  var resetBtn = document.getElementById('agentka-reset-selection');
  var slotListEl = document.getElementById('agentka-slot-list');
  var slotCountEl = document.getElementById('agentka-slot-count');
  var bookingPanel = document.getElementById('agentka-booking-panel');
  var slotText = document.getElementById('agentka-selected-slot-text');
  var bookingForm = document.getElementById('agentka-booking');
  var bookingStatus = document.getElementById('agentka-booking-status');
  if (!calEl) return;

  // Slots by day-of-week (1=Mon … 5=Fri, 6=Sat)
  var SLOTS_BY_DOW = {
    1: ['09:00', '10:30', '14:00'],
    2: ['09:00', '11:00', '12:30'],
    3: ['09:30', '11:00', '13:30'],
    4: ['10:00', '11:30', '15:00'],
    5: ['09:00', '10:00'],
    6: ['10:00', '12:00']
  };

  var state = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    selectedDate: null,
    selectedSlot: null
  };

  function getSlots(date) {
    var dow = date.getDay();
    var blocked = (date.getDate() % 11 === 0);
    return (!blocked && SLOTS_BY_DOW[dow]) ? SLOTS_BY_DOW[dow] : [];
  }

  function toKey(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function formatDate(date) {
    var s = date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function renderCal() {
    var y = state.year, m = state.month;
    var firstDay = new Date(y, m, 1);
    var lastDay = new Date(y, m + 1, 0);
    var startDow = (firstDay.getDay() + 6) % 7; // Mon=0
    var monthName = firstDay.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
    monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    calEl.innerHTML = '';

    // Header
    var header = document.createElement('div');
    header.className = 'agentka-cal-header';
    header.innerHTML =
      '<button class="agentka-cal-nav" id="agentka-cal-prev" aria-label="Poprzedni miesiąc" type="button">&#8249;</button>' +
      '<span class="agentka-cal-title">' + monthName + '</span>' +
      '<button class="agentka-cal-nav" id="agentka-cal-next" aria-label="Następny miesiąc" type="button">&#8250;</button>';
    calEl.appendChild(header);

    // Weekday labels
    var weekdays = document.createElement('div');
    weekdays.className = 'agentka-cal-weekdays';
    ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].forEach(function (d) {
      var s = document.createElement('span'); s.textContent = d; weekdays.appendChild(s);
    });
    calEl.appendChild(weekdays);

    // Day grid
    var grid = document.createElement('div');
    grid.className = 'agentka-cal-grid';

    var todayStr = toKey(new Date());
    var nowTs = new Date(); nowTs.setHours(0, 0, 0, 0);

    // Empty leading cells
    for (var i = 0; i < startDow; i++) {
      var empty = document.createElement('div');
      empty.className = 'agentka-cal-day is-empty';
      grid.appendChild(empty);
    }

    for (var d = 1; d <= lastDay.getDate(); d++) {
      var date = new Date(y, m, d);
      var key = toKey(date);
      var isPast = date < nowTs;
      var slots = isPast ? [] : getSlots(date);
      var isToday = key === todayStr;
      var isSelected = key === state.selectedDate;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'agentka-cal-day' +
        (slots.length ? ' is-available' : ' is-unavailable') +
        (isToday ? ' is-today' : '') +
        (isSelected ? ' is-selected' : '');
      btn.dataset.date = key;
      if (isPast || !slots.length) btn.disabled = true;

      var num = document.createElement('span');
      num.className = 'agentka-cal-day-num';
      num.textContent = String(d);
      btn.appendChild(num);

      if (slots.length) {
        var badge = document.createElement('span');
        badge.className = 'agentka-cal-day-badge';
        badge.textContent = String(slots.length);
        btn.appendChild(badge);
      }
      grid.appendChild(btn);
    }

    calEl.appendChild(grid);

    // Month navigation
    var prevBtn = document.getElementById('agentka-cal-prev');
    var nextBtn = document.getElementById('agentka-cal-next');
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        if (state.month === 0) { state.month = 11; state.year--; } else { state.month--; }
        renderCal();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (state.month === 11) { state.month = 0; state.year++; } else { state.month++; }
        renderCal();
      });
    }

    // Day selection
    grid.addEventListener('click', function (e) {
      var btn2 = e.target.closest('[data-date]');
      if (!btn2 || btn2.disabled) return;
      state.selectedDate = btn2.dataset.date;
      var d2 = new Date(btn2.dataset.date + 'T00:00:00');
      renderCal();
      showSlots(d2);
    });
  }

  function showSlots(date) {
    var slots = getSlots(date);
    var label = formatDate(date);
    if (dateTitleEl) dateTitleEl.textContent = label;
    if (dateMetaEl) dateMetaEl.textContent = slots.length
      ? 'Wybierz godzinę z listy poniżej.'
      : 'Brak wolnych terminów. Wybierz inny dzień.';
    if (slotCountEl) slotCountEl.textContent = String(slots.length);
    if (!slotListEl) return;
    slotListEl.innerHTML = '';

    if (!slots.length) {
      var emptyP = document.createElement('p');
      emptyP.className = 'agentka-slot-empty';
      emptyP.textContent = 'Brak wolnych terminów w tym dniu.';
      slotListEl.appendChild(emptyP);
      return;
    }

    slots.forEach(function (slot) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'agentka-slot-button';
      btn.innerHTML = '<strong>' + slot + '</strong><span>wolny</span>';
      btn.addEventListener('click', function () {
        slotListEl.querySelectorAll('.agentka-slot-button').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        state.selectedSlot = slot;
        if (slotText) slotText.textContent = formatDate(date) + ', ' + slot;
        if (bookingPanel) {
          bookingPanel.classList.remove('is-hidden');
          var slotInput = bookingPanel.querySelector('[name="slot_id"]');
          if (slotInput) slotInput.value = toKey(date) + 'T' + slot;
        }
      });
      slotListEl.appendChild(btn);
    });
  }

  function resetBooking() {
    state.selectedDate = null;
    state.selectedSlot = null;
    if (dateTitleEl) dateTitleEl.textContent = 'Wybierz dzień w kalendarzu';
    if (dateMetaEl) dateMetaEl.textContent = 'Pokażę tu dostępne godziny dla wybranego dnia.';
    if (slotListEl) slotListEl.innerHTML = '<p class="agentka-slot-empty">Wybierz dzień z kalendarza, aby zobaczyć godziny.</p>';
    if (slotCountEl) slotCountEl.textContent = '—';
    if (bookingPanel) bookingPanel.classList.add('is-hidden');
    renderCal();
  }

  if (resetBtn) resetBtn.addEventListener('click', resetBooking);

  if (bookingForm) {
    bookingForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (bookingStatus) {
        bookingStatus.textContent = 'Rezerwacja przyjęta! Skontaktujemy się z potwierdzeniem w ciągu 24 godzin.';
        bookingStatus.classList.remove('is-error');
      }
      setTimeout(function () {
        bookingForm.reset();
        if (bookingStatus) bookingStatus.textContent = '';
        resetBooking();
      }, 3500);
    });
  }

  renderCal();
}
