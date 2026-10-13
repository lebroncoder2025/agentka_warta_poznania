(function () {
  'use strict';

  var STORAGE_KEY = 'agentka_cookie_consent';
  var DEFAULT_CONSENT = {
    essential: true,
    functional: false,
    analytics: false,
    marketing: false
  };


  document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
    initCookieBanner();
    initCookieModal();
    initCookieSettingsLinks();
    initConditionalMap();
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

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) closeMenu();
    });

    window.agentkaCloseMobileNav = closeMenu;
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
    var returnFocus = null;

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
      returnFocus = document.activeElement;
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
      if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
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
      if (event.key === 'Tab' && !modal.hidden) {
        var controls = modal.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href]');
        var first = controls[0];
        var last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
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
    var mapIframe = null;

    if (!container || !placeholder) return;

    var mapSrc = 'https://www.google.com/maps?q=Wichrowa%201A%2C%2060-449%20Pozna%C5%84&output=embed';

    function canLoadMap() {
      var consent = readCookieConsent();
      return Boolean(consent && consent.marketing);
    }

    function loadMap() {
      if (!canLoadMap()) return;
      if (!mapIframe) {
        mapIframe = document.createElement('iframe');
        mapIframe.src = mapSrc;
        mapIframe.loading = 'lazy';
        mapIframe.title = 'Mapa lokalizacji biura';
        mapIframe.setAttribute('aria-label', 'Mapa lokalizacji biura');
        mapIframe.referrerPolicy = 'no-referrer-when-downgrade';
        container.appendChild(mapIframe);
      }

      placeholder.hidden = true;
    }

    function unloadMap() {
      if (mapIframe && mapIframe.parentNode) {
        mapIframe.parentNode.removeChild(mapIframe);
      }
      mapIframe = null;
      placeholder.hidden = false;
    }

    function syncMapState() {
      if (canLoadMap()) {
        loadMap();
      } else {
        unloadMap();
      }
    }

    function unlockMap() {
      writeCookieConsent({
        essential: true,
        functional: false,
        analytics: false,
        marketing: true
      }, 'partial');
      syncMapState();
      if (typeof window.agentkaHideCookieBanner === 'function') {
        window.agentkaHideCookieBanner();
      }
    }

    syncMapState();
    document.addEventListener('agentka:consentUpdated', syncMapState);

    if (acceptBtn) {
      acceptBtn.addEventListener('click', unlockMap);
    }
  }

})();
