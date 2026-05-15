(function () {
  'use strict';

  var STORAGE_KEY = 'agentka_cookie_consent';
  var BASE_TITLE = document.title || 'Agentka Warta Poznania — Patrycja Rożek';
  var DEFAULT_CONSENT = {
    essential: true,
    functional: false,
    analytics: false,
    marketing: false
  };
  var VIEW_TITLES = {
    home: 'Strona główna',
    oferta: 'Oferta',
    opinie: 'Opinie',
    faq: 'FAQ',
    rezerwacja: 'Rezerwacja',
    kontakt: 'Kontakt'
  };

  document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
    initTabs();
    initRevealOnScroll();
    initCookieBanner();
    initCookieModal();
    initCookieSettingsLinks();
    initConditionalMap();
    initBookingDemo();
  });

  function readCookieConsent() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      if (raw === 'accepted') {
        return {
          essential: true,
          functional: true,
          analytics: true,
          marketing: true
        };
      }
      if (raw === 'rejected') {
        return {
          essential: true,
          functional: false,
          analytics: false,
          marketing: false
        };
      }

      var parsed = JSON.parse(raw);
      if (parsed && parsed.categories) {
        return Object.assign({}, DEFAULT_CONSENT, parsed.categories);
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  function writeCookieConsent(categories, mode) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mode: mode || 'custom',
        categories: Object.assign({}, DEFAULT_CONSENT, categories)
      }));

      document.dispatchEvent(new CustomEvent('agentka:consentUpdated', {
        detail: {
          mode: mode || 'custom',
          categories: Object.assign({}, DEFAULT_CONSENT, categories)
        }
      }));
    } catch (error) {
      // Ignore storage failures.
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function padNumber(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function capitalize(value) {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function startOfDay(date) {
    var result = new Date(date);
    result.setHours(12, 0, 0, 0);
    return result;
  }

  function startOfMonth(date) {
    return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  function addDays(date, amount) {
    var result = new Date(date);
    result.setDate(result.getDate() + amount);
    return startOfDay(result);
  }

  function addMonths(date, amount) {
    return startOfMonth(new Date(date.getFullYear(), date.getMonth() + amount, 1));
  }

  function compareMonths(a, b) {
    if (a.getFullYear() !== b.getFullYear()) {
      return a.getFullYear() - b.getFullYear();
    }
    return a.getMonth() - b.getMonth();
  }

  function isSameDate(a, b) {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  function toDateKey(date) {
    return date.getFullYear() + '-' + padNumber(date.getMonth() + 1) + '-' + padNumber(date.getDate());
  }

  function fromDateKey(dateKey) {
    return startOfDay(new Date(dateKey + 'T12:00:00'));
  }

  function formatDate(date) {
    return capitalize(new Intl.DateTimeFormat('pl-PL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date));
  }

  function formatMonth(date) {
    return capitalize(new Intl.DateTimeFormat('pl-PL', {
      month: 'long',
      year: 'numeric'
    }).format(date));
  }

  function getWeekStart(date) {
    var result = startOfDay(date);
    var day = result.getDay();
    var offset = day === 0 ? -6 : 1 - day;
    result.setDate(result.getDate() + offset);
    return result;
  }

  function getWeekEnd(date) {
    return addDays(getWeekStart(date), 6);
  }

  function getFirstAvailableDate(fromDate) {
    var cursor = startOfDay(fromDate || new Date());
    for (var i = 0; i < 180; i += 1) {
      var candidate = addDays(cursor, i);
      if (getAvailableSlots(candidate).length) {
        return candidate;
      }
    }
    return cursor;
  }

  function getAvailableSlots(date) {
    var today = startOfDay(new Date());
    var dateValue = startOfDay(date);

    if (dateValue < today) {
      return [];
    }

    var weekday = dateValue.getDay();
    if (weekday === 0) {
      return [];
    }

    var slotsByWeekday = {
      1: ['09:00', '10:30', '12:00', '14:30'],
      2: ['09:30', '11:00', '13:00', '15:30'],
      3: ['09:00', '11:30', '14:00', '16:00'],
      4: ['10:00', '12:00', '14:30'],
      5: ['09:00', '11:00', '13:00'],
      6: ['10:00', '12:00']
    };

    var base = slotsByWeekday[weekday] || [];
    var seed = dateValue.getFullYear() * 10000 + (dateValue.getMonth() + 1) * 100 + dateValue.getDate();
    var variant = seed % 7;

    if (variant === 0) {
      return [];
    }
    if (variant === 1 && base.length > 2) {
      return base.slice(0, base.length - 1);
    }
    if (variant === 2 && base.length > 2) {
      return base.slice(1);
    }
    if (variant === 3 && base.length > 3) {
      return [base[0], base[2], base[base.length - 1]];
    }

    return base;
  }

  function initMobileNav() {
    var header = document.querySelector('.site-header');
    var toggle = document.getElementById('nav-toggle');
    var nav = document.getElementById('site-nav');

    if (!header || !toggle || !nav) return;

    function closeMenu() {
      header.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Otwórz menu');
      document.body.classList.remove('menu-open');
    }

    toggle.addEventListener('click', function () {
      var open = !header.classList.contains('nav-open');
      header.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
      document.body.classList.toggle('menu-open', open);
    });

    document.addEventListener('click', function (event) {
      if (!header.classList.contains('nav-open')) return;
      if (!header.contains(event.target)) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeMenu();
      }
    });

    window.agentkaCloseMobileNav = closeMenu;
  }

  function initTabs() {
    var views = Array.prototype.slice.call(document.querySelectorAll('[data-view]'));
    if (!views.length) return;

    var navLinks = Array.prototype.slice.call(document.querySelectorAll('[data-tab]'));
    var actionLinks = Array.prototype.slice.call(document.querySelectorAll('[data-tab-link], [data-view-link]'));
    var pageHeader = document.getElementById('page-header');
    var pageHeaderTitle = document.getElementById('page-header-title');

    function revealActiveContent(viewId) {
      var activeView = document.querySelector('[data-view="' + viewId + '"]');
      if (!activeView) return;
      Array.prototype.slice.call(activeView.querySelectorAll('.reveal:not(.in-view)')).forEach(function (item) {
        item.classList.add('in-view');
      });
    }

    function syncDocumentTitle(viewId) {
      if (viewId === 'home') {
        document.title = BASE_TITLE;
        return;
      }

      var viewTitle = VIEW_TITLES[viewId] || viewId;
      document.title = viewTitle + ' · ' + BASE_TITLE;
    }

    function closeMobileNav() {
      if (typeof window.agentkaCloseMobileNav === 'function') {
        window.agentkaCloseMobileNav();
      }
    }

    function activateView(viewId, updateHistory) {
      var targetId = VIEW_TITLES[viewId] ? viewId : 'home';

      navLinks.forEach(function (link) {
        link.classList.toggle('is-active', link.dataset.tab === targetId);
      });

      views.forEach(function (view) {
        view.classList.toggle('is-active', view.dataset.view === targetId);
      });

      if (pageHeader) {
        if (targetId === 'home') {
          pageHeader.hidden = true;
        } else {
          pageHeader.hidden = false;
          if (pageHeaderTitle) {
            pageHeaderTitle.textContent = VIEW_TITLES[targetId] || targetId;
          }
        }
      }

      if (updateHistory !== false) {
        try {
          history.pushState({ view: targetId }, '', targetId === 'home' ? location.pathname : '#' + targetId);
        } catch (error) {
          location.hash = targetId === 'home' ? '' : targetId;
        }
      }

      closeMobileNav();
      window.scrollTo(0, 0);
      syncDocumentTitle(targetId);
      revealActiveContent(targetId);
    }

    navLinks.forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        activateView(link.dataset.tab, true);
      });
    });

    actionLinks.forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        activateView(link.dataset.tabLink || link.dataset.viewLink, true);
      });
    });

    window.addEventListener('popstate', function () {
      var hash = location.hash.replace(/^#/, '');
      activateView(VIEW_TITLES[hash] ? hash : 'home', false);
    });

    var initialHash = location.hash.replace(/^#/, '');
    activateView(VIEW_TITLES[initialHash] ? initialHash : 'home', false);
  }

  function initRevealOnScroll() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach(function (item) {
        item.classList.add('in-view');
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    items.forEach(function (item) {
      observer.observe(item);
    });
  }

  function initCookieBanner() {
    var banner = document.querySelector('[data-cookie-banner]');
    if (!banner) return;

    var acceptBtn = banner.querySelector('[data-cookie-accept]');
    var rejectBtn = banner.querySelector('[data-cookie-reject]');

    function showBanner() {
      banner.hidden = false;
      banner.setAttribute('aria-hidden', 'false');
      document.body.classList.add('has-cookie-banner');
    }

    function hideBanner() {
      banner.hidden = true;
      banner.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('has-cookie-banner');
    }

    window.agentkaShowCookieBanner = showBanner;
    window.agentkaHideCookieBanner = hideBanner;

    if (!readCookieConsent()) {
      showBanner();
    } else {
      hideBanner();
    }

    if (acceptBtn) {
      acceptBtn.addEventListener('click', function () {
        writeCookieConsent({
          essential: true,
          functional: true,
          analytics: true,
          marketing: true
        }, 'accepted');
        hideBanner();
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener('click', function () {
        writeCookieConsent(DEFAULT_CONSENT, 'rejected');
        hideBanner();
      });
    }
  }

  function initCookieModal() {
    var modal = document.getElementById('cookie-settings-modal');
    if (!modal) return;

    var closeBtn = document.getElementById('cookie-modal-close');
    var backdrop = document.getElementById('cookie-modal-backdrop');
    var saveBtn = modal.querySelector('[data-cookie-save]');
    var rejectBtn = modal.querySelector('[data-cookie-reject]');
    var categoryInputs = Array.prototype.slice.call(modal.querySelectorAll('[data-cookie-category]'));

    function syncControls() {
      var consent = readCookieConsent() || DEFAULT_CONSENT;
      categoryInputs.forEach(function (input) {
        var category = input.dataset.cookieCategory;
        if (category && category !== 'essential') {
          input.checked = Boolean(consent[category]);
        }
      });
    }

    function openModal() {
      syncControls();
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    }

    function closeModal() {
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    }

    function collectConsent() {
      var categories = Object.assign({}, DEFAULT_CONSENT);
      categoryInputs.forEach(function (input) {
        var category = input.dataset.cookieCategory;
        if (category && category !== 'essential') {
          categories[category] = Boolean(input.checked);
        }
      });
      return categories;
    }

    window.agentkaOpenCookieModal = openModal;
    window.agentkaCloseCookieModal = closeModal;

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        writeCookieConsent(collectConsent(), 'custom');
        closeModal();
        if (typeof window.agentkaHideCookieBanner === 'function') {
          window.agentkaHideCookieBanner();
        }
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener('click', function () {
        writeCookieConsent(DEFAULT_CONSENT, 'rejected');
        closeModal();
        if (typeof window.agentkaHideCookieBanner === 'function') {
          window.agentkaHideCookieBanner();
        }
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !modal.hidden) {
        closeModal();
      }
    });
  }

  function initCookieSettingsLinks() {
    Array.prototype.slice.call(document.querySelectorAll('[data-cookie-settings]')).forEach(function (button) {
      button.addEventListener('click', function () {
        if (typeof window.agentkaOpenCookieModal === 'function') {
          window.agentkaOpenCookieModal();
          return;
        }
        if (typeof window.agentkaShowCookieBanner === 'function') {
          window.agentkaShowCookieBanner();
        }
      });
    });
  }

  function initConditionalMap() {
    var container = document.getElementById('map-container');
    var placeholder = document.getElementById('map-placeholder');
    var acceptBtn = document.getElementById('map-accept-btn');

    if (!container || !placeholder) return;

    var mapSrc = 'https://www.google.com/maps?q=Wichrowa%201A%2C%2060-449%20Pozna%C5%84&output=embed';

    function canLoadMap() {
      var consent = readCookieConsent();
      return Boolean(consent && consent.marketing);
    }

    function loadMap() {
      if (!canLoadMap()) return;
      if (container.querySelector('iframe')) return;

      container.innerHTML = '';
      var iframe = document.createElement('iframe');
      iframe.src = mapSrc;
      iframe.loading = 'lazy';
      iframe.title = 'Mapa lokalizacji biura';
      iframe.setAttribute('aria-label', 'Mapa lokalizacji biura');
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      container.appendChild(iframe);
    }

    function unlockMap() {
      writeCookieConsent({
        essential: true,
        functional: false,
        analytics: false,
        marketing: true
      }, 'partial');
      loadMap();
      if (typeof window.agentkaHideCookieBanner === 'function') {
        window.agentkaHideCookieBanner();
      }
    }

    loadMap();
    document.addEventListener('agentka:consentUpdated', loadMap);

    if (acceptBtn) {
      acceptBtn.addEventListener('click', unlockMap);
    }
  }

  function initBookingDemo() {
    var calendarEl = document.getElementById('agentka-calendar');
    if (!calendarEl) return;

    var slotListEl = document.getElementById('agentka-slot-list');
    var slotCountEl = document.getElementById('agentka-slot-count');
    var dateTextEl = document.getElementById('agentka-selected-date-text');
    var dateMetaEl = document.getElementById('agentka-selected-date-meta');
    var resetBtn = document.getElementById('agentka-reset-selection');
    var bookingPanel = document.getElementById('agentka-booking-panel');
    var slotTextEl = document.getElementById('agentka-selected-slot-text');
    var bookingForm = document.getElementById('agentka-booking');
    var bookingStatus = document.getElementById('agentka-booking-status');
    var slotInput = bookingForm ? bookingForm.querySelector('[name="slot_id"]') : null;

    var WEEKDAY_LABELS = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];
    var state = {
      month: startOfMonth(new Date()),
      selectedDate: null,
      selectedSlot: null
    };
    var minMonth = startOfMonth(new Date());
    var maxMonth = addMonths(minMonth, 4);

    function updateStatus(message, type) {
      if (!bookingStatus) return;
      bookingStatus.textContent = message || '';
      bookingStatus.classList.remove('is-error', 'is-success');
      if (type) {
        bookingStatus.classList.add(type);
      }
    }

    function clearSelectedSlot() {
      state.selectedSlot = null;
      if (slotInput) {
        slotInput.value = '';
      }
      if (slotTextEl) {
        slotTextEl.textContent = '—';
      }
      if (bookingPanel) {
        bookingPanel.classList.add('is-hidden');
      }
    }

    function selectDate(date) {
      var normalized = startOfDay(date);
      state.selectedDate = normalized;
      state.month = startOfMonth(normalized);
      clearSelectedSlot();
      updateStatus('', null);
      render();
      renderSlots(normalized);
    }

    function selectMonth(month) {
      state.month = startOfMonth(month);
      var candidate = findFirstAvailableDateInMonth(state.month);
      if (candidate) {
        state.selectedDate = candidate;
      } else {
        state.selectedDate = new Date(state.month.getFullYear(), state.month.getMonth(), 1, 12);
      }
      clearSelectedSlot();
      updateStatus('', null);
      render();
      renderSlots(state.selectedDate);
    }

    function findFirstAvailableDateInMonth(month) {
      var cursor = new Date(month.getFullYear(), month.getMonth(), 1, 12);
      var end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12);
      while (cursor <= end) {
        if (getAvailableSlots(cursor).length) {
          return startOfDay(cursor);
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      return null;
    }

    function render() {
      var monthStart = startOfMonth(state.month);
      var monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 12);
      var gridStart = getWeekStart(monthStart);
      var gridEnd = getWeekEnd(monthEnd);
      var monthLabel = formatMonth(monthStart);
      var prevMonth = addMonths(monthStart, -1);
      var nextMonth = addMonths(monthStart, 1);
      var canPrev = compareMonths(monthStart, minMonth) > 0;
      var canNext = compareMonths(monthStart, maxMonth) < 0;

      var html = '';
      html += '<div class="agentka-calendar-shell">';
      html += '<div class="agentka-calendar-head">';
      html += '<div class="agentka-calendar-title">';
      html += '<p class="agentka-kicker">Kalendarz terminów</p>';
      html += '<h3>' + escapeHtml(monthLabel) + '</h3>';
      html += '<p>Wybierz dzień, a po prawej zobaczysz dostępne godziny i formularz potwierdzenia.</p>';
      html += '</div>';
      html += '<div class="agentka-calendar-navs">';
      html += '<button type="button" class="agentka-calendar-nav" data-cal-prev aria-label="Poprzedni miesiąc" ' + (canPrev ? '' : 'disabled') + '>‹</button>';
      html += '<button type="button" class="agentka-calendar-nav" data-cal-next aria-label="Następny miesiąc" ' + (canNext ? '' : 'disabled') + '>›</button>';
      html += '</div>';
      html += '</div>';
      html += '<div class="agentka-calendar-legend">';
      html += '<span class="agentka-legend-item">Wolne dni</span>';
      html += '<span class="agentka-legend-item">Wybrany termin</span>';
      html += '<span class="agentka-legend-item">Brak godzin</span>';
      html += '</div>';
      html += '<div class="agentka-calendar-weekdays">';
      for (var i = 1; i <= 7; i += 1) {
        html += '<div class="agentka-calendar-weekday">' + WEEKDAY_LABELS[i % 7] + '</div>';
      }
      html += '</div>';
      html += '<div class="agentka-calendar-days">';

      var day = new Date(gridStart);
      while (day <= gridEnd) {
        var slots = getAvailableSlots(day);
        var isToday = isSameDate(day, startOfDay(new Date()));
        var isSelected = isSameDate(day, state.selectedDate);
        var outsideMonth = day.getMonth() !== monthStart.getMonth();
        var disabled = !slots.length;
        var classes = ['agentka-day-button'];

        if (outsideMonth) classes.push('is-outside');
        if (disabled) classes.push('is-disabled');
        if (isToday) classes.push('is-today');
        if (isSelected) classes.push('is-active');
        if (slots.length) classes.push('is-available');

        html += '<button type="button" class="' + classes.join(' ') + '" data-date="' + toDateKey(day) + '"' + (disabled ? ' disabled' : '') + ' aria-pressed="' + (isSelected ? 'true' : 'false') + '">';
        html += '<div class="agentka-day-top"><strong>' + day.getDate() + '</strong>';
        if (slots.length) {
          html += '<span class="agentka-day-badge">' + slots.length + '</span>';
        }
        html += '</div>';
        html += '<span class="agentka-day-label">' + WEEKDAY_LABELS[day.getDay()] + '</span>';
        html += '<span class="agentka-day-meta">' + (slots.length ? slots.length + ' wolne' : 'Brak terminów') + '</span>';
        html += '</button>';

        day = addDays(day, 1);
      }

      html += '</div>';
      html += '</div>';

      calendarEl.innerHTML = html;

      var prevBtn = calendarEl.querySelector('[data-cal-prev]');
      var nextBtn = calendarEl.querySelector('[data-cal-next]');

      if (prevBtn) {
        prevBtn.addEventListener('click', function () {
          if (canPrev) {
            selectMonth(prevMonth);
          }
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', function () {
          if (canNext) {
            selectMonth(nextMonth);
          }
        });
      }

      Array.prototype.slice.call(calendarEl.querySelectorAll('[data-date]')).forEach(function (button) {
        button.addEventListener('click', function () {
          var clickedDate = fromDateKey(button.getAttribute('data-date'));
          if (button.disabled) return;
          selectDate(clickedDate);
        });
      });
    }

    function renderSlots(date) {
      var slots = getAvailableSlots(date);
      var selectedLabel = formatDate(date);

      if (dateTextEl) {
        dateTextEl.textContent = selectedLabel;
      }

      if (dateMetaEl) {
        if (slots.length) {
          dateMetaEl.textContent = 'Dostępnych godzin: ' + slots.length + '. Wybierz jedną poniżej.';
        } else {
          dateMetaEl.textContent = 'W tym dniu nie ma wolnych godzin. Wybierz inny termin.';
        }
      }

      if (slotCountEl) {
        slotCountEl.textContent = String(slots.length);
      }

      if (!slotListEl) return;

      slotListEl.innerHTML = '';

      if (!slots.length) {
        var empty = document.createElement('p');
        empty.className = 'agentka-slot-empty';
        empty.textContent = 'Wybierz inny dzień, aby zobaczyć wolne godziny.';
        slotListEl.appendChild(empty);
        return;
      }

      slots.forEach(function (time) {
        var slotKey = toDateKey(date) + 'T' + time;
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'agentka-slot-button' + (state.selectedSlot === slotKey ? ' is-active' : '');
        button.innerHTML = '<strong>' + escapeHtml(time) + '</strong><span>wolny</span>';
        button.addEventListener('click', function () {
          state.selectedSlot = slotKey;
          if (slotInput) {
            slotInput.value = slotKey;
          }
          if (slotTextEl) {
            slotTextEl.textContent = selectedLabel + ', ' + time;
          }
          if (bookingPanel) {
            bookingPanel.classList.remove('is-hidden');
          }
          updateStatus('', null);
          renderSlots(date);
        });
        slotListEl.appendChild(button);
      });
    }

    function resetSelection() {
      state.selectedDate = getFirstAvailableDate(new Date());
      state.month = startOfMonth(state.selectedDate);
      clearSelectedSlot();
      updateStatus('', null);
      render();
      renderSlots(state.selectedDate);
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        resetSelection();
      });
    }

    if (bookingForm) {
      bookingForm.addEventListener('submit', function (event) {
        event.preventDefault();

        if (!state.selectedSlot || !slotInput || !slotInput.value) {
          updateStatus('Najpierw wybierz godzinę z listy po prawej.', 'is-error');
          return;
        }

        var data = new FormData(bookingForm);
        var name = String(data.get('name') || '').trim();
        var slotLabel = slotTextEl ? slotTextEl.textContent : state.selectedSlot;
        var intro = name ? 'Dziękuję, ' + name.split(' ')[0] + '!' : 'Dziękuję!';
        updateStatus(intro + ' Termin ' + slotLabel + ' został zapisany. Skontaktuję się z Tobą w ciągu 24 godzin.', 'is-success');
      });
    }

    document.addEventListener('agentka:consentUpdated', function () {
      if (bookingStatus && bookingStatus.textContent && bookingStatus.classList.contains('is-success')) {
        updateStatus(bookingStatus.textContent, 'is-success');
      }
    });

    state.selectedDate = getFirstAvailableDate(new Date());
    state.month = startOfMonth(state.selectedDate);
    render();
    renderSlots(state.selectedDate);
  }
})();
